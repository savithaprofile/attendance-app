//server/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user =  req.user = { 
      _id: decoded.userId,
      role: decoded.role,
      name: decoded.name
    };// make sure this line exists
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
