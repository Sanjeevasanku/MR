function createQueryForUser(email) {
  return "SELECT * FROM users WHERE email = '" + email + "'";
}

module.exports = { createQueryForUser };
