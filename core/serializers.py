from rest_framework import serializers
from .models import Player, PracticeSession, Attendance, Payment

class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = '__all__'

class AttendanceSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.name', read_only=True)
    player_role = serializers.CharField(source='player.role', read_only=True)
    player_group = serializers.IntegerField(source='player.group_id', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'session', 'player', 'status', 'player_name', 'player_role', 'player_group']

class PracticeSessionSerializer(serializers.ModelSerializer):
    attendances = AttendanceSerializer(many=True, read_only=True)

    class Meta:
        model = PracticeSession
        fields = ['id', 'date', 'is_online', 'created_at', 'attendances', 'is_settled']

class PaymentSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.name', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'player', 'player_name', 'amount', 'date', 'notes']
