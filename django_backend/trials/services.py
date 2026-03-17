from django.utils import timezone
from datetime import timedelta
from django.db.models import Count
from .models import Trial
from companies.models import Company


TRIAL_DURATION_DAYS = 14


def get_trials(filters: dict):
    qs = Trial.objects.select_related('company', 'demo').all()
    if filters.get('status'):
        qs = qs.filter(status=filters['status'])
    if filters.get('company_id'):
        qs = qs.filter(company_id=filters['company_id'])
    return qs


def create_trial(data: dict) -> Trial:
    company = None
    if data.get('company_id'):
        company = Company.objects.filter(pk=data['company_id']).first()

    expires_at = timezone.now() + timedelta(days=TRIAL_DURATION_DAYS)

    trial = Trial.objects.create(
        company=company,
        demo_id=data.get('demo_id'),
        booker_name=data.get('booker_name', ''),
        booker_email=data.get('booker_email', ''),
        booker_company=data.get('booker_company', ''),
        expires_at=expires_at,
        status='active',
    )

    if company:
        company.status = 'trial_started'
        company.save(update_fields=['status', 'updated_at'])

    return trial


def update_trial(trial_id: str, data: dict) -> Trial:
    trial = Trial.objects.get(pk=trial_id)
    for field in ('status', 'notes', 'expires_at', 'converted_at'):
        if field in data:
            setattr(trial, field, data[field])
    if data.get('status') == 'converted':
        trial.converted_at = timezone.now()
        if trial.company:
            trial.company.status = 'converted'
            trial.company.save(update_fields=['status', 'updated_at'])
    elif data.get('status') == 'dropped':
        if trial.company:
            trial.company.status = 'dropped'
            trial.company.save(update_fields=['status', 'updated_at'])
    trial.save()
    return trial


def get_trial_stats():
    stats = Trial.objects.values('status').annotate(count=Count('id'))
    expiring_soon = Trial.objects.filter(
        status='active',
        expires_at__lte=timezone.now() + timedelta(days=3)
    ).count()
    return {
        'by_status': list(stats),
        'expiring_soon': expiring_soon,
    }


def get_expiring_trials():
    """Returns active trials expiring within 3 days — used by reminder scheduler."""
    return Trial.objects.filter(
        status='active',
        expires_at__lte=timezone.now() + timedelta(days=3),
        expires_at__gte=timezone.now(),
    ).select_related('company')
