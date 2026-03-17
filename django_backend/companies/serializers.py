from rest_framework import serializers
from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class CompanyBulkCreateSerializer(serializers.Serializer):
    companies = serializers.ListField(child=CompanySerializer())


class CompanyStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Company.STATUS_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True)
