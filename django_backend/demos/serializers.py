from rest_framework import serializers
from .models import DemoBooking


class DemoBookingSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_email = serializers.CharField(source='company.email', read_only=True)

    class Meta:
        model = DemoBooking
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class DemoBookPublicSerializer(serializers.Serializer):
    company_id = serializers.UUIDField(required=False)
    booker_name = serializers.CharField()
    booker_email = serializers.EmailField()
    booker_company = serializers.CharField()
    time_slot = serializers.ChoiceField(choices=DemoBooking.TIME_SLOT_CHOICES)
    scheduled_date = serializers.DateField()
    notes = serializers.CharField(required=False, allow_blank=True)


class DemoConfirmSerializer(serializers.Serializer):
    meeting_link = serializers.CharField(required=False, allow_blank=True)
    google_event_id = serializers.CharField(required=False, allow_blank=True)
