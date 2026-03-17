from rest_framework import serializers
from .models import EmailLog, EmailTemplate, EmailConfig


class EmailLogSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = EmailLog
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class EmailConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailConfig
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class TestEmailSerializer(serializers.Serializer):
    to_email = serializers.EmailField()


class SendDemoInviteSerializer(serializers.Serializer):
    company_id = serializers.UUIDField()
