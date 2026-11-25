const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const { JWT_SECRET } = require('../lib/authConfig');
const { UNAVAILABLE } = require('../lib/database');

async function auth(req, res, next) {
  let payload;
  try {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  } catch {
    return res.status(503).json({ message: UNAVAILABLE });
  }
}

module.exports = auth;
