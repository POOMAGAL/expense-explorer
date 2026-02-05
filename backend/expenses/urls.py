from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    register, login, BankAccountViewSet, StatementViewSet,
    TransactionViewSet, dashboard_analytics
)

router = DefaultRouter()
router.register(r'bank-accounts', BankAccountViewSet, basename='bank-account')
router.register(r'statements', StatementViewSet, basename='statement')
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('api/analytics/dashboard/', dashboard_analytics, name='dashboard-analytics'),
    path('', include(router.urls)),
]
