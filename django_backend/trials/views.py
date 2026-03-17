from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Trial
from .serializers import TrialSerializer
from . import services


class TrialListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filters = {
            'status': request.query_params.get('status'),
            'company_id': request.query_params.get('company_id'),
        }
        trials = services.get_trials(filters)
        serializer = TrialSerializer(trials, many=True)
        return Response({'trials': serializer.data, 'total': trials.count()})

    def post(self, request):
        trial = services.create_trial(request.data)
        return Response(TrialSerializer(trial).data, status=status.HTTP_201_CREATED)


class TrialDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        trial = get_object_or_404(Trial, pk=pk)
        return Response(TrialSerializer(trial).data)

    def patch(self, request, pk):
        trial = services.update_trial(str(pk), request.data)
        return Response(TrialSerializer(trial).data)


class TrialStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(services.get_trial_stats())
