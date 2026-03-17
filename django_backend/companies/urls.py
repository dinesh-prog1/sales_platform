from django.urls import path
from . import views

urlpatterns = [
    path('', views.CompanyListCreateView.as_view()),
    path('search/', views.CompanySearchView.as_view()),
    path('emails/', views.CompanyEmailSuggestionsView.as_view()),
    path('upload/', views.CompanyUploadExcelView.as_view()),
    path('stats/status/', views.CompanyStatusStatsView.as_view()),
    path('stats/size/', views.CompanySizeStatsView.as_view()),
    path('<uuid:pk>/', views.CompanyDetailView.as_view()),
]
