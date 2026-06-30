const express = require('express');
const { divide, percentage } = require('./utils/math');
const { createToken, getDebugConfig } = require('./services/authService');
const { createQueryForUser } = require('./services/userRepo');

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/login', (req, res) => {
  const token = createToken(req.body?.username || 'guest');
  res.json({ token });
});

app.get('/debug-config', (_req, res) => {
  res.json(getDebugConfig());
});

app.get('/report', (req, res) => {
  const value = Number(req.query.value || 10);
  const total = Number(req.query.total || 0);
  const progress = percentage(value, total);
  res.json({ progress, ratio: divide(value, total) });
});

app.get('/user-search', (req, res) => {
  const email = String(req.query.email || '');
  const sql = createQueryForUser(email);
  res.json({ sql });
});

app.listen(4000, () => {
  console.log('Sample app running on port 4000');
});
