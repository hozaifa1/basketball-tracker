from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlayerViewSet, PracticeSessionViewSet, PaymentViewSet, AuthView

router = DefaultRouter()
router.register(r'players', PlayerViewSet)
router.register(r'sessions', PracticeSessionViewSet)
router.register(r'payments', PaymentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/', AuthView.as_view(), name='auth'),
]
