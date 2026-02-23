const nodemailer = require('nodemailer');

/**
 * Sends an alert email via Gmail SMTP.
 *
 * Required .env vars:
 *   SMTP_USER  — your Gmail address  (e.g. you@gmail.com)
 *   SMTP_PASS  — Gmail App Password  (Settings → Security → App Passwords)
 *
 * The recipient email is stored in settings.json and managed via
 * the /api/settings/email endpoint.
 */
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
            pass: process.env.SMTP_PASS   // Gmail App Password, NOT your login password
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

module.exports = { sendAlertEmail };
