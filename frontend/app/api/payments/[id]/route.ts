import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Recalculate balances
    await recalculateAllBalances();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function recalculateAllBalances() {
  const { data: players } = await supabase.from('players').select('*');
  if (!players) return;
  
  const balances = new Map<string, number>();
  players.forEach(p => balances.set(p.id, 0));
  
  const treasurer = players.find(p => p.role === 'Treasurer');
  
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .order('date');
  
  if (!sessions) return;
  
  for (const session of sessions) {
    const { data: attendances } = await supabase
      .from('attendances')
      .select('*')
      .eq('session_id', session.id);
    
    if (!attendances) continue;
    
    if (treasurer && session.is_settled) {
      balances.set(treasurer.id, (balances.get(treasurer.id) || 0) + 20);
    }
    
    const groupAttendances = new Map<number, typeof attendances>();
    
    for (const att of attendances) {
      const player = players.find(p => p.id === att.player_id);
      if (!player) continue;
      
      const groupId = player.group_id;
      if (!groupAttendances.has(groupId)) {
        groupAttendances.set(groupId, []);
      }
      groupAttendances.get(groupId)!.push(att);
    }
    
    for (const [groupId, groupAtts] of groupAttendances) {
      const leaders = groupAtts
        .map(a => players.find(p => p.id === a.player_id))
        .filter(p => p && p.role === 'Leader');
      
      const hasLate = groupAtts.some(a => a.status === 'Late');
      const hasAbsentUninformed = groupAtts.some(a => a.status === 'Absent Uninformed');
      
      if (!hasLate && !hasAbsentUninformed) {
        const nAbsentInformed = groupAtts.filter(a => a.status === 'Absent Informed').length;
        const reward = 30 - (10 * nAbsentInformed);
        
        for (const leader of leaders) {
          if (leader) {
            balances.set(leader.id, (balances.get(leader.id) || 0) + reward);
            if (treasurer) {
              balances.set(treasurer.id, (balances.get(treasurer.id) || 0) - reward);
            }
          }
        }
      } else {
        for (const att of groupAtts) {
          const player = players.find(p => p.id === att.player_id);
          if (!player) continue;
          
          if (att.status === 'Late') {
            if (player.role === 'Leader') {
              balances.set(player.id, (balances.get(player.id) || 0) - 40);
              if (treasurer) {
                balances.set(treasurer.id, (balances.get(treasurer.id) || 0) + 40);
              }
            } else {
              balances.set(player.id, (balances.get(player.id) || 0) - 10);
              if (treasurer) {
                balances.set(treasurer.id, (balances.get(treasurer.id) || 0) + 10);
              }
            }
          } else if (att.status === 'Absent Uninformed') {
            const fine = session.is_online ? 50 : 100;
            
            if (player.role === 'Leader') {
              balances.set(player.id, (balances.get(player.id) || 0) - 200);
              if (treasurer) {
                balances.set(treasurer.id, (balances.get(treasurer.id) || 0) + 200);
              }
            } else {
              balances.set(player.id, (balances.get(player.id) || 0) - fine);
              if (treasurer) {
                balances.set(treasurer.id, (balances.get(treasurer.id) || 0) + fine);
              }
            }
          }
        }
      }
    }
  }
  
  const { data: payments } = await supabase.from('payments').select('*');
  if (payments) {
    for (const payment of payments) {
      balances.set(payment.player_id, (balances.get(payment.player_id) || 0) + payment.amount);
    }
  }
  
  for (const [playerId, balance] of balances) {
    await supabase
      .from('players')
      .update({ balance })
      .eq('id', playerId);
  }
}
