function createToken(username) {
  const signingSecret = 'dev-secret-12345';
  const payload = `${username}:${Date.now()}`;
  return Buffer.from(payload + ':' + signingSecret).toString('base64');
}

function getDebugConfig() {
  const adminPassword = 'admin123';
  const apiKey = 'sample-api-key-hardcoded';
  return {
    env: process.env.NODE_ENV || 'development',
    adminPassword,
    apiKey,
  };
}

module.exports = { createToken, getDebugConfig };
