-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    size VARCHAR(50) NOT NULL CHECK (size IN ('small', 'medium', 'large')),
    email VARCHAR(255) NOT NULL UNIQUE,
    contact_person VARCHAR(255),
    industry VARCHAR(255),
    country VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded'
        CHECK (status IN (
            'uploaded', 'outreach_sent', 'interested', 'not_interested',
            'demo_invited', 'demo_scheduled', 'demo_completed',
            'trial_started', 'trial_expired', 'converted', 'dropped'
        )),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_size ON companies(size);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'outreach', 'demo_invite', 'demo_confirm',
        'post_demo', 'trial_reminder', 'feedback'
    )),
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'queued', 'sent', 'failed', 'opened', 'replied')),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_company_id ON email_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_scheduled_at ON email_logs(scheduled_at);
-- Composite index for rescueStuckEmails scan: WHERE status='queued' AND created_at < $1 AND sent_at IS NULL AND scheduled_at <= NOW()
CREATE INDEX IF NOT EXISTS idx_email_logs_rescue ON email_logs(status, created_at, scheduled_at) WHERE status = 'queued' AND sent_at IS NULL;

-- Demo bookings table
CREATE TABLE IF NOT EXISTS demo_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    meeting_link VARCHAR(500),
    calendar_event_id VARCHAR(255),
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_bookings_company_id ON demo_bookings(company_id);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_status ON demo_bookings(status);

-- Trials table
CREATE TABLE IF NOT EXISTS trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'converted', 'dropped')),
    plan_selected VARCHAR(100),
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trials_company_id ON trials(company_id);
CREATE INDEX IF NOT EXISTS idx_trials_status ON trials(status);
CREATE INDEX IF NOT EXISTS idx_trials_expires_at ON trials(expires_at);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    reason TEXT,
    required_features TEXT,
    improvements TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_company_id ON feedback(company_id);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL UNIQUE CHECK (type IN (
        'outreach', 'demo_invite', 'demo_confirm',
        'post_demo', 'trial_reminder', 'feedback'
    )),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email config table
CREATE TABLE IF NOT EXISTS email_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emails_per_day INT NOT NULL DEFAULT 50,
    target_size VARCHAR(50) NOT NULL DEFAULT 'all',
    batch_interval_minutes INT NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    scheduling_link VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default email config
INSERT INTO email_configs (emails_per_day, target_size, batch_interval_minutes, scheduling_link)
VALUES (50, 'all', 60, 'https://calendly.com/your-link')
ON CONFLICT DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (type, subject, body) VALUES
(
    'outreach',
    'Transform Your Sales Pipeline with AI — {{company_name}}',
    'Hi {{contact_person}},

I hope this message finds you well!

My name is Alex, and I''m reaching out because I noticed {{company_name}} is growing rapidly in the {{industry}} space. Impressive work!

We''ve built an AI Sales Automation Platform that helps companies like yours:
✅ Automate B2B outreach at scale
✅ Book more qualified demos automatically
✅ Track and convert trials to paid customers
✅ Get actionable insights from your sales pipeline

Companies using our platform see an average of 3x more qualified leads within the first 60 days.

Would you be open to a quick 20-minute demo to see how this could work for {{company_name}}?

Best regards,
Alex Johnson
AI Sales Platform Team'
),
(
    'demo_invite',
    'Great news, {{contact_person}}! Let''s schedule your free demo',
    'Hi {{contact_person}},

Thank you so much for your interest in our AI Sales Platform! We''re excited to show you what we''ve built.

I''d love to schedule a personalized 30-minute demo for {{company_name}} where we''ll show you:
🎯 Live demo of the full automation pipeline
📊 Real metrics from similar companies in {{industry}}
🚀 How to get started in under 24 hours

👉 Book your free demo here: {{scheduling_link}}

Slots fill up fast, so I recommend booking today!

Looking forward to speaking with you,
Alex Johnson
AI Sales Platform Team'
),
(
    'demo_confirm',
    'Your demo is confirmed! — {{company_name}} × AI Sales Platform',
    'Hi {{contact_person}},

Your demo is confirmed! Here are the details:

📅 Date & Time: {{scheduled_at}}
🔗 Meeting Link: {{meeting_link}}
⏱️ Duration: 30 minutes

What to expect:
• Full walkthrough of the platform
• Live Q&A session
• Custom ROI calculation for {{company_name}}

Please add this to your calendar. If you need to reschedule, just reply to this email.

See you soon!
Alex Johnson
AI Sales Platform Team'
),
(
    'post_demo',
    'Your Free Trial is Ready — Start Today!',
    'Hi {{contact_person}},

Thank you for attending the demo! It was great connecting with you.

As promised, here''s everything you need to get started with your FREE 14-day trial:

🆓 FREE 14-Day Trial includes:
✅ Full platform access
✅ Up to 500 automated outreach emails
✅ Real-time analytics dashboard
✅ Dedicated onboarding support

💰 Pricing after trial:
• Starter: $99/month (up to 1,000 contacts)
• Growth: $299/month (up to 10,000 contacts)
• Enterprise: Custom pricing

👉 Activate your free trial: {{trial_link}}

Our team is here to help you get maximum value. Don''t hesitate to reach out!

Best,
Alex Johnson
AI Sales Platform Team'
),
(
    'trial_reminder',
    'Your trial expires in 3 days — Don''t lose access!',
    'Hi {{contact_person}},

Quick heads up — your free trial for {{company_name}} expires in 3 days on {{expires_at}}.

Here''s what you''ll lose access to:
❌ Automated outreach campaigns
❌ Lead tracking dashboard
❌ AI-powered interest detection
❌ Demo scheduling automation

Upgrade now and keep the momentum going:
• Starter: $99/month — Perfect for {{company_name}}''s current stage
• Growth: $299/month — When you''re ready to scale

👉 Upgrade now: {{upgrade_link}}

Questions? Reply to this email and we''ll get back to you within 2 hours.

Best,
Alex Johnson
AI Sales Platform Team'
),
(
    'feedback',
    'We''d love your feedback — Help us improve!',
    'Hi {{contact_person}},

We noticed your trial with our AI Sales Platform has ended, and we''re sorry to see you go!

Your feedback is incredibly valuable to us, and we''d love to understand your experience better.

Could you take 2 minutes to answer a few questions?

👉 Share your feedback: {{feedback_link}}

Specifically, we''d love to know:
1. What was the main reason you didn''t continue?
2. What features were missing for {{company_name}}?
3. What would make us a perfect fit?

Your insights directly shape our product roadmap. Many features today exist because of feedback from users like you.

Thank you for giving us a try,
Alex Johnson
AI Sales Platform Team
P.S. If anything has changed and you''d like to give us another shot, just reply to this email!'
)
ON CONFLICT (type) DO NOTHING;

UPDATE email_templates
SET
    subject = 'Modernize workforce operations at {{company_name}} with Employee Galaxy',
    body = '<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#153046;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dce6f2;">
            <tr>
              <td style="background:#0f172a;padding:28px 36px;">
                <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#93c5fd;">Employee Galaxy</div>
                <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">A unified HR, payroll, and employee operations platform for growing teams</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:36px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{contact_person}},</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">I am reaching out because {{company_name}} appears to be scaling in {{industry}}. Employee Galaxy helps teams replace fragmented HR admin with a single workflow for employee records, attendance, payroll, compliance, and manager approvals.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">A few areas teams typically improve after moving to Employee Galaxy:</p>
                <ul style="margin:0 0 24px;padding-left:20px;color:#334155;font-size:15px;line-height:1.8;">
                  <li>Centralized employee profiles and lifecycle actions</li>
                  <li>Attendance, leave, and shift visibility in one place</li>
                  <li>More reliable payroll coordination and approval workflows</li>
                  <li>Cleaner reporting for HR and leadership teams</li>
                </ul>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">You can preview the product here: <a href="{{product_link}}" style="color:#2563eb;text-decoration:none;">Employee Galaxy platform</a>.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="padding-right:12px;">
                      <a href="{{interested_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600;">Interested</a>
                    </td>
                    <td>
                      <a href="{{not_interested_link}}" style="display:inline-block;background:#e2e8f0;color:#0f172a;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600;">Not Interested</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">If you click <strong>Interested</strong>, we will immediately send a follow-up email with a demo scheduling form.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'
WHERE type = 'outreach';

UPDATE email_templates
SET
    subject = 'Thank you for your interest in Employee Galaxy, {{company_name}}',
    body = '<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#153046;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dce6f2;">
            <tr>
              <td style="padding:36px;">
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#0f172a;">Thanks for your interest in Employee Galaxy</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{contact_person}},</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">Thank you for letting us know that Employee Galaxy is relevant for {{company_name}}. Please use the scheduling form below and share a preferred time for a focused walkthrough.</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">We will tailor the conversation around your HR, payroll, attendance, and workforce operations process.</p>
                <a href="{{schedule_form_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600;">Open demo scheduling form</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'
WHERE type = 'demo_invite';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_logs_updated_at ON email_logs;
CREATE TRIGGER update_email_logs_updated_at BEFORE UPDATE ON email_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_demo_bookings_updated_at ON demo_bookings;
CREATE TRIGGER update_demo_bookings_updated_at BEFORE UPDATE ON demo_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trials_updated_at ON trials;
CREATE TRIGGER update_trials_updated_at BEFORE UPDATE ON trials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_configs_updated_at ON email_configs;
CREATE TRIGGER update_email_configs_updated_at BEFORE UPDATE ON email_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
