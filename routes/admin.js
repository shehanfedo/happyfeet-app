const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// --- Dashboard ---
router.get('/', requireAdmin, (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM appointments
       WHERE status = 'confirmed' AND start_time BETWEEN ? AND ?`
    )
    .get(todayStart.toISOString(), todayEnd.toISOString()).c;

  const upcoming = db
    .prepare(
      `SELECT a.*, s.name AS service_name FROM appointments a
       JOIN services s ON s.id = a.service_id
       WHERE a.status = 'confirmed' AND a.start_time >= ?
       ORDER BY a.start_time LIMIT 10`
    )
    .all(new Date().toISOString());

  res.render('admin-dashboard', { user: req.session.user, todayCount, upcoming });
});

// --- Services management ---
router.get('/services', requireAdmin, (req, res) => {
  const services = db.prepare('SELECT * FROM services ORDER BY name').all();
  res.render('admin-services', { user: req.session.user, services });
});

router.post('/services', requireAdmin, (req, res) => {
  const { name, duration_minutes, price } = req.body;
  db.prepare(
    'INSERT INTO services (name, duration_minutes, price) VALUES (?, ?, ?)'
  ).run(name.trim(), Number(duration_minutes) || 30, Number(price) || 0);
  res.redirect('/admin/services');
});

router.post('/services/:id/toggle', requireAdmin, (req, res) => {
  db.prepare('UPDATE services SET active = 1 - active WHERE id = ?').run(req.params.id);
  res.redirect('/admin/services');
});

// --- Receptionist account management ---
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare("SELECT * FROM users WHERE role = 'receptionist' ORDER BY name").all();
  res.render('admin-users', { user: req.session.user, users, error: null });
});

router.post('/users', requireAdmin, (req, res) => {
  const { name, username, password } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    const users = db.prepare("SELECT * FROM users WHERE role = 'receptionist' ORDER BY name").all();
    return res.render('admin-users', {
      user: req.session.user,
      users,
      error: 'That username is already taken.',
    });
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'receptionist')"
  ).run(name.trim(), username.trim(), hash);
  res.redirect('/admin/users');
});

router.post('/users/:id/toggle', requireAdmin, (req, res) => {
  db.prepare('UPDATE users SET active = 1 - active WHERE id = ?').run(req.params.id);
  res.redirect('/admin/users');
});

module.exports = router;
