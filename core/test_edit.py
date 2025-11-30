from django.test import TestCase
from decimal import Decimal
from .models import Player, PracticeSession, Attendance
from .services import calculate_balances

class EditSessionTests(TestCase):
    def setUp(self):
        self.p1 = Player.objects.create(name="P1", role="Member", group_id=1)
        self.session = PracticeSession.objects.create(date="2023-01-01")
        # Initial: On Time (Balance 0)
        Attendance.objects.create(session=self.session, player=self.p1, status='On Time')
        calculate_balances()

    def test_edit_attendance_updates_balance(self):
        # Verify initial
        self.p1.refresh_from_db()
        self.assertEqual(self.p1.balance, Decimal('0.00'))

        # Simulate Update Request (PUT)
        # Change status to Late (-10)
        new_attendances = [{'player_id': self.p1.id, 'status': 'Late'}]

        # Manually invoke logic that view uses (since using APIClient requires full setup,
        # but view logic is simple: delete & recreate)
        self.session.attendances.all().delete()
        for att in new_attendances:
            Attendance.objects.create(session=self.session, player_id=att['player_id'], status=att['status'])

        calculate_balances()

        self.p1.refresh_from_db()
        self.assertEqual(self.p1.balance, Decimal('-10.00'))
