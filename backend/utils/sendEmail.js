const nodemailer = require('nodemailer');

// If EMAIL_USER / EMAIL_PASS aren't set in .env, we don't crash — we just log
// the email content to the server console instead. This means the forgot-password
// flow is fully testable/demoable without needing real email credentials.
async function sendEmail({ to, subject, text, html }) {
  const { EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log('\n===== EMAIL NOT CONFIGURED — logging instead of sending =====');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('===============================================================\n');
    return { simulated: true };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });

  return transporter.sendMail({
    from: `"Task Manager" <${EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

module.exports = sendEmail;
