from datetime import date, time, timedelta
from django.utils import timezone
from .models import DemoBooking
from companies.models import Company

TIME_SLOT_MAP = {
    'morning': time(10, 0),
    'afternoon': time(14, 0),
    'evening': time(18, 0),
}


def get_demos(filters: dict):
    qs = DemoBooking.objects.select_related('company').all()
    if filters.get('status'):
        qs = qs.filter(status=filters['status'])
    if filters.get('date'):
        qs = qs.filter(scheduled_date=filters['date'])
    if filters.get('company_id'):
        qs = qs.filter(company_id=filters['company_id'])
    return qs


def book_demo(data: dict) -> DemoBooking:
    company = None
    if data.get('company_id'):
        company = Company.objects.filter(pk=data['company_id']).first()

    slot = data.get('time_slot', '')
    scheduled_time = TIME_SLOT_MAP.get(slot)

    demo = DemoBooking.objects.create(
        company=company,
        booker_name=data.get('booker_name', ''),
        booker_email=data.get('booker_email', ''),
        booker_company=data.get('booker_company', ''),
        time_slot=slot,
        scheduled_date=data.get('scheduled_date'),
        scheduled_time=scheduled_time,
        notes=data.get('notes', ''),
        status='pending',
    )

    # Update company status
    if company and company.status == 'interested':
        company.status = 'demo_scheduled'
        company.save(update_fields=['status', 'updated_at'])

    return demo


def confirm_demo(demo_id: str, meeting_link: str, google_event_id: str = '') -> DemoBooking:
    demo = DemoBooking.objects.get(pk=demo_id)
    demo.meeting_link = meeting_link
    demo.google_event_id = google_event_id
    demo.status = 'confirmed'
    demo.save()
    return demo


def get_available_slots(for_date: date) -> list:
    booked = DemoBooking.objects.filter(
        scheduled_date=for_date,
        status__in=['pending', 'confirmed']
    ).values_list('time_slot', flat=True)
    all_slots = ['morning', 'afternoon', 'evening']
    return [s for s in all_slots if s not in booked]
