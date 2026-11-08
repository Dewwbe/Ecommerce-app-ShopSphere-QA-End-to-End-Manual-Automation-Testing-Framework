const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken, verifyToken } = require("../utils/jwt");
const { validateRegister, validateLogin } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { publishEvent } = require("../../../../shared/rabbitmq/messageBus");

const router = express.Router();

// POST /api/auth/register
router.post("/register", validateRegister, async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, passwordHash });

    try {
      await publishEvent("user.registered", {
        userId: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (busErr) {
      console.error("[auth-service] Failed to publish user.registered:", busErr.message);
      // Registration itself still succeeds; the event is best-effort.
    }

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[auth-service] register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[auth-service] login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub).select("-passwordHash");
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
});

// GET /api/auth/verify — used internally by the API gateway / other services
router.get("/verify", (req, res) => {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  try {
    const decoded = verifyToken(token);
    return res.json({ valid: true, decoded });
  } catch {
    return res.status(401).json({ valid: false });
  }
});

module.exports = router;
