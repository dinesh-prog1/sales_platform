from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta

from companies.models import Company
from demos.models import DemoBooking
from trials.models import Trial
from emails.models import EmailLog


class AnalyticsDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # Company pipeline counts
        company_stats = dict(
            Company.objects.values_list('status').annotate(count=Count('id'))
        )

        # Demo stats
        demo_stats = dict(
            DemoBooking.objects.values_list('status').annotate(count=Count('id'))
        )

        # Trial stats
        trial_stats = dict(
            Trial.objects.values_list('status').annotate(count=Count('id'))
        )

        # Email stats (last 30 days)
        email_stats = dict(
            EmailLog.objects.filter(created_at__gte=thirty_days_ago)
            .values_list('status').annotate(count=Count('id'))
        )

        # Daily email trend (last 14 days)
        from django.db.models.functions import TruncDate
        email_trend = list(
            EmailLog.objects.filter(
                created_at__gte=now - timedelta(days=14),
                status='sent'
            )
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        # Conversion funnel
        total = Company.objects.count()
        funnel = [
            {'stage': 'Total Uploaded', 'count': total},
            {'stage': 'Outreach Sent', 'count': Company.objects.filter(status__in=['outreach_sent', 'interested', 'demo_scheduled', 'demo_completed', 'trial_started', 'converted']).count()},
            {'stage': 'Interested', 'count': Company.objects.filter(status__in=['interested', 'demo_scheduled', 'demo_completed', 'trial_started', 'converted']).count()},
            {'stage': 'Demo Scheduled', 'count': Company.objects.filter(status__in=['demo_scheduled', 'demo_completed', 'trial_started', 'converted']).count()},
            {'stage': 'Trial Started', 'count': Company.objects.filter(status__in=['trial_started', 'converted']).count()},
            {'stage': 'Converted', 'count': Company.objects.filter(status='converted').count()},
        ]

        return Response({
            'company_stats': company_stats,
            'demo_stats': demo_stats,
            'trial_stats': trial_stats,
            'email_stats': email_stats,
            'email_trend': email_trend,
            'funnel': funnel,
            'totals': {
                'companies': total,
                'demos': DemoBooking.objects.count(),
                'active_trials': Trial.objects.filter(status='active').count(),
                'converted': company_stats.get('converted', 0),
            }
        })
