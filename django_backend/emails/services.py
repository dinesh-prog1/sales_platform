from django.utils import timezone
from django.conf import settings
from .models import EmailLog, EmailTemplate, EmailConfig
from companies.models import Company
from utils.mailer import send_email, render_template


def get_or_create_config() -> EmailConfig:
    config, _ = EmailConfig.objects.get_or_create(
        defaults={
            'daily_limit': 50,
            'sending_enabled': True,
            'cron_hour': 9,
            'smtp_host': settings.EMAIL_HOST,
            'smtp_port': settings.EMAIL_PORT,
            'smtp_user': settings.EMAIL_HOST_USER,
            'smtp_pass': settings.EMAIL_HOST_PASSWORD,
            'smtp_from': settings.DEFAULT_FROM_EMAIL,
        }
    )
    return config


def get_email_logs(filters: dict):
    qs = EmailLog.objects.select_related('company').all()
    if filters.get('type'):
        qs = qs.filter(type=filters['type'])
    if filters.get('status'):
        qs = qs.filter(status=filters['status'])
    if filters.get('company_id'):
        qs = qs.filter(company_id=filters['company_id'])
    return qs


def get_templates():
    return EmailTemplate.objects.all()


def update_template(email_type: str, subject: str, body: str) -> EmailTemplate:
    template, _ = EmailTemplate.objects.update_or_create(
        type=email_type,
        defaults={'subject': subject, 'body': body}
    )
    return template


def has_been_successfully_sent(company_id, email_type: str) -> bool:
    return EmailLog.objects.filter(
        company_id=company_id,
        type=email_type,
        status__in=['sent', 'queued', 'opened', 'replied']
    ).exists()


def queue_email(company: Company, email_type: str, config: EmailConfig = None) -> bool:
    """Queue an email for a company. Returns False if already sent."""
    if has_been_successfully_sent(company.id, email_type):
        return False

    if config is None:
        config = get_or_create_config()

    template = EmailTemplate.objects.filter(type=email_type).first()
    if not template:
        return False

    subject = render_template(template.subject, company)
    body = render_template(template.body, company)

    log = EmailLog.objects.create(
        company=company,
        type=email_type,
        status='queued',
        subject=subject,
        body=body,
        recipient_email=company.email,
    )

    # Send immediately via Celery
    from emails.tasks import deliver_email
    deliver_email.delay(str(log.id))
    return True


def send_test_email(to_email: str, config: EmailConfig = None):
    if config is None:
        config = get_or_create_config()
    send_email(
        to=to_email,
        subject='AI Sales Platform — SMTP Test',
        body='<p>Your SMTP configuration is working correctly.</p>',
        config=config,
    )


def send_demo_invite(company_id: str, config: EmailConfig = None):
    company = Company.objects.get(pk=company_id)
    if config is None:
        config = get_or_create_config()
    queue_email(company, 'demo_invite', config)


def get_outreach_batch(config: EmailConfig) -> list:
    """Returns companies ready for outreach (not yet sent today, within daily limit)."""
    from django.db.models import Subquery, OuterRef
    already_sent = EmailLog.objects.filter(
        company=OuterRef('pk'),
        type='outreach',
        status__in=['sent', 'queued', 'opened', 'replied']
    )
    companies = Company.objects.filter(
        status='uploaded'
    ).exclude(
        pk__in=EmailLog.objects.filter(
            type='outreach',
            status__in=['sent', 'queued', 'opened', 'replied']
        ).values('company_id')
    )[:config.daily_limit]
    return list(companies)
