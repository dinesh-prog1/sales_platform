import uuid
from django.db import models
from companies.models import Company
from demos.models import DemoBooking


class Trial(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('converted', 'Converted'),
        ('expired', 'Expired'),
        ('dropped', 'Dropped'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='trials', null=True, blank=True)
    demo = models.ForeignKey(DemoBooking, on_delete=models.SET_NULL, null=True, blank=True, related_name='trials')
    booker_name = models.CharField(max_length=255, blank=True, default='')
    booker_email = models.EmailField(blank=True, default='')
    booker_company = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    converted_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'trials'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company']),
            models.Index(fields=['status']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"Trial for {self.booker_company} ({self.status})"
