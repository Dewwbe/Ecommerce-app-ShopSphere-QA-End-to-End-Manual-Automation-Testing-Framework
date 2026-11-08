const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(req, res, next) {
  const { firstName, lastName, email, password } = req.body || {};
  const errors = [];

  if (!firstName || firstName.trim().length < 2) errors.push("firstName must be at least 2 characters");
  if (!lastName || lastName.trim().length < 2) errors.push("lastName must be at least 2 characters");
  if (!email || !EMAIL_REGEX.test(email)) errors.push("email must be a valid email address");
  if (!password || password.length < 8) errors.push("password must be at least 8 characters");

  if (errors.length) return res.status(400).json({ errors });
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  const errors = [];
  if (!email || !EMAIL_REGEX.test(email)) errors.push("email must be a valid email address");
  if (!password) errors.push("password is required");
  if (errors.length) return res.status(400).json({ errors });
  next();
}

module.exports = { validateRegister, validateLogin };
