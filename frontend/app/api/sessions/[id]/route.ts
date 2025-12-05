import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (sessionError) throw sessionError;
    
    const { data: attendances, error: attError } = await supabase
      .from('attendances')
      .select(`*, player:players(*)`)
      .eq('session_id', id);
    
    if (attError) throw attError;
    
    return NextResponse.json({
      ...session,
      attendances: attendances || []
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { date, is_online, attendances } = body;
    
    // Update session
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({ date, is_online })
      .eq('id', id);
    
    if (sessionError) throw sessionError;
    
    // Update attendances if provided
    if (attendances) {
      // Delete existing
      await supabase
        .from('attendances')
        .delete()
        .eq('session_id', id);
      
      // Insert new
      const attendanceRecords = attendances.map((att: { player_id: string; status: string }) => ({
        session_id: id,
        player_id: att.player_id,
        status: att.status
      }));
      
      await supabase
        .from('attendances')
        .insert(attendanceRecords);
    }
    
    // Recalculate balances
    await recalculateAllBalances();
    
    // Fetch updated session
    const { data: updatedSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    const { data: updatedAttendances } = await supabase
      .from('attendances')
      .select(`*, player:players(*)`)
      .eq('session_id', id);
    
    return NextResponse.json({
      ...updatedSession,
      attendances: updatedAttendances
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete attendances first
    await supabase
      .from('attendances')
      .delete()
      .eq('session_id', id);
    
    // Delete session
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Recalculate balances
    await recalculateAllBalances();
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
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
    
    for (const groupAtts of groupAttendances.values()) {
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
    if (treasurer) {
      for (const payment of payments) {
        const playerId = payment.player_id as string;
        const amount = Number(payment.amount) || 0;
        balances.set(playerId, (balances.get(playerId) || 0) + amount);
        balances.set(treasurer.id, (balances.get(treasurer.id) || 0) - amount);
      }
    } else {
      for (const payment of payments) {
        const playerId = payment.player_id as string;
        const amount = Number(payment.amount) || 0;
        balances.set(playerId, (balances.get(playerId) || 0) + amount);
      }
    }
  }
  
  for (const [playerId, balance] of balances) {
    await supabase
      .from('players')
      .update({ balance })
      .eq('id', playerId);
  }
}
