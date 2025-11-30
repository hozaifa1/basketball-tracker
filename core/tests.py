from django.test import TestCase
from decimal import Decimal
from .models import Player, PracticeSession, Attendance, Payment
from .services import calculate_balances

class LogicTests(TestCase):
    def setUp(self):
        # Create Players
        self.treasurer = Player.objects.create(name="Akib", role="Treasurer", group_id=0)

        # Group 1
        self.g1_leader = Player.objects.create(name="L1", role="Leader", group_id=1)
        self.g1_m1 = Player.objects.create(name="M1", role="Member", group_id=1)
        self.g1_m2 = Player.objects.create(name="M2", role="Member", group_id=1)

    def test_treasurer_salary(self):
        session = PracticeSession.objects.create(date="2023-01-01", is_online=False)
        calculate_balances()

        self.treasurer.refresh_from_db()
        # +20 salary
        self.assertEqual(self.treasurer.balance, Decimal('20.00'))

    def test_payment_logic(self):
        # Create a debt scenario
        # M1 Late -> -10. Treasurer +10 + 20(salary) = 30.
        session = PracticeSession.objects.create(date="2023-01-01")
        Attendance.objects.create(session=session, player=self.g1_leader, status='On Time')
        Attendance.objects.create(session=session, player=self.g1_m1, status='Late')

        calculate_balances()
        self.g1_m1.refresh_from_db()
        self.assertEqual(self.g1_m1.balance, Decimal('-10.00'))

        # M1 Pays 10
        Payment.objects.create(player=self.g1_m1, amount=Decimal('10.00'))
        calculate_balances()

        self.g1_m1.refresh_from_db()
        # -10 + 10 = 0
        self.assertEqual(self.g1_m1.balance, Decimal('0.00'))

    def test_partial_payment(self):
        # M1 Late -> -10
        session = PracticeSession.objects.create(date="2023-01-01")
        Attendance.objects.create(session=session, player=self.g1_leader, status='On Time')
        Attendance.objects.create(session=session, player=self.g1_m1, status='Late')

        calculate_balances()

        # M1 Pays 5
        Payment.objects.create(player=self.g1_m1, amount=Decimal('5.00'))
        calculate_balances()

        self.g1_m1.refresh_from_db()
        # -10 + 5 = -5
        self.assertEqual(self.g1_m1.balance, Decimal('-5.00'))
