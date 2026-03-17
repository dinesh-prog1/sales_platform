from django.urls import path
from . import views

urlpatterns = [
    path('', views.DemoListCreateView.as_view()),
    path('book/', views.DemoBookPublicView.as_view()),
    path('slots/', views.DemoSlotsView.as_view()),
    path('<uuid:pk>/', views.DemoDetailView.as_view()),
    path('<uuid:pk>/confirm/', views.DemoConfirmView.as_view()),
]
