from decimal import Decimal
from .models import Player, PracticeSession, Attendance, Payment
from django.db.models import Count

def calculate_balances():
    """
    Re-calculates balances for ALL players from scratch based on attendance history.
    This ensures consistency.
    """
    # Reset all balances
    players = Player.objects.all()
    player_balances = {p.id: Decimal('0.00') for p in players}

    # We need to map roles and groups
    players_dict = {p.id: p for p in players}
    treasurer = None
    for p in players:
        if p.role == 'Treasurer':
            treasurer = p
            break

    sessions = PracticeSession.objects.all().order_by('date')

    for session in sessions:
        # 1. Treasurer Salary: +20.
        # Requirement: "Treasurer salary everyday practice -> +20"
        # Requirement: "...not attendance logged but the dues resolved"
        # Interpretation: We apply this salary regardless of settlement status to reflect the debt owed TO the Treasurer.
        # Resolution/Payment is handled separately via Payment model.
        if treasurer:
            player_balances[treasurer.id] += Decimal('20.00')

        attendances = session.attendances.all()
        # Group attendances by group_id
        group_attendances = {}

        for att in attendances:
            p = players_dict.get(att.player_id)
            if not p: continue

            gid = p.group_id
            if gid not in group_attendances:
                group_attendances[gid] = []
            group_attendances[gid].append(att)

        # Process each group
        for gid, atts in group_attendances.items():
            # Find leader(s) in this group
            leaders = [att.player for att in atts if att.player.role == 'Leader']
            # If multiple leaders in a group (unlikely but possible), rules usually apply to "The Leader".
            # We will split rewards/fines or apply to all leaders?
            # "individual player will pay to leader".
            # We'll assume one leader per group usually. If multiple, we'll pick the first found or apply to all?
            # Let's apply to ALL leaders in the group equally for now, or just the first.
            # Given the request "Leader Late -> -40", if there are 2 leaders and both late, both pay.
            # "pay to leader" -> If multiple leaders, who gets it?
            # Let's assume split or primary. For simplicity, we'll apply + to all leaders.

            # Helper to adjust balance
            def adjust(player_id, amount):
                player_balances[player_id] += amount

            # Check for Late and Absent Uninformed in the group
            has_late = any(a.status == 'Late' for a in atts)
            has_absent_uninformed = any(a.status == 'Absent Uninformed' for a in atts)

            # Rule: Everyone in time (Group Perfect-ish) OR n played absent informed
            # The user confirmed: "n played absent informed -> +30 - 10*n" logic.
            # My assumption: This applies only if NO Late and NO Absent Uninformed.

            if not has_late and not has_absent_uninformed:
                # Calculate n (Absent Informed)
                n_absent_informed = sum(1 for a in atts if a.status == 'Absent Informed')

                reward = Decimal('30.00') - (Decimal('10.00') * n_absent_informed)

                # Treasurer pays Leader
                # Treasurer loses 'reward', Leader gains 'reward'
                if leaders:
                    for leader in leaders:
                        adjust(leader.id, reward)
                        if treasurer:
                            adjust(treasurer.id, -reward)

            else:
                # Apply Individual Penalties

                for att in atts:
                    p = att.player

                    # Individual Late
                    if att.status == 'Late':
                        # -10 per player.
                        # "individual player will pay to leader and leader will pay to treasurer"
                        # Net: Player -10, Treasurer +10. Leader is pass-through.
                        # EXCEPT if the player IS the leader.
                        # "Leader Late -> -40".
                        if p.role == 'Leader':
                             # Leader Late Rule: -40 to Treasurer
                             adjust(p.id, Decimal('-40.00'))
                             if treasurer:
                                 adjust(treasurer.id, Decimal('40.00'))
                        else:
                            # Regular Member Late
                            adjust(p.id, Decimal('-10.00'))
                            if treasurer:
                                adjust(treasurer.id, Decimal('10.00'))

                    # Absent Uninformed
                    elif att.status == 'Absent Uninformed':
                        # -100 (offline) or -50 (online)
                        fine = Decimal('50.00') if session.is_online else Decimal('100.00')

                        # "individual player will pay to leader and leader will pay to treasurer"
                        # Net: Player -Fine, Treasurer +Fine.
                        # Leader Uninformed Absent -> -200
                        if p.role == 'Leader':
                            # Leader Uninformed Rule: -200
                             adjust(p.id, Decimal('-200.00'))
                             if treasurer:
                                 adjust(treasurer.id, Decimal('200.00'))
                        else:
                            # Regular Member
                            adjust(p.id, -fine)
                            if treasurer:
                                adjust(treasurer.id, fine)

    # Add Payments
    payments = Payment.objects.all()
    for payment in payments:
        if payment.player_id in player_balances:
            # Payment increases balance (reduces debt)
            player_balances[payment.player_id] += payment.amount

    # Save all balances
    for pid, balance in player_balances.items():
        # Update without triggering signals if any
        Player.objects.filter(id=pid).update(balance=balance)
