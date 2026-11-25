const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('Configure JWT_SECRET with a random value of at least 32 characters.');
}

module.exports = { JWT_SECRET };
