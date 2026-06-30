function encodeFilePath(filePath) {
  return encodeURIComponent(filePath);
}

const BLOCKED_PATHS = ['.env', '.gitlab-ci.yml', 'package-lock.json'];

function isBlockedPath(filePath) {
  const lower = filePath.toLowerCase();
  return BLOCKED_PATHS.some(
    (blocked) => lower === blocked || lower.endsWith(`/${blocked}`)
  );
}

module.exports = { encodeFilePath, isBlockedPath };
