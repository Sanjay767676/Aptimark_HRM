const nodemailer = require('nodemailer');

const user = 'aptimarksolutions@gmail.com';
const pass = 'ckkgwueresjlunny';
const from = 'hr@aptimarksolutions.in';
const to = 'ksanjuma1234@gmail.com';

async function testPort(port, secure) {
  console.log(`Testing port ${port} (secure: ${secure})...`);
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: port,
    secure: secure,
    auth: { user, pass },
    connectionTimeout: 10000, // 10 seconds timeout
  });

  try {
    const info = await transporter.sendMail({
      from: `"${from}" <${user}>`,
      to: to,
      subject: `SMTP Test on Port ${port}`,
      text: `Hello, this is a test email sent from port ${port} using nodemailer.`,
    });
    console.log(`✅ Port ${port} SUCCESS: ${info.messageId}`);
    return true;
  } catch (err) {
    console.log(`❌ Port ${port} FAILED: ${err.message}`);
    return false;
  }
}

async function run() {
  await testPort(465, true);
  await testPort(587, false);
}

run();
