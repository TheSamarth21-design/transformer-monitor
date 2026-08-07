import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { get, run } from "./db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "transformer_super_secret_jwt_key_2026";

// Register New Member via Email & Password
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required." });
    }

    // Check if user already exists
    const existingUser = await get(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email address already exists." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = `usr-${Date.now()}`;
    const userRole = role || "Substation Engineer";
    const createdAt = new Date().toISOString();

    // Insert user into SQLite database
    await run(
      `INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, email.toLowerCase().trim(), passwordHash, name, userRole, createdAt]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email: email.toLowerCase().trim(), name, role: userRole },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userObj = { id: userId, email: email.toLowerCase().trim(), name, role: userRole, createdAt };
    console.log(`[Auth] Registered new member: ${email} (${name})`);

    return res.status(201).json({
      message: "Registration successful!",
      token,
      user: userObj,
    });
  } catch (err) {
    console.error("[Auth] Registration Error:", err);
    return res.status(500).json({ error: "Internal server error during registration." });
  }
});

// Login Member via Email & Password
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await get(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: "Invalid email address or password." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email address or password." });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userObj = { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.created_at };
    console.log(`[Auth] Logged in user: ${user.email}`);

    return res.json({
      message: "Login successful!",
      token,
      user: userObj,
    });
  } catch (err) {
    console.error("[Auth] Login Error:", err);
    return res.status(500).json({ error: "Internal server error during login." });
  }
});

// Verify Current Token Session
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await get(`SELECT id, email, name, role, created_at FROM users WHERE id = ?`, [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: "User session not found." });
    }

    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session token." });
  }
});

export default router;
