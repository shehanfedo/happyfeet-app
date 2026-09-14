require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

require('./db'); // initializes DB + seeds default admin/services on first run
const { startReminderScheduler } = require('./services/reminder-scheduler');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-.env',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 }, // 8 hour login session
  })
);

app.use('/', authRoutes);
app.use('/', appointmentRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Happy Feet appointment system running on http://localhost:${PORT}`);
  if (process.env.SMS_DRY_RUN !== 'false') {
    console.log('NOTE: SMS_DRY_RUN is on — reminders will be logged, not actually sent. Set SMS_DRY_RUN=false in .env once your Hutch credentials are confirmed.');
  }
  startReminderScheduler();
});
