-- Migration 007: Subscriptions table + trial_conversion email type
-- Idempotent: safe to run on every server start

-- ── Subscriptions table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID REFERENCES companies(id) ON DELETE SET NULL,
    trial_id         UUID REFERENCES trials(id)    ON DELETE SET NULL,
    company_name     VARCHAR(255) NOT NULL,
    contact_person   VARCHAR(255) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    phone            VARCHAR(50),
    plan             VARCHAR(50)  NOT NULL DEFAULT 'free'
                         CHECK (plan IN ('free','premium')),
    num_users        INT NOT NULL DEFAULT 1 CHECK (num_users > 0),
    price_per_user   INT NOT NULL DEFAULT 0,
    total_amount     INT NOT NULL DEFAULT 0,
    status           VARCHAR(50) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','active','cancelled')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON subscriptions(status);

-- ── Expand email type constraints to include trial_conversion ────────────────
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_type_check;
DO $$ BEGIN
    ALTER TABLE email_logs ADD CONSTRAINT email_logs_type_check
        CHECK (type IN ('outreach','demo_invite','demo_confirm','post_demo',
                        'trial_reminder','trial_conversion','feedback'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_type_check;
DO $$ BEGIN
    ALTER TABLE email_templates ADD CONSTRAINT email_templates_type_check
        CHECK (type IN ('outreach','demo_invite','demo_confirm','post_demo',
                        'trial_reminder','trial_conversion','feedback'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Trial conversion email template ─────────────────────────────────────────
INSERT INTO email_templates (type, subject, body, is_active)
SELECT * FROM (VALUES (
    'trial_conversion',
    'Your free trial ends in 3 days — Choose your plan, {{company_name}}',
    '<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#153046;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dce6f2;">

            <!-- Header -->
            <tr>
              <td style="background:#0f172a;padding:28px 36px;">
                <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#93c5fd;">Employee Galaxy</div>
                <h1 style="margin:10px 0 0;font-size:24px;line-height:1.2;color:#ffffff;">Your free trial ends in 3 days</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{contact_person}},</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
                  Your 14-day free trial of Employee Galaxy for <strong>{{company_name}}</strong> is ending soon.
                  We hope you have been enjoying the platform!
                </p>

                <p style="margin:0 0 12px;font-size:16px;line-height:1.7;font-weight:600;">Choose your plan:</p>

                <!-- Plan cards -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                  <tr>
                    <td width="48%" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;vertical-align:top;">
                      <div style="font-size:18px;font-weight:700;color:#0369a1;margin-bottom:8px;">Free</div>
                      <div style="font-size:24px;font-weight:800;color:#0c4a6e;">&#x20B9;0<span style="font-size:14px;color:#64748b;">/month</span></div>
                      <ul style="padding-left:16px;margin:12px 0 0;font-size:13px;line-height:1.8;color:#334155;">
                        <li>Up to 10 users</li>
                        <li>Basic attendance tracking</li>
                        <li>Social feed access</li>
                        <li>Email support</li>
                      </ul>
                    </td>
                    <td width="4%"></td>
                    <td width="48%" style="background:#1e3a5f;border:1px solid #1e3a5f;border-radius:12px;padding:20px;vertical-align:top;">
                      <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#fbbf24;margin-bottom:4px;">Most Popular</div>
                      <div style="font-size:18px;font-weight:700;color:#93c5fd;margin-bottom:8px;">Premium</div>
                      <div style="font-size:24px;font-weight:800;color:#ffffff;">&#x20B9;99<span style="font-size:14px;color:#93c5fd;">/user/month</span></div>
                      <ul style="padding-left:16px;margin:12px 0 0;font-size:13px;line-height:1.8;color:#cbd5e1;">
                        <li>Unlimited users</li>
                        <li>Advanced attendance &amp; leave</li>
                        <li>Full social feed features</li>
                        <li>Payroll management</li>
                        <li>Priority support</li>
                        <li>Custom integrations</li>
                      </ul>
                    </td>
                  </tr>
                </table>

                <!-- CTA -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                  <tr>
                    <td align="center">
                      <a href="{{trial_interested_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:16px;font-weight:600;padding:14px 36px;border-radius:10px;text-decoration:none;">
                        Continue &amp; Choose Plan &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#64748b;text-align:center;">
                  Not interested? <a href="{{trial_not_interested_link}}" style="color:#2563eb;">Let us know</a>.
                </p>

                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">
                  If your trial expires without selecting a plan, your access will be paused.
                  You can always reactivate later by contacting our team.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;padding:20px 36px;text-align:center;font-size:12px;color:#94a3b8;">
                &copy; 2026 Pagatur Software Pvt. Ltd. &mdash; Employee Galaxy
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>',
    true
)) AS v(type, subject, body, is_active)
WHERE NOT EXISTS (SELECT 1 FROM email_templates e WHERE e.type = v.type);
