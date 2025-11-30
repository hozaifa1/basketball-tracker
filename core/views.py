from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import Player, PracticeSession, Attendance, Payment
from .serializers import PlayerSerializer, PracticeSessionSerializer, AttendanceSerializer, PaymentSerializer
from .services import calculate_balances
from .permissions import SharedPasswordPermission
import os

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all().order_by('group_id', 'name')
    serializer_class = PlayerSerializer
    permission_classes = [SharedPasswordPermission]

    @action(detail=False, methods=['POST'])
    def recalculate(self, request):
        calculate_balances()
        return Response({"status": "balances recalculated"})

class PracticeSessionViewSet(viewsets.ModelViewSet):
    queryset = PracticeSession.objects.all().order_by('-date')
    serializer_class = PracticeSessionSerializer
    permission_classes = [SharedPasswordPermission]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Expects: { date, is_online, attendances: [ {player_id, status}, ... ] }
        data = request.data
        date = data.get('date')
        is_online = data.get('is_online', False)
        attendances_data = data.get('attendances', [])

        # Check if session exists
        session, created = PracticeSession.objects.get_or_create(
            date=date,
            defaults={'is_online': is_online}
        )
        if not created:
            # Update is_online if changed
            session.is_online = is_online
            session.save()
            # Clear existing attendance to overwrite
            session.attendances.all().delete()

        for att in attendances_data:
            Attendance.objects.create(
                session=session,
                player_id=att['player_id'],
                status=att['status']
            )

        calculate_balances()

        serializer = self.get_serializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data

        # Update basic fields
        instance.date = data.get('date', instance.date)
        instance.is_online = data.get('is_online', instance.is_online)
        instance.save()

        # Update attendances if provided
        attendances_data = data.get('attendances')
        if attendances_data is not None:
            # Clear existing
            instance.attendances.all().delete()
            # Re-create
            for att in attendances_data:
                Attendance.objects.create(
                    session=instance,
                    player_id=att['player_id'],
                    status=att['status']
                )

        calculate_balances()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        response = super().destroy(request, *args, **kwargs)
        calculate_balances()
        return response

    @action(detail=True, methods=['POST'])
    def settle(self, request, pk=None):
        session = self.get_object()
        session.is_settled = not session.is_settled
        session.save()
        return Response({'status': 'settled' if session.is_settled else 'unsettled', 'is_settled': session.is_settled})

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('-date')
    serializer_class = PaymentSerializer
    permission_classes = [SharedPasswordPermission]

    def perform_create(self, serializer):
        serializer.save()
        calculate_balances()

    def perform_update(self, serializer):
        serializer.save()
        calculate_balances()

    def perform_destroy(self, instance):
        instance.delete()
        calculate_balances()

class AuthView(views.APIView):
    def post(self, request):
        password = request.data.get('password')
        # Hardcoded password as per requirement
        REQUIRED_PASSWORD = "05HozaifaIsTheBest05"
        if password == REQUIRED_PASSWORD:
            return Response({"authenticated": True})
        return Response({"authenticated": False}, status=status.HTTP_401_UNAUTHORIZED)
