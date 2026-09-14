# Happy Feet — Online Appointment System

A simple appointment booking system for a salon/spa, built for **Happy Feet**.

## What's included
- **Calendar view** (day/week/month) — click to book, drag to reschedule, click to cancel
- **Admin role**: full access — manage receptionist accounts, manage services/treatments, view dashboard
- **Receptionist role**: can only create/view/reschedule/cancel appointments
- **Automatic SMS reminders** 1 hour before each appointment, via Hutch's SMS gateway
- Works from any device with a browser and internet connection

## Running it locally (to try it out first)
1. Install Node.js (version 18 or higher) if not already installed — https://nodejs.org
2. Open a terminal in this folder and run:
   ```
   npm install
   cp .env.example .env
   npm start
   ```
3. Open http://localhost:3000 in your browser.
4. Log in with the default admin account:
   - Username: `admin`
   - Password: `ChangeMe123!`
   - **Change this password as your very first step** — ask me and I'll add a proper "change password" screen, or I can reset it directly for you.

## Setting up real SMS sending
1. Contact your Hutch business/API agent and request **API access** (this is different from a normal Hutch phone account) — ask for:
   - API username & password
   - Your approved sender mask/name (what shows as the "From" on the SMS)
2. Open `.env` and fill in:
   ```
   HUTCH_SMS_USERNAME=...
   HUTCH_SMS_PASSWORD=...
   HUTCH_SMS_MASK=...
   ```
3. Set `SMS_DRY_RUN=false` once you've confirmed the credentials work.
4. Important: I built the Hutch integration based on their published API pattern (OAuth2 login to get a token, then send SMS with that token). Hutch may hand you a slightly different exact endpoint path or field names in your agent's documentation. If the first real send fails, send me the exact API document Hutch gives you and I'll adjust `services/sms.js` to match precisely.

## Deploying to your server (so staff can use it from anywhere)
In short:
1. Copy this whole folder to your VPS
2. Install Node.js on the server
3. Run `npm install --production`
4. Set up `.env` with real values (a strong `SESSION_SECRET`, real Hutch credentials, `SMS_DRY_RUN=false`)
5. Use a process manager (`pm2`) to keep it running in the background and auto-restart it if the server reboots
6. Set up Nginx as a reverse proxy and a free Let's Encrypt SSL certificate so it's reachable securely at `https://yourdomain.com`

I'll do all of this deployment work directly if you give me access to the VPS, or walk you through each command if you'd rather do it yourself.

## Adding/editing services
Log in as Admin → "Services" → add a new one, or click "Hide" to remove a treatment from the booking list without deleting its appointment history.

## Adding receptionist accounts
Log in as Admin → "Receptionists" → add name, username, password.

## Data & backups
Appointment and account data lives in one file: `data/happyfeet.db` (SQLite). Back up this single file regularly — that's your entire system's data.
