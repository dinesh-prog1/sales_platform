import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_sales.settings')

app = Celery('ai_sales')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Scheduled tasks (replaces Go EmailScheduler)
app.conf.beat_schedule = {
    # Send pre-queued outreach emails every day at 9 AM
    'send-outreach-emails': {
        'task': 'emails.tasks.send_outreach_batch',
        'schedule': crontab(hour=9, minute=0),
    },
    # Send trial reminder emails every day at 10 AM
    'send-trial-reminders': {
        'task': 'emails.tasks.send_trial_reminders',
        'schedule': crontab(hour=10, minute=0),
    },
    # Send feedback emails every day at 11 AM
    'send-feedback-emails': {
        'task': 'emails.tasks.send_feedback_emails',
        'schedule': crontab(hour=11, minute=0),
    },
    # Process email queue every minute (replaces Go EmailWorker)
    'process-email-queue': {
        'task': 'emails.tasks.process_email_queue',
        'schedule': 60.0,
    },
}
