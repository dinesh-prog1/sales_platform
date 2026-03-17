from django.urls import path
from . import views

urlpatterns = [
    path('', views.TrialListCreateView.as_view()),
    path('stats/', views.TrialStatsView.as_view()),
    path('<uuid:pk>/', views.TrialDetailView.as_view()),
]
