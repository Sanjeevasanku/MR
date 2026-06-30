const { logger } = require('../utils/logger');

function requestLogger(req, _res, next) {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
  });
  next();
}

module.exports = { requestLogger };
