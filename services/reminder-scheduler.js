const cron = require('node-cron');
const db = require('../db');
const { sendSms } = require('./sms');

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

async function checkAndSendReminders() {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 55 * 60 * 1000); // 55 min from now
  const windowEnd = new Date(now.getTime() + 65 * 60 * 1000); // 65 min from now

  const dueAppointments = db
    .prepare(
      `SELECT a.*, s.name AS service_name
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       WHERE a.status = 'confirmed'
         AND a.reminder_sent = 0
         AND a.start_time BETWEEN ? AND ?`
    )
    .all(windowStart.toISOString(), windowEnd.toISOString());

  for (const appt of dueAppointments) {
    const message = `Hi ${appt.customer_name}, reminder: your ${appt.service_name} appointment at Happy Feet is today at ${formatTime(appt.start_time)}. See you soon!`;
    try {
      await sendSms(appt.customer_phone, message);
      db.prepare('UPDATE appointments SET reminder_sent = 1 WHERE id = ?').run(appt.id);
      console.log(`Reminder sent for appointment #${appt.id} (${appt.customer_name})`);
    } catch (err) {
      console.error(`Failed to send reminder for appointment #${appt.id}:`, err.message);
    }
  }
}

function startReminderScheduler() {
  // Runs every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    checkAndSendReminders().catch((err) =>
      console.error('Reminder scheduler error:', err)
    );
  });
  console.log('SMS reminder scheduler started (checks every 5 minutes).');
}

module.exports = { startReminderScheduler, checkAndSendReminders };
