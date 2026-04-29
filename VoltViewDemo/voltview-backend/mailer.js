const nodemailer = require('nodemailer');

async function sendAlertEmail({ type, message, timestamp, enabled, recipient }) {
    if (!enabled) return;

    if (!recipient || !recipient.trim()) {
        console.warn('⚠️  Alert email skipped — no recipient email configured in Settings.');
        return;
    }
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️  Alert email skipped — SMTP_USER / SMTP_PASS not set in .env');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS   
        }
    });

    const TYPE_CONFIG = {
        critical: { label: 'CRITICAL', color: '#ff1744', bg: '#2d0000', icon: '🚨' },
        warning:  { label: 'WARNING',  color: '#ffe600', bg: '#2b2000', icon: '⚠️'  },
        info:     { label: 'INFO',     color: '#00fff7', bg: '#002b2d', icon: 'ℹ️'  }
    };
    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
    const timeStr = new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    const mailOptions = {
        from: `"VoltView Alerts" <${process.env.SMTP_USER}>`,
        to: recipient.trim(),
        subject: `${cfg.icon} [VoltView] ${cfg.label} — ${message.slice(0, 70)}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0518;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0518;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0b1123;border:2px solid #05eafd;border-radius:12px 12px 0 0;
                     padding:24px 32px;text-align:center;">
            <span style="font-size:26px;color:#05eafd;letter-spacing:0.15em;font-weight:bold;">
              ⚡ VoltView
            </span>
            <div style="font-size:12px;color:rgba(5,234,253,0.6);letter-spacing:0.1em;margin-top:4px;">
              ENERGY MONITORING SYSTEM
            </div>
          </td>
        </tr>

        <!-- Alert badge -->
        <tr>
          <td style="background:#111827;padding:0 32px;">
            <div style="margin:24px 0;background:${cfg.bg};border:2px solid ${cfg.color};
                        border-radius:8px;padding:24px;">
              <div style="font-size:22px;font-weight:bold;color:${cfg.color};
                          letter-spacing:0.12em;margin-bottom:14px;">
                ${cfg.icon} ${cfg.label} ALERT
              </div>
              <div style="font-size:16px;color:#e0f2ff;line-height:1.5;margin-bottom:16px;">
                ${message}
              </div>
              <div style="font-size:13px;color:rgba(224,242,255,0.5);border-top:1px solid rgba(255,255,255,0.1);
                          padding-top:12px;margin-top:12px;">
                🕐 &nbsp;${timeStr}
              </div>
            </div>
          </td>
        </tr>

        <!-- Action hint -->
        <tr>
          <td style="background:#111827;padding:0 32px 24px;">
            <div style="background:#0d1b2a;border-left:4px solid #05eafd;border-radius:4px;
                        padding:14px 18px;font-size:13px;color:rgba(224,242,255,0.7);">
              Log in to your VoltView dashboard to review and resolve this alert.
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0b1123;border:2px solid #05eafd;border-top:none;
                     border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
            <div style="font-size:11px;color:rgba(224,242,255,0.35);">
              This is an automated alert from VoltView. To stop receiving these emails,
              disable Email Alerts in VoltView Settings.
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Alert email sent → ${recipient} (${cfg.label}) | msgId: ${info.messageId}`);
    } catch (err) {
        console.error(`❌ Failed to send alert email: ${err.message}`);
    }
}

async function sendPasswordResetEmail({ email, resetLink }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️  Password reset email skipped — SMTP_USER / SMTP_PASS not set in .env');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS   
        }
    });

    const mailOptions = {
        from: `"VoltView Accounts" <${process.env.SMTP_USER}>`,
        to: email.trim(),
        subject: `🔑 VoltView Password Reset`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0518;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0518;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#0b1123;border:2px solid #05eafd;border-radius:12px 12px 0 0;
                     padding:24px 32px;text-align:center;">
            <span style="font-size:26px;color:#05eafd;letter-spacing:0.15em;font-weight:bold;">
              ⚡ VoltView
            </span>
          </td>
        </tr>
        <tr>
          <td style="background:#111827;padding:0 32px;">
            <div style="margin:24px 0;background:#0d1b2a;border:2px solid #05eafd;
                        border-radius:8px;padding:24px;">
              <div style="font-size:22px;font-weight:bold;color:#05eafd;
                          letter-spacing:0.12em;margin-bottom:14px;">
                PASSWORD RESET
              </div>
              <div style="font-size:16px;color:#e0f2ff;line-height:1.5;margin-bottom:16px;">
                You requested a password reset for your VoltView account. Click the button below to set a new password.
              </div>
              <div style="margin-top: 24px; text-align: center;">
                <a href="${resetLink}" style="background: #05eafd; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <div style="font-size:13px;color:rgba(224,242,255,0.5);border-top:1px solid rgba(255,255,255,0.1);
                          padding-top:12px;margin-top:24px;">
                If you did not request this, please ignore this email.
              </div>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Password reset email sent → ${email} | msgId: ${info.messageId}`);
    } catch (err) {
        console.error(`❌ Failed to send password reset email: ${err.message}`);
    }
}

module.exports = { sendAlertEmail, sendPasswordResetEmail };
