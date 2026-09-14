const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'data', 'happyfeet.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','receptionist')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price REAL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,      -- ISO datetime
  end_time TEXT NOT NULL,        -- ISO datetime
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, cancelled, completed
  notes TEXT,
  created_by INTEGER NOT NULL,
  reminder_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
`);

// Seed default admin account if no users exist yet
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const defaultPasswordHash = bcrypt.hashSync('ChangeMe123!', 10);
  db.prepare(
    `INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'admin')`
  ).run('Admin', 'admin', defaultPasswordHash);
  console.log('Created default admin account -> username: admin / password: ChangeMe123!  (CHANGE THIS IMMEDIATELY)');
}

// Seed a starting service list for a salon/spa (editable later in Admin)
const serviceCount = db.prepare('SELECT COUNT(*) AS c FROM services').get().c;
if (serviceCount === 0) {
  const insertService = db.prepare(
    'INSERT INTO services (name, duration_minutes, price) VALUES (?, ?, ?)'
  );
  const starterServices = [
    ['Classic Manicure', 30, 1500],
    ['Classic Pedicure', 45, 2000],
    ['Gel Manicure', 45, 2500],
    ['Gel Pedicure', 60, 3000],
    ['Foot Massage / Reflexology', 45, 2500],
    ['Full Body Massage', 60, 4500],
    ['Facial Treatment', 60, 3500],
    ['Hair Spa Treatment', 60, 3000],
    ['Waxing (Full Legs)', 30, 2000],
    ['Threading / Eyebrow Shaping', 15, 500],
  ];
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insertService.run(...row);
  });
  insertMany(starterServices);
  console.log('Seeded starter service list — edit anytime in Admin > Services.');
}

module.exports = db;
