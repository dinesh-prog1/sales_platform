import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from django.conf import settings


def send_email(to: str, subject: str, body: str, config=None):
    """
    Send an HTML email via SMTP.
    Uses DB config if provided, falls back to Django settings.
    """
    if config and config.smtp_user:
        host = config.smtp_host or settings.EMAIL_HOST
        port = config.smtp_port or settings.EMAIL_PORT
        user = config.smtp_user
        password = config.smtp_pass
        from_addr = config.smtp_from or user
    else:
        host = settings.EMAIL_HOST
        port = settings.EMAIL_PORT
        user = settings.EMAIL_HOST_USER
        password = settings.EMAIL_HOST_PASSWORD
        from_addr = settings.DEFAULT_FROM_EMAIL

    if not user or not password:
        raise ValueError('SMTP credentials not configured. Go to Settings → SMTP tab.')

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = from_addr
    msg['To'] = to
    msg.attach(MIMEText(body, 'html'))

    with smtplib.SMTP(host, port) as server:
        server.ehlo()
        server.starttls()
        server.login(user, password.replace(' ', ''))
        server.sendmail(from_addr, [to], msg.as_string())


def render_template(template_str: str, company, demo=None) -> str:
    """Replace {{variable}} placeholders with company/demo values."""
    from django.conf import settings

    scheduling_link = getattr(settings, 'SCHEDULING_LINK', '')
    meeting_link = ''
    if demo:
        meeting_link = getattr(demo, 'meeting_link', '') or ''

    replacements = {
        '{{company_name}}': getattr(company, 'name', ''),
        '{{contact_person}}': getattr(company, 'contact_person', '') or getattr(company, 'name', ''),
        '{{company_email}}': getattr(company, 'email', ''),
        '{{scheduling_link}}': scheduling_link,
        '{{meeting_link}}': meeting_link,
        '{{demo_date}}': str(getattr(demo, 'scheduled_date', '')) if demo else '',
        '{{demo_time}}': str(getattr(demo, 'scheduled_time', '')) if demo else '',
        '{{time_slot}}': getattr(demo, 'time_slot', '') if demo else '',
    }

    result = template_str
    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value or '')
    return result
