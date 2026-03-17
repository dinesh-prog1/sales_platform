from celery import shared_task
from django.utils import timezone


@shared_task(bind=True, max_retries=3)
def deliver_email(self, log_id: str):
    """Send a single queued email log entry."""
    from .models import EmailLog
    from .services import get_or_create_config
    from utils.mailer import send_email

    try:
        log = EmailLog.objects.get(pk=log_id)
    except EmailLog.DoesNotExist:
        return

    if log.status == 'sent':
        return

    config = get_or_create_config()
    try:
        send_email(
            to=log.recipient_email,
            subject=log.subject,
            body=log.body,
            config=config,
        )
        log.status = 'sent'
        log.sent_at = timezone.now()
        log.save(update_fields=['status', 'sent_at', 'updated_at'])
    except Exception as exc:
        log.status = 'failed'
        log.error_message = str(exc)
        log.retry_count += 1
        log.save(update_fields=['status', 'error_message', 'retry_count', 'updated_at'])
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))


@shared_task
def send_outreach_batch():
    """Daily task: send outreach emails to new companies."""
    from .services import get_or_create_config, get_outreach_batch, queue_email
    config = get_or_create_config()
    if not config.sending_enabled:
        return
    companies = get_outreach_batch(config)
    sent = 0
    for company in companies:
        if queue_email(company, 'outreach', config):
            company.status = 'outreach_sent'
            company.save(update_fields=['status', 'updated_at'])
            sent += 1
    return f'Sent outreach to {sent} companies'


@shared_task
def send_trial_reminders():
    """Daily task: send trial reminder emails to trials expiring in 3 days."""
    from trials.services import get_expiring_trials
    from .services import get_or_create_config, has_been_successfully_sent, queue_email
    config = get_or_create_config()
    trials = get_expiring_trials()
    sent = 0
    for trial in trials:
        if trial.company:
            if queue_email(trial.company, 'trial_reminder', config):
                sent += 1
    return f'Sent {sent} trial reminder emails'


@shared_task
def send_feedback_emails():
    """Daily task: send feedback emails to dropped trials."""
    from trials.models import Trial
    from .services import get_or_create_config, queue_email
    config = get_or_create_config()
    dropped = Trial.objects.filter(status='dropped').select_related('company')
    sent = 0
    for trial in dropped:
        if trial.company:
            if queue_email(trial.company, 'feedback', config):
                sent += 1
    return f'Sent {sent} feedback emails'


@shared_task
def process_email_queue():
    """Periodic task: rescue stuck queued emails."""
    from .models import EmailLog
    from django.utils import timezone
    from datetime import timedelta

    stuck = EmailLog.objects.filter(
        status='queued',
        updated_at__lte=timezone.now() - timedelta(minutes=5)
    )
    for log in stuck:
        deliver_email.delay(str(log.id))
    return f'Rescued {stuck.count()} stuck emails'


@shared_task
def send_demo_invite_email(demo_id: str):
    """Send demo invite after a demo is booked."""
    from demos.models import DemoBooking
    from .services import get_or_create_config, queue_email
    demo = DemoBooking.objects.select_related('company').filter(pk=demo_id).first()
    if demo and demo.company:
        config = get_or_create_config()
        queue_email(demo.company, 'demo_invite', config)


@shared_task
def send_demo_confirm_email(demo_id: str):
    """Send demo confirmation after admin confirms a demo booking."""
    from demos.models import DemoBooking
    from .models import EmailTemplate, EmailLog
    from .services import get_or_create_config
    from utils.mailer import send_email, render_template

    demo = DemoBooking.objects.select_related('company').filter(pk=demo_id).first()
    if not demo or not demo.company:
        return

    config = get_or_create_config()
    template = EmailTemplate.objects.filter(type='demo_confirm').first()
    if not template:
        return

    company = demo.company
    subject = render_template(template.subject, company, demo=demo)
    body = render_template(template.body, company, demo=demo)

    log = EmailLog.objects.create(
        company=company,
        type='demo_confirm',
        status='queued',
        subject=subject,
        body=body,
        recipient_email=company.email,
    )
    deliver_email.delay(str(log.id))
