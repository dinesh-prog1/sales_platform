import uuid
from django.db import models
from companies.models import Company


class EmailLog(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('opened', 'Opened'),
        ('replied', 'Replied'),
    ]

    TYPE_CHOICES = [
        ('outreach', 'Outreach'),
        ('demo_invite', 'Demo Invite'),
        ('demo_confirm', 'Demo Confirmation'),
        ('post_demo', 'Post Demo'),
        ('trial_reminder', 'Trial Reminder'),
        ('feedback', 'Feedback'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='email_logs', null=True, blank=True)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    subject = models.CharField(max_length=500, blank=True, default='')
    body = models.TextField(blank=True, default='')
    recipient_email = models.EmailField(blank=True, default='')
    error_message = models.TextField(blank=True, default='')
    retry_count = models.IntegerField(default=0)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'email_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company']),
            models.Index(fields=['status']),
            models.Index(fields=['type']),
            models.Index(fields=['scheduled_at']),
        ]

    def __str__(self):
        return f"{self.type} to {self.recipient_email} ({self.status})"


class EmailTemplate(models.Model):
    TYPE_CHOICES = EmailLog.TYPE_CHOICES

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, unique=True)
    subject = models.CharField(max_length=500)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'email_templates'

    def __str__(self):
        return f"Template: {self.type}"


class EmailConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    daily_limit = models.IntegerField(default=50)
    sending_enabled = models.BooleanField(default=True)
    cron_hour = models.IntegerField(default=9)
    smtp_host = models.CharField(max_length=255, blank=True, default='')
    smtp_port = models.IntegerField(default=587)
    smtp_user = models.CharField(max_length=255, blank=True, default='')
    smtp_pass = models.CharField(max_length=255, blank=True, default='')
    smtp_from = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'email_configs'

    def __str__(self):
        return f"Email Config (limit: {self.daily_limit}/day)"


class Feedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='feedbacks', null=True, blank=True)
    rating = models.IntegerField(null=True, blank=True)
    comment = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'feedback'

    def __str__(self):
        return f"Feedback from {self.company} (rating: {self.rating})"
