from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404

from companies.models import Company
from emails.services import get_or_create_config, queue_email


class DetectInterestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Detect interest keywords in an email body text."""
        body = request.data.get('body', '').lower()
        keywords = ['interested', 'yes', 'demo', 'schedule', 'book', 'learn more', 'tell me more', 'sounds good']
        detected = [kw for kw in keywords if kw in body]
        return Response({
            'interested': len(detected) > 0,
            'keywords_found': detected,
            'confidence': min(100, len(detected) * 25),
        })


class MarkInterestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company_id = request.data.get('company_id')
        action = request.data.get('action')  # 'interested' or 'not_interested'

        if not company_id or action not in ('interested', 'not_interested'):
            return Response({'error': 'company_id and action are required'}, status=400)

        company = get_object_or_404(Company, pk=company_id)
        company.status = action
        company.save(update_fields=['status', 'updated_at'])

        if action == 'interested':
            config = get_or_create_config()
            queue_email(company, 'demo_invite', config)

        return Response({'message': f'Company marked as {action}', 'status': company.status})


class RespondInterestView(APIView):
    """Public endpoint — lead clicks Interested/Not Interested in their email."""
    permission_classes = [AllowAny]

    def get(self, request):
        company_id = request.query_params.get('company_id')
        action = request.query_params.get('action')

        if not company_id or action not in ('interested', 'not_interested'):
            return Response({'error': 'Invalid link'}, status=400)

        company = get_object_or_404(Company, pk=company_id)
        company.status = action
        company.save(update_fields=['status', 'updated_at'])

        if action == 'interested':
            config = get_or_create_config()
            queue_email(company, 'demo_invite', config)

        return Response({
            'message': 'Thank you for your response!',
            'action': action,
            'company': company.name,
        })
