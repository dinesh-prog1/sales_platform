from django.urls import path
from . import views

urlpatterns = [
    path('', views.EmailLogListView.as_view()),
    path('templates/', views.EmailTemplateListView.as_view()),
    path('templates/<str:email_type>/', views.EmailTemplateDetailView.as_view()),
    path('config/', views.EmailConfigView.as_view()),
    path('test-smtp/', views.TestSMTPView.as_view()),
    path('send-demo-invite/<uuid:company_id>/', views.SendDemoInviteView.as_view()),
    path('respond-outreach/', views.RespondOutreachView.as_view()),
]
