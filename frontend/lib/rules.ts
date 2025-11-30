import { Player, Attendance, PracticeSession } from './types';

/**
 * Payment Rules:
 * - Individual late → -10 per player (player pays to leader, leader pays to treasurer)
 * - Leader Late → -40 (leader pays to treasurer)
 * - Everyone in time → +30 (treasurer pays to leader)
 * - Absent uninformed → -100 (online: -50) (player pays to leader, leader pays to treasurer)
 * - n played absent informed → +30 - 10*n (treasurer pays to leader)
 * - Leader uninformed absent → -200 (leader pays to treasurer)
 * - Treasurer salary everyday practice → +20 (when all dues resolved for that session)
 */

interface BalanceAdjustment {
  playerId: string;
  amount: number;
  reason: string;
}

export function calculateSessionBalances(
  session: PracticeSession,
  attendances: Attendance[],
  players: Player[]
): BalanceAdjustment[] {
  const adjustments: BalanceAdjustment[] = [];
  
  // Create player lookup
  const playerMap = new Map(players.map(p => [p.id, p]));
  
  // Find treasurer
  const treasurer = players.find(p => p.role === 'Treasurer');
  
  // Group attendances by group_id
  const groupAttendances = new Map<number, Attendance[]>();
  
  for (const att of attendances) {
    const player = playerMap.get(att.player_id);
    if (!player) continue;
    
    const groupId = player.group_id;
    if (!groupAttendances.has(groupId)) {
      groupAttendances.set(groupId, []);
    }
    groupAttendances.get(groupId)!.push(att);
  }
  
  // Treasurer salary: +20 when session is settled
  if (treasurer && session.is_settled) {
    adjustments.push({
      playerId: treasurer.id,
      amount: 20,
      reason: 'Treasurer salary (session settled)'
    });
  }
  
  // Process each group
  for (const [groupId, groupAtts] of groupAttendances) {
    // Find leader(s) in this group
    const leaders = groupAtts
      .map(a => playerMap.get(a.player_id))
      .filter(p => p && p.role === 'Leader') as Player[];
    
    // Check conditions
    const hasLate = groupAtts.some(a => a.status === 'Late');
    const hasAbsentUninformed = groupAtts.some(a => a.status === 'Absent Uninformed');
    
    if (!hasLate && !hasAbsentUninformed) {
      // Perfect or Absent Informed only scenario
      // n played absent informed → +30 - 10*n (treasurer pays to leader)
      const nAbsentInformed = groupAtts.filter(a => a.status === 'Absent Informed').length;
      const reward = 30 - (10 * nAbsentInformed);
      
      // Leaders receive reward, Treasurer pays
      for (const leader of leaders) {
        adjustments.push({
          playerId: leader.id,
          amount: reward,
          reason: `Group ${groupId} bonus (${nAbsentInformed} absent informed)`
        });
        
        if (treasurer) {
          adjustments.push({
            playerId: treasurer.id,
            amount: -reward,
            reason: `Paid Group ${groupId} leader bonus`
          });
        }
      }
    } else {
      // Penalties apply
      for (const att of groupAtts) {
        const player = playerMap.get(att.player_id);
        if (!player) continue;
        
        if (att.status === 'Late') {
          if (player.role === 'Leader') {
            // Leader Late → -40
            adjustments.push({
              playerId: player.id,
              amount: -40,
              reason: 'Leader late penalty'
            });
            if (treasurer) {
              adjustments.push({
                playerId: treasurer.id,
                amount: 40,
                reason: `Leader ${player.name} late fine received`
              });
            }
          } else {
            // Individual late → -10
            adjustments.push({
              playerId: player.id,
              amount: -10,
              reason: 'Late penalty'
            });
            if (treasurer) {
              adjustments.push({
                playerId: treasurer.id,
                amount: 10,
                reason: `${player.name} late fine received`
              });
            }
          }
        } else if (att.status === 'Absent Uninformed') {
          const fine = session.is_online ? 50 : 100;
          
          if (player.role === 'Leader') {
            // Leader uninformed absent → -200
            adjustments.push({
              playerId: player.id,
              amount: -200,
              reason: 'Leader uninformed absence penalty'
            });
            if (treasurer) {
              adjustments.push({
                playerId: treasurer.id,
                amount: 200,
                reason: `Leader ${player.name} uninformed absence fine received`
              });
            }
          } else {
            // Regular member absent uninformed
            adjustments.push({
              playerId: player.id,
              amount: -fine,
              reason: `Uninformed absence penalty (${session.is_online ? 'online' : 'offline'})`
            });
            if (treasurer) {
              adjustments.push({
                playerId: treasurer.id,
                amount: fine,
                reason: `${player.name} uninformed absence fine received`
              });
            }
          }
        }
      }
    }
  }
  
  return adjustments;
}

export function aggregateBalances(adjustments: BalanceAdjustment[]): Map<string, number> {
  const balances = new Map<string, number>();
  
  for (const adj of adjustments) {
    const current = balances.get(adj.playerId) || 0;
    balances.set(adj.playerId, current + adj.amount);
  }
  
  return balances;
}
