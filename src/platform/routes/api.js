const express = require('express');
const { Project, MergeRequest, Scan, Finding, FixRun } = require('../models');
const { executeFixBatch } = require('../../fix/fixService');

function createPlatformRouter(config) {
  const router = express.Router();

  router.get('/projects', async (_req, res) => {
    try {
      const projects = await Project.find().sort({ updatedAt: -1 }).lean();
      const enriched = await Promise.all(
        projects.map(async (p) => {
          const openCount = await Finding.countDocuments({
            projectId: p._id,
            status: 'open',
          });
          return { ...p, openIssueCount: openCount };
        })
      );
      res.json(enriched);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list projects';
      res.status(500).json({ error: message });
    }
  });

  router.delete('/projects/:gitlabProjectId', async (req, res) => {
    try {
      const gitlabProjectId = parseInt(req.params.gitlabProjectId, 10);
      const project = await Project.findOne({ gitlabProjectId });
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      await Promise.all([
        Finding.deleteMany({ projectId: project._id }),
        Scan.deleteMany({ projectId: project._id }),
        MergeRequest.deleteMany({ projectId: project._id }),
        FixRun.deleteMany({ projectId: project._id }),
      ]);
      await Project.deleteOne({ _id: project._id });

      res.json({ deleted: true, gitlabProjectId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete project';
      res.status(500).json({ error: message });
    }
  });

  router.get('/projects/:gitlabProjectId/issues', async (req, res) => {
    try {
      const gitlabProjectId = parseInt(req.params.gitlabProjectId, 10);
      const project = await Project.findOne({ gitlabProjectId });
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Backward compatibility: old runs used fix_pending; treat them as fixed.
      await Finding.updateMany(
        { projectId: project._id, status: 'fix_pending' },
        { status: 'fixed' }
      );

      const status = String(req.query.status ?? 'open');
      const query = { projectId: project._id };
      if (status === 'open' || status === 'fixed') {
        query.status = status;
      } else if (status === 'ALL') {
        query.status = { $in: ['open', 'fixed'] };
      } else {
        query.status = 'open';
      }

      const findings = await Finding.find(query)
        .sort({ createdAt: -1 })
        .lean();
      res.json(findings);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list issues';
      res.status(500).json({ error: message });
    }
  });

  router.get('/issues/:id', async (req, res) => {
    try {
      const finding = await Finding.findById(req.params.id).lean();
      if (!finding) {
        res.status(404).json({ error: 'Issue not found' });
        return;
      }
      res.json(finding);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get issue';
      res.status(500).json({ error: message });
    }
  });

  router.post('/fix-runs', async (req, res) => {
    try {
      const findingIds = Array.isArray(req.body.findingIds)
        ? req.body.findingIds.filter(Boolean)
        : req.body.findingId
          ? [req.body.findingId]
          : [];

      if (findingIds.length === 0) {
        res.status(400).json({ error: 'findingId or findingIds is required' });
        return;
      }

      const findings = await Finding.find({ _id: { $in: findingIds } });
      if (findings.length !== findingIds.length) {
        res.status(404).json({ error: 'One or more issues were not found' });
        return;
      }

      const nonOpen = findings.find((finding) => finding.status !== 'open');
      if (nonOpen) {
        res.status(400).json({ error: `Issue status is ${nonOpen.status}, cannot fix` });
        return;
      }

      const first = findings[0];
      const mixedScope = findings.some(
        (f) =>
          f.gitlabProjectId !== first.gitlabProjectId ||
          f.mergeRequestIid !== first.mergeRequestIid ||
          (f.sourceBranch || '') !== (first.sourceBranch || '')
      );
      if (mixedScope) {
        res.status(400).json({
          error: 'Please select issues from the same project, merge request, and source branch',
        });
        return;
      }

      const fixRun = await FixRun.create({
        projectId: first.projectId,
        gitlabProjectId: first.gitlabProjectId,
        sourceMrIid: first.mergeRequestIid,
        findingIds: findings.map((finding) => finding._id),
        status: 'running',
      });

      try {
        const result = await executeFixBatch(
          config,
          findings.map((finding) => finding.toObject())
        );

        fixRun.status = 'completed';
        fixRun.fixBranch = result.fixBranch;
        fixRun.newMrIid = result.newMrIid;
        fixRun.newMrUrl = result.newMrUrl;
        fixRun.results = result.results ?? [];
        await fixRun.save();

        const appliedSet = new Set(
          (result.results ?? [])
            .filter((entry) => entry.applied)
            .map((entry) => String(entry.findingId))
        );
        await Promise.all(
          findings.map(async (finding) => {
            if (appliedSet.has(String(finding._id))) {
              finding.status = 'open';
              finding.verification = {
                state: 'pending',
                branch: result.fixBranch,
                startedAt: new Date(),
                lastCheckedAt: null,
                confirmedAt: null,
              };
              await finding.save();
            }
          })
        );

        res.status(201).json(fixRun);
      } catch (fixError) {
        const message =
          fixError instanceof Error ? fixError.message : 'Fix failed';

        fixRun.status = 'failed';
        fixRun.errorMessage = message;
        await fixRun.save();

        await Promise.all(
          findings.map(async (finding) => {
            finding.status = 'open';
            await finding.save();
          })
        );

        res.status(502).json({ error: message, fixRunId: fixRun._id });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start fix run';
      res.status(500).json({ error: message });
    }
  });

  router.get('/fix-runs/:id', async (req, res) => {
    try {
      const fixRun = await FixRun.findById(req.params.id).lean();
      if (!fixRun) {
        res.status(404).json({ error: 'Fix run not found' });
        return;
      }
      res.json(fixRun);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get fix run';
      res.status(500).json({ error: message });
    }
  });

  return router;
}

module.exports = { createPlatformRouter };
