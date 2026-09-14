const express = require('express');
const db = require('../db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// Calendar page (main screen for both admin and receptionist)
router.get('/', requireLogin, (req, res) => {
  const services = db
    .prepare('SELECT * FROM services WHERE active = 1 ORDER BY name')
    .all();
  res.render('calendar', { user: req.session.user, services });
});

// JSON feed of appointments for the calendar widget
router.get('/api/appointments', requireLogin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, s.name AS service_name, s.duration_minutes
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       WHERE a.status != 'cancelled'
       ORDER BY a.start_time`
    )
    .all();

  const events = rows.map((a) => ({
    id: a.id,
    title: `${a.customer_name} — ${a.service_name}`,
    start: a.start_time,
    end: a.end_time,
    extendedProps: {
      phone: a.customer_phone,
      service: a.service_name,
      status: a.status,
      notes: a.notes,
    },
  }));
  res.json(events);
});

// Create a new appointment
router.post('/api/appointments', requireLogin, (req, res) => {
  const { customer_name, customer_phone, service_id, start_time, notes } = req.body;

  if (!customer_name || !customer_phone || !service_id || !start_time) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(service_id);
  if (!service) return res.status(400).json({ error: 'Invalid service.' });

  const start = new Date(start_time);
  const end = new Date(start.getTime() + service.duration_minutes * 60 * 1000);

  // Prevent double-booking the exact same slot
  const clash = db
    .prepare(
      `SELECT COUNT(*) AS c FROM appointments
       WHERE status != 'cancelled'
         AND start_time < ? AND end_time > ?`
    )
    .get(end.toISOString(), start.toISOString());

  if (clash.c > 0) {
    return res.status(409).json({ error: 'That time slot overlaps an existing appointment.' });
  }

  const result = db
    .prepare(
      `INSERT INTO appointments
        (customer_name, customer_phone, service_id, start_time, end_time, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      customer_name.trim(),
      customer_phone.trim(),
      service_id,
      start.toISOString(),
      end.toISOString(),
      notes || null,
      req.session.user.id
    );

  res.json({ id: result.lastInsertRowid });
});

// Cancel an appointment
router.post('/api/appointments/:id/cancel', requireLogin, (req, res) => {
  db.prepare(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`).run(
    req.params.id
  );
  res.json({ ok: true });
});

// Reschedule an appointment (drag on calendar, or edit form)
router.post('/api/appointments/:id/reschedule', requireLogin, (req, res) => {
  const { start_time } = req.body;
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Not found.' });

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(appt.service_id);
  const start = new Date(start_time);
  const end = new Date(start.getTime() + service.duration_minutes * 60 * 1000);

  db.prepare(
    `UPDATE appointments SET start_time = ?, end_time = ?, reminder_sent = 0 WHERE id = ?`
  ).run(start.toISOString(), end.toISOString(), req.params.id);

  res.json({ ok: true });
});

module.exports = router;
