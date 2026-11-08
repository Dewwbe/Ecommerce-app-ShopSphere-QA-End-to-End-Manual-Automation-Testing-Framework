const jwt = require("jsonwebtoken");

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
