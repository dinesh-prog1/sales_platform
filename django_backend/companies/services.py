from django.db.models import Count, Q
from .models import Company


def get_companies(filters: dict):
    qs = Company.objects.all()
    if filters.get('status'):
        qs = qs.filter(status=filters['status'])
    if filters.get('size'):
        qs = qs.filter(size=filters['size'])
    if filters.get('country'):
        qs = qs.filter(country__icontains=filters['country'])
    if filters.get('industry'):
        qs = qs.filter(industry__icontains=filters['industry'])
    if filters.get('department'):
        qs = qs.filter(department__icontains=filters['department'])
    if filters.get('search'):
        q = filters['search']
        qs = qs.filter(Q(name__icontains=q) | Q(email__icontains=q))
    return qs


def bulk_create_companies(data: list) -> dict:
    created, skipped = 0, 0
    for item in data:
        _, was_created = Company.objects.get_or_create(
            email=item.get('email', '').lower().strip(),
            defaults={
                'name': item.get('name', ''),
                'contact_person': item.get('contact_person', ''),
                'phone': item.get('phone', ''),
                'website': item.get('website', ''),
                'industry': item.get('industry', ''),
                'size': item.get('size', ''),
                'country': item.get('country', ''),
                'department': item.get('department', ''),
            }
        )
        if was_created:
            created += 1
        else:
            skipped += 1
    return {'created': created, 'skipped': skipped}


def get_status_stats():
    return list(
        Company.objects.values('status').annotate(count=Count('id')).order_by('status')
    )


def get_size_stats():
    return list(
        Company.objects.values('size').annotate(count=Count('id')).order_by('size')
    )


def search_companies(query: str):
    return Company.objects.filter(
        Q(name__icontains=query) | Q(email__icontains=query)
    )[:10]


def get_email_suggestions(name: str):
    return list(
        Company.objects.filter(name__icontains=name)
        .values_list('email', flat=True)[:10]
    )
