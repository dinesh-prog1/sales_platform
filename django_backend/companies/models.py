import uuid
from django.db import models


class Company(models.Model):
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('outreach_sent', 'Outreach Sent'),
        ('interested', 'Interested'),
        ('not_interested', 'Not Interested'),
        ('demo_scheduled', 'Demo Scheduled'),
        ('demo_completed', 'Demo Completed'),
        ('trial_started', 'Trial Started'),
        ('converted', 'Converted'),
        ('dropped', 'Dropped'),
    ]

    SIZE_CHOICES = [
        ('1-10', '1-10'),
        ('11-50', '11-50'),
        ('51-200', '51-200'),
        ('201-500', '201-500'),
        ('500+', '500+'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    contact_person = models.CharField(max_length=255, blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    website = models.CharField(max_length=255, blank=True, default='')
    industry = models.CharField(max_length=255, blank=True, default='')
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='uploaded')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'companies'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['size']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"{self.name} ({self.email})"
