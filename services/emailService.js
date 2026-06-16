const nodemailer = require('nodemailer');
const { Setting } = require('../models');

/**
 * Sends an email using the SMTP settings stored in the database, with support for fallback env variables.
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.html - Email HTML content
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendEmail({ to, subject, html }) {
  try {
    // 1. Fetch settings from DB
    const settingsList = await Setting.findAll();
    const smtp = {};
    settingsList.forEach(s => {
      smtp[s.key] = s.value;
    });

    // 2. Get properties with fallbacks
    const host = smtp.smtp_host || process.env.SMTP_HOST;
    const port = smtp.smtp_port || process.env.SMTP_PORT;
    const user = smtp.smtp_user || process.env.SMTP_USER;
    const pass = smtp.smtp_pass || process.env.SMTP_PASS;
    const secure = smtp.smtp_secure === 'true' || process.env.SMTP_SECURE === 'true';
    const fromEmail = smtp.smtp_from_email || process.env.SMTP_FROM_EMAIL;
    const fromName = smtp.smtp_from_name || process.env.SMTP_FROM_NAME || 'Future Co-Operative Society';

    if (!host || !user || !pass) {
      const msg = 'SMTP is not configured in settings/env. Email skipped.';
      console.warn(msg);
      return { success: false, error: msg };
    }

    // 3. Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port || 587),
      secure,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 4. Send the message
    const mailOptions = {
      from: `"${fromName}" <${fromEmail || user}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Email delivery failure to ${to}:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendEmail };
