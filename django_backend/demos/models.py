import uuid
from django.db import models
from companies.models import Company


class DemoBooking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
        ('no_trial', 'No Trial'),
    ]

    TIME_SLOT_CHOICES = [
        ('morning', 'Morning (10:00 AM)'),
        ('afternoon', 'Afternoon (2:00 PM)'),
        ('evening', 'Evening (6:00 PM)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='demo_bookings', null=True, blank=True)
    booker_name = models.CharField(max_length=255, blank=True, default='')
    booker_email = models.EmailField(blank=True, default='')
    booker_company = models.CharField(max_length=255, blank=True, default='')
    time_slot = models.CharField(max_length=20, choices=TIME_SLOT_CHOICES, blank=True, default='')
    scheduled_date = models.DateField(null=True, blank=True)
    scheduled_time = models.TimeField(null=True, blank=True)
    meeting_link = models.CharField(max_length=500, blank=True, default='')
    google_event_id = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'demo_bookings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company']),
            models.Index(fields=['status']),
            models.Index(fields=['scheduled_date']),
        ]

    def __str__(self):
        return f"Demo for {self.booker_company} on {self.scheduled_date}"
