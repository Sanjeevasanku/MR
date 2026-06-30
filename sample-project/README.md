# Sample Project for AI Review POC

This project is intentionally buggy so you can verify all flows in your AI review platform:

- GitLab MR detection + comment posting
- Dashboard issue listing
- Single-issue fix
- Multi-select "fix in one MR"
- Status transitions (`open` -> `fixed`)

## Intentional issues in this project

- `src/utils/math.js`
  - Division by zero risk
- `src/services/authService.js`
  - Hardcoded secrets
- `src/services/userRepo.js`
  - SQL injection risk (string concatenation)

## Run locally (optional)

```bash
npm install
npm start
```

## Suggested GitLab test flow

1. Create a new GitLab repo and push this folder.
2. Configure webhook to:
   - `https://<your-ngrok-or-host>/api/webhook/gitlab`
3. Open MR-1 with one bug change:
   - Example: modify only `src/utils/math.js`
   - Validate: detection + dashboard open issue
4. Open MR-2 with multiple bug changes:
   - Modify `authService.js` and `userRepo.js`
   - Validate: select multiple issues in dashboard
   - Click **Fix selected (N)**
   - Verify one fix MR is created for selected issues
5. Confirm status behavior:
   - After successful dashboard fix run, selected issues become `fixed`
   - Unselected issues remain `open`

## Notes

- This code is for testing only. Do not deploy as production code.
- Keep issues intentional so repeated MRs always produce review findings.
