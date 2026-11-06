const nodemailer = require('nodemailer');
const env = require('../config/env');

// SMTP when configured; otherwise emails are printed to the console (dev) or kept in memory (tests).
let transport;
const outbox = [];

function getTransport() {
  if (transport) return transport;
  transport = env.smtp.host
    ? nodemailer.createTransport({
        host: env.smtp.host, port: env.smtp.port, secure: env.smtp.port === 465,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });
  return transport;
}

async function sendMail({ to, subject, text }) {
  await getTransport().sendMail({ from: env.mailFrom, to, subject, text });
  if (!env.smtp.host) {
    if (env.isTest) outbox.push({ to, subject, text });
    else console.log(`\n[email] To: ${to}\n[email] Subject: ${subject}\n${text}\n`); // eslint-disable-line no-console
  }
}

// Never lets an email failure break the main action.
const sendMailSafe = (mail) => sendMail(mail).catch((e) => { if (!env.isTest) console.error('[email] failed:', e.message); }); // eslint-disable-line no-console

module.exports = { sendMail, sendMailSafe, outbox };
