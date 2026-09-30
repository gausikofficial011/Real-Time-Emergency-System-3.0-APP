const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

/**
 * Send an email notification.
 * If SMTP variables are defined in .env, they will be used.
 * Otherwise, it creates an Ethereal test account on the fly and logs a preview URL.
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    let transporter;
    let isTest = false;

    // Check if real SMTP config exists in env
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      isTest = true;
      // Fallback: Create Ethereal test account
      console.log('✉️ No SMTP settings found in env. Creating Ethereal test account...');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"EmergencyAI Operations Hub" <no-reply@emergencyai.com>',
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    
    let previewUrl = '';
    if (isTest) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`✉️ Test Mail Preview URL: ${previewUrl}`);

      // Log the preview URL to a local log file for verification
      const logDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(
        path.join(logDir, 'email-preview-urls.log'),
        `[${new Date().toISOString()}] To: ${to} | Subject: ${subject} | Preview: ${previewUrl}\n`
      );
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error('✉️ Error sending email:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { sendEmail };
