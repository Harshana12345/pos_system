const net = require('net');
const tls = require('tls');

const { env } = require('../config/env');

function escapeHeader(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function encodeBase64(value) {
  return Buffer.from(String(value), 'utf8').toString('base64');
}

function getEnvelopeAddress(address) {
  const match = String(address).match(/<([^<>]+)>/);

  return (match ? match[1] : address).trim();
}

function buildPasswordResetMessage({ to, resetLink, expiresInMinutes }) {
  const subject = 'Reset your POS System password';
  const text = [
    'We received a request to reset your POS System password.',
    '',
    `Use this link within ${expiresInMinutes} minutes:`,
    resetLink,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  return [
    `From: ${escapeHeader(env.email.from)}`,
    `To: ${escapeHeader(to)}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
  ].join('\r\n');
}

function readSmtpResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';

    function cleanup() {
      socket.off('data', onData);
      socket.off('error', onError);
    }

    function onError(error) {
      cleanup();
      reject(error);
    }

    function onData(chunk) {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1];

      if (/^\d{3} /.test(lastLine)) {
        cleanup();
        resolve(buffer);
      }
    }

    socket.on('data', onData);
    socket.on('error', onError);
  });
}

async function sendSmtpCommand(socket, command, expectedCodes) {
  if (command) {
    socket.write(`${command}\r\n`);
  }

  const response = await readSmtpResponse(socket);
  const code = Number(response.slice(0, 3));

  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP command failed with response: ${response.trim()}`);
  }

  return response;
}

function connectSmtp() {
  const options = {
    host: env.email.host,
    port: env.email.port,
  };

  return new Promise((resolve, reject) => {
    const socket = env.email.secure ? tls.connect(options) : net.connect(options);

    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
  });
}

async function authenticateSmtp(socket) {
  if (!env.email.user || !env.email.password) {
    return;
  }

  await sendSmtpCommand(socket, 'AUTH LOGIN', [334]);
  await sendSmtpCommand(socket, encodeBase64(env.email.user), [334]);
  await sendSmtpCommand(socket, encodeBase64(env.email.password), [235]);
}

async function sendEmail({ to, message }) {
  if (!env.email.host) {
    if (env.nodeEnv !== 'test') {
      console.info(`Email delivery skipped; SMTP_HOST is not configured. Recipient: ${to}`);
    }

    return;
  }

  const socket = await connectSmtp();

  try {
    await sendSmtpCommand(socket, null, [220]);
    await sendSmtpCommand(socket, 'EHLO localhost', [250]);
    await authenticateSmtp(socket);
    await sendSmtpCommand(socket, `MAIL FROM:<${getEnvelopeAddress(env.email.from)}>`, [250]);
    await sendSmtpCommand(socket, `RCPT TO:<${to}>`, [250, 251]);
    await sendSmtpCommand(socket, 'DATA', [354]);
    await sendSmtpCommand(socket, `${message}\r\n.`, [250]);
    await sendSmtpCommand(socket, 'QUIT', [221]);
  } finally {
    socket.end();
  }
}

async function sendPasswordResetEmail({ to, token, expiresInMinutes }) {
  const resetLink = `${env.passwordReset.resetUrl}?token=${encodeURIComponent(token)}`;
  const message = buildPasswordResetMessage({
    to,
    resetLink,
    expiresInMinutes,
  });

  await sendEmail({ to, message });
}

module.exports = {
  buildPasswordResetMessage,
  sendPasswordResetEmail,
};
