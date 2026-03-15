-- Migration 006: Professional HTML email templates for demo_confirm, post_demo, trial_reminder, feedback
-- Idempotent: safe to run on every server start

UPDATE email_templates
SET
    subject = 'Your demo is confirmed — {{company_name}} × Employee Galaxy',
    body    = '<!DOCTYPE html>
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
                <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;color:#ffffff;">Your demo is confirmed!</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{contact_person}},</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
                  We are looking forward to walking you through Employee Galaxy. Here are your session details:
                </p>

                <!-- Detail card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                       style="background:#f0f6ff;border-radius:12px;border:1px solid #bfdbfe;margin:0 0 28px;">
                  <tr>
                    <td style="padding:24px 28px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-bottom:14px;">
                            <span style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:600;">Date &amp; Time</span><br>
                            <span style="font-size:17px;font-weight:700;color:#0f172a;">{{scheduled_at}}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom:14px;">
                            <span style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:600;">Duration</span><br>
                            <span style="font-size:17px;font-weight:700;color:#0f172a;">30 minutes</span>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <span style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:600;">Meeting Link</span><br>
                            <a href="{{meeting_link}}" style="font-size:15px;color:#2563eb;text-decoration:none;font-weight:600;">Click here to join the call</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;font-weight:600;color:#0f172a;">What to expect:</p>
                <ul style="margin:0 0 28px;padding-left:20px;color:#334155;font-size:15px;line-height:1.9;">
                  <li>Full walkthrough of the Employee Galaxy platform</li>
                  <li>Live Q&amp;A tailored to {{company_name}}</li>
                  <li>Discussion of your current HR and payroll workflow</li>
                  <li>Custom onboarding plan for your team size</li>
                </ul>

                <!-- CTA -->
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <a href="{{meeting_link}}"
                         style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:15px;">
                        Add to Calendar &amp; Join Link
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#64748b;">
                  Need to reschedule? Simply reply to this email and we will find a time that works better for you.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">
                  Employee Galaxy &nbsp;·&nbsp; Pagatur Software Pvt. Ltd.<br>
                  You are receiving this because {{company_name}} requested a demo.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'
WHERE type = 'demo_confirm';


UPDATE email_templates
SET
    subject = 'Your 14-day free trial is ready — Employee Galaxy',
    body    = '<!DOCTYPE html>
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
                <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;color:#ffffff;">Thank you for attending the demo!</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{contact_person}},</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
                  It was great connecting with the team at {{company_name}}. As discussed, your free 14-day trial is now ready. No credit card required.
                </p>

                <!-- Trial includes card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                       style="background:#f0f6ff;border-radius:12px;border:1px solid #bfdbfe;margin:0 0 28px;">
                  <tr>
                    <td style="padding:24px 28px;">
                      <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">Your free trial includes</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding:6px 0;font-size:15px;color:#1e3a5f;">
                            <span style="color:#2563eb;font-weight:700;margin-right:10px;">✓</span> Full platform access — every feature unlocked
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:15px;color:#1e3a5f;">
                            <span style="color:#2563eb;font-weight:700;margin-right:10px;">✓</span> Employee records, attendance &amp; leave management
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:15px;color:#1e3a5f;">
                            <span style="color:#2563eb;font-weight:700;margin-right:10px;">✓</span> Payroll coordination and approval workflows
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:15px;color:#1e3a5f;">
                            <span style="color:#2563eb;font-weight:700;margin-right:10px;">✓</span> Dedicated onboarding support from our team
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Pricing card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                       style="background:#fafafa;border-radius:12px;border:1px solid #e2e8f0;margin:0 0 28px;">
                  <tr>
                    <td style="padding:24px 28px;">
                      <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">Pricing after trial</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                            <span style="font-size:15px;font-weight:600;color:#0f172a;">Starter</span>
                            <span style="font-size:14px;color:#6b7280;"> — up to 50 employees</span>
                            <span style="float:right;font-size:15px;font-weight:700;color:#2563eb;">$99 / mo</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                            <span style="font-size:15px;font-weight:600;color:#0f172a;">Growth</span>
                            <span style="font-size:14px;color:#6b7280;"> — up to 500 employees</span>
                            <span style="float:right;font-size:15px;font-weight:700;color:#2563eb;">$299 / mo</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;">
                            <span style="font-size:15px;font-weight:600;color:#0f172a;">Enterprise</span>
                            <span style="font-size:14px;color:#6b7280;"> — unlimited</span>
                            <span style="float:right;font-size:15px;font-weight:700;color:#2563eb;">Custom</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- CTA -->
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <a href="{{trial_link}}"
                         style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:15px;">
                        Activate Your Free Trial
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#64748b;">
                  Our team is here to help you get maximum value from your trial. Reply to this email any time.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">
                  Employee Galaxy &nbsp;·&nbsp; Pagatur Software Pvt. Ltd.<br>
                  Sent to {{company_name}} following your product demo.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'
WHERE type = 'post_demo';


UPDATE email_templates
SET
    subject = 'Your Employee Galaxy trial expires in 3 days — {{company_name}}',
    body    = '<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#153046;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dce6f2;">

            <!-- Header — amber urgency -->
            <tr>
              <td style="background:#0f172a;padding:28px 36px;">
                <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#fbbf24;">Employee Galaxy &nbsp;·&nbsp; Trial Reminder</div>
                <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;color:#ffffff;">Your trial expires in 3 days</h1>
              </td>
            </tr>

            <!-- Countdown banner -->
            <tr>
              <td style="background:#fffbeb;border-bottom:1px solid #fde68a;padding:16px 36px;text-align:center;">
                <p style="margin:0;font-size:15px;color:#92400e;font-weight:600;">
                  Trial ends on <strong>{{expires_at}}</strong> — upgrade now to keep your data and access.
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{contact_person}},</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
                  Your free trial for {{company_name}} is ending soon. After the trial expires, access to all platform features will be paused.
                </p>

                <!-- What you will lose card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                       style="background:#fff7ed;border-radius:12px;border:1px solid #fed7aa;margin:0 0 28px;">
                  <tr>
                    <td style="padding:24px 28px;">
                      <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:0.5px;">Access that will be paused</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr><td style="padding:5px 0;font-size:15px;color:#7c2d12;"><span style="margin-right:10px;">✗</span> Employee records and lifecycle management</td></tr>
                        <tr><td style="padding:5px 0;font-size:15px;color:#7c2d12;"><span style="margin-right:10px;">✗</span> Attendance, leave, and shift tracking</td></tr>
                        <tr><td style="padding:5px 0;font-size:15px;color:#7c2d12;"><span style="margin-right:10px;">✗</span> Payroll coordination workflows</td></tr>
                        <tr><td style="padding:5px 0;font-size:15px;color:#7c2d12;"><span style="margin-right:10px;">✗</span> Analytics and HR reporting dashboard</td></tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Pricing card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                       style="background:#f0f6ff;border-radius:12px;border:1px solid #bfdbfe;margin:0 0 28px;">
                  <tr>
                    <td style="padding:24px 28px;">
                      <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">Continue with a paid plan</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding:8px 0;border-bottom:1px solid #dbeafe;">
                            <span style="font-size:15px;font-weight:600;color:#0f172a;">Starter</span>
                            <span style="font-size:14px;color:#6b7280;"> — up to 50 employees</span>
                            <span style="float:right;font-size:15px;font-weight:700;color:#2563eb;">$99 / mo</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;">
                            <span style="font-size:15px;font-weight:600;color:#0f172a;">Growth</span>
                            <span style="font-size:14px;color:#6b7280;"> — up to 500 employees</span>
                            <span style="float:right;font-size:15px;font-weight:700;color:#2563eb;">$299 / mo</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- CTA -->
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <a href="{{upgrade_link}}"
                         style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:15px;">
                        Upgrade Now — Keep Your Access
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#64748b;">
                  Questions about pricing or the best plan for {{company_name}}? Just reply to this email — we will respond within 2 hours.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">
                  Employee Galaxy &nbsp;·&nbsp; Pagatur Software Pvt. Ltd.<br>
                  This reminder was sent to {{company_name}} as your trial nears expiry.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'
WHERE type = 'trial_reminder';


UPDATE email_templates
SET
    subject = 'We would love your feedback — {{company_name}}',
    body    = '<!DOCTYPE html>
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
                <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;color:#ffffff;">Help us build the right product</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{contact_person}},</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
                  Your trial with Employee Galaxy has ended and we are sorry to see you go. We genuinely want to understand your experience at {{company_name}} so we can improve for teams like yours.
                </p>

                <!-- Feedback questions card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                       style="background:#f0f6ff;border-radius:12px;border:1px solid #bfdbfe;margin:0 0 28px;">
                  <tr>
                    <td style="padding:24px 28px;">
                      <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#0f172a;">We would love to know:</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding:8px 0;font-size:15px;color:#334155;border-bottom:1px solid #dbeafe;">
                            <span style="color:#2563eb;font-weight:700;margin-right:10px;">1.</span>
                            What was the main reason you did not continue?
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;font-size:15px;color:#334155;border-bottom:1px solid #dbeafe;">
                            <span style="color:#2563eb;font-weight:700;margin-right:10px;">2.</span>
                            Which features were missing or not meeting {{company_name}}''s needs?
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;font-size:15px;color:#334155;">
                            <span style="color:#2563eb;font-weight:700;margin-right:10px;">3.</span>
                            What would make Employee Galaxy a perfect fit for your team?
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
                  Your answers will take about 2 minutes and directly influence what we build next. Many of our current features exist because of honest feedback from teams like yours.
                </p>

                <!-- CTA -->
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <a href="{{feedback_link}}"
                         style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:15px;">
                        Share Your Feedback
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#64748b;">
                  If anything has changed and you would like to give Employee Galaxy another try, simply reply to this email and we will set up a fresh trial for {{company_name}}.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">
                  Employee Galaxy &nbsp;·&nbsp; Pagatur Software Pvt. Ltd.<br>
                  Sent to {{company_name}} following the end of your free trial.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'
WHERE type = 'feedback';
