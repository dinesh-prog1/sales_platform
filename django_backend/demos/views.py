from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from datetime import date

from .models import DemoBooking
from .serializers import DemoBookingSerializer, DemoBookPublicSerializer, DemoConfirmSerializer
from . import services


class DemoListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filters = {
            'status': request.query_params.get('status'),
            'date': request.query_params.get('date'),
            'company_id': request.query_params.get('company_id'),
        }
        demos = services.get_demos(filters)
        serializer = DemoBookingSerializer(demos, many=True)
        return Response({'demos': serializer.data, 'total': demos.count()})

    def post(self, request):
        serializer = DemoBookingSerializer(data=request.data)
        if serializer.is_valid():
            demo = serializer.save()
            return Response(DemoBookingSerializer(demo).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DemoBookPublicView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = DemoBookPublicSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        demo = services.book_demo(serializer.validated_data)
        # Trigger demo confirmation email
        from emails.tasks import send_demo_invite_email
        send_demo_invite_email.delay(str(demo.id))
        return Response(DemoBookingSerializer(demo).data, status=201)


class DemoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        demo = get_object_or_404(DemoBooking, pk=pk)
        return Response(DemoBookingSerializer(demo).data)

    def patch(self, request, pk):
        demo = get_object_or_404(DemoBooking, pk=pk)
        serializer = DemoBookingSerializer(demo, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class DemoConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = DemoConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        demo = services.confirm_demo(
            pk,
            serializer.validated_data.get('meeting_link', ''),
            serializer.validated_data.get('google_event_id', ''),
        )
        # Send demo confirmation email
        from emails.tasks import send_demo_confirm_email
        send_demo_confirm_email.delay(str(demo.id))
        return Response(DemoBookingSerializer(demo).data)


class DemoSlotsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'error': 'date param required'}, status=400)
        try:
            d = date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'invalid date format, use YYYY-MM-DD'}, status=400)
        slots = services.get_available_slots(d)
        return Response({'available_slots': slots})
