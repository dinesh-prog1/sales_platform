from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import EmailLog, EmailTemplate, EmailConfig
from .serializers import (
    EmailLogSerializer, EmailTemplateSerializer, EmailConfigSerializer,
    TestEmailSerializer
)
from . import services


class EmailLogListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filters = {
            'type': request.query_params.get('type'),
            'status': request.query_params.get('status'),
            'company_id': request.query_params.get('company_id'),
        }
        logs = services.get_email_logs(filters)
        serializer = EmailLogSerializer(logs, many=True)
        return Response({'logs': serializer.data, 'total': logs.count()})


class EmailTemplateListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        templates = services.get_templates()
        return Response(EmailTemplateSerializer(templates, many=True).data)


class EmailTemplateDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, email_type):
        subject = request.data.get('subject', '')
        body = request.data.get('body', '')
        template = services.update_template(email_type, subject, body)
        return Response(EmailTemplateSerializer(template).data)


class EmailConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = services.get_or_create_config()
        return Response(EmailConfigSerializer(config).data)

    def patch(self, request):
        config = services.get_or_create_config()
        serializer = EmailConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class TestSMTPView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TestEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        try:
            services.send_test_email(serializer.validated_data['to_email'])
            return Response({'message': 'Test email sent successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class SendDemoInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, company_id):
        try:
            services.send_demo_invite(str(company_id))
            return Response({'message': 'Demo invite queued'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class RespondOutreachView(APIView):
    """Called when a lead clicks Interested/Not Interested in outreach email."""
    permission_classes = []  # Public endpoint

    def post(self, request):
        company_id = request.data.get('company_id')
        action = request.data.get('action')  # 'interested' or 'not_interested'

        if not company_id or action not in ('interested', 'not_interested'):
            return Response({'error': 'Invalid request'}, status=400)

        from companies.models import Company
        company = get_object_or_404(Company, pk=company_id)

        if action == 'interested':
            company.status = 'interested'
            company.save(update_fields=['status', 'updated_at'])
            config = services.get_or_create_config()
            services.queue_email(company, 'demo_invite', config)
        else:
            company.status = 'not_interested'
            company.save(update_fields=['status', 'updated_at'])

        return Response({'message': f'Marked as {action}', 'status': company.status})
