const axios = require('axios');

function createGitLabClient(config) {
  return axios.create({
    baseURL: `${config.gitlab.baseUrl}/api/v4`,
    headers: {
      'PRIVATE-TOKEN': config.gitlab.token,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });
}

module.exports = { createGitLabClient };
