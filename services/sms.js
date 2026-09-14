// Hutch Bulk SMS integration (Sri Lanka)
// Hutch uses OAuth2: you log in with your API username/password to get an
// access token, then use that token to send SMS. Tokens expire, so we cache
// the token and refresh it automatically when needed.
//
// You must get these from your Hutch business/API agent (this is a separate
// account from a normal Hutch phone account):
//   HUTCH_SMS_BASE_URL   e.g. https://bsms.hutch.lk/api
//   HUTCH_SMS_USERNAME   API username given by Hutch
//   HUTCH_SMS_PASSWORD   API password given by Hutch
//   HUTCH_SMS_MASK       Approved sender name shown to customers, e.g. "HappyFeet"

const fetch = require('node-fetch');

let cachedToken = null;
let tokenExpiresAt = 0;

async function login() {
  const res = await fetch(`${process.env.HUTCH_SMS_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-VERSION': 'v1' },
    body: JSON.stringify({
      username: process.env.HUTCH_SMS_USERNAME,
      password: process.env.HUTCH_SMS_PASSWORD,
    }),
  });
  if (!res.ok) {
    throw new Error(`Hutch SMS login failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = data.accessToken || data.access_token;
  // Refresh 60 seconds before Hutch's own expiry to be safe
  const expiresInSeconds = data.expiresIn || data.expires_in || 3300;
  tokenExpiresAt = Date.now() + (expiresInSeconds - 60) * 1000;
  return cachedToken;
}

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  return login();
}

/**
 * Send an SMS via Hutch.
 * @param {string} toPhone - customer phone number, e.g. "94771234567"
 * @param {string} message - message text
 */
async function sendSms(toPhone, message) {
  if (process.env.SMS_DRY_RUN === 'true') {
    console.log(`[SMS DRY RUN] to ${toPhone}: ${message}`);
    return { dryRun: true };
  }

  const token = await getToken();
  const res = await fetch(`${process.env.HUTCH_SMS_BASE_URL}/sendsms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      campaignName: 'Appointment Reminder',
      mask: process.env.HUTCH_SMS_MASK,
      numbers: toPhone,
      content: message,
    }),
  });

  if (res.status === 401) {
    // token expired mid-flight, refresh once and retry
    cachedToken = null;
    const freshToken = await getToken();
    const retryRes = await fetch(`${process.env.HUTCH_SMS_BASE_URL}/sendsms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freshToken}`,
      },
      body: JSON.stringify({
        campaignName: 'Appointment Reminder',
        mask: process.env.HUTCH_SMS_MASK,
        numbers: toPhone,
        content: message,
      }),
    });
    if (!retryRes.ok) {
      throw new Error(`Hutch SMS send failed: ${retryRes.status} ${await retryRes.text()}`);
    }
    return retryRes.json();
  }

  if (!res.ok) {
    throw new Error(`Hutch SMS send failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

module.exports = { sendSms };
