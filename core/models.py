from django.db import models
from django.db.models import Sum

class Player(models.Model):
    ROLE_CHOICES = [
        ('Member', 'Member'),
        ('Leader', 'Leader'),
        ('Treasurer', 'Treasurer'),
    ]

    name = models.CharField(max_length=100)
    group_id = models.IntegerField(help_text="Group Number", null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Member')
    # Calculated balance field (cached)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.name} ({self.role}) - G{self.group_id}"

class PracticeSession(models.Model):
    date = models.DateField(unique=True)
    is_online = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_settled = models.BooleanField(default=False, help_text="If True, balances for this session are finalized (e.g. Treasurer paid)")

    def __str__(self):
        return f"{self.date} ({'Online' if self.is_online else 'Offline'})"

class Payment(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Positive amount reduces debt (increases balance)")
    date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.player.name} paid {self.amount} on {self.date}"

class Attendance(models.Model):
    STATUS_CHOICES = [
        ('On Time', 'On Time'),
        ('Late', 'Late'),
        ('Absent Informed', 'Absent Informed'),
        ('Absent Uninformed', 'Absent Uninformed'),
    ]

    session = models.ForeignKey(PracticeSession, on_delete=models.CASCADE, related_name='attendances')
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='attendances')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)

    class Meta:
        unique_together = ('session', 'player')

    def __str__(self):
        return f"{self.player.name} - {self.status}"
