const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

router.post('/signup', [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'member']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, password, role = 'member' } = req.body;
  try {
    const db = await getDb();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hashedPassword = bcrypt.hashSync(password, 10);
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const result = await db.run('INSERT INTO users (name, email, password, role, avatar_color) VALUES (?, ?, ?, ?, ?)', name, email, hashedPassword, role, avatarColor);
    const token = jwt.sign({ userId: result.lastID }, JWT_SECRET, { expiresIn: '7d' });
    const user = await db.get('SELECT id, name, email, role, avatar_color FROM users WHERE id = ?', result.lastID);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.get('/users', authenticate, async (req, res) => {
  const db = await getDb();
  const users = await db.all('SELECT id, name, email, role, avatar_color FROM users ORDER BY name');
  res.json({ users });
});

module.exports = router;
