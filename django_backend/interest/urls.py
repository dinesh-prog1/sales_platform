from django.urls import path
from . import views

urlpatterns = [
    path('detect/', views.DetectInterestView.as_view()),
    path('mark/', views.MarkInterestView.as_view()),
    path('respond/', views.RespondInterestView.as_view()),
]
