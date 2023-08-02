const jwt = require('jsonwebtoken');
require('dotenv').config();

const { JWT } = process.env;

module.exports = (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const token = authorization.split(' ')[1];

  try {
    const decodedToken = jwt.verify(token, JWT);
    if (!decodedToken) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    req.userId = decodedToken.userId;
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Token verification failed' });
  }
};
