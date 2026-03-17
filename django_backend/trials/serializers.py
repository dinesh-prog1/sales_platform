from rest_framework import serializers
from .models import Trial


class TrialSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_email = serializers.CharField(source='company.email', read_only=True)
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Trial
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'started_at')

    def get_days_remaining(self, obj):
        if obj.expires_at:
            from django.utils import timezone
            delta = obj.expires_at - timezone.now()
            return max(0, delta.days)
        return None
