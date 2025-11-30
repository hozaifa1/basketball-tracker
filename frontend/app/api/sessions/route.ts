import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get sessions with attendances
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .order('date', { ascending: false });
    
    if (sessionsError) throw sessionsError;
    
    // Get attendances with player info for each session
    const sessionsWithAttendances = await Promise.all(
      (sessions || []).map(async (session) => {
        const { data: attendances, error: attError } = await supabase
          .from('attendances')
          .select(`
            *,
            player:players(*)
          `)
          .eq('session_id', session.id);
        
        if (attError) throw attError;
        
        return {
          ...session,
          attendances: attendances || []
        };
      })
    );
    
    return NextResponse.json(sessionsWithAttendances);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, is_online, attendances } = body;
    
    // Check if session already exists for this date
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('date', date)
      .single();
    
    let sessionId: string;
    
    if (existingSession) {
      // Update existing session
      sessionId = existingSession.id;
      
      await supabase
        .from('sessions')
        .update({ is_online })
        .eq('id', sessionId);
      
      // Delete existing attendances
      await supabase
        .from('attendances')
        .delete()
        .eq('session_id', sessionId);
    } else {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from('sessions')
        .insert([{ date, is_online, is_settled: false }])
        .select()
        .single();
      
      if (sessionError) throw sessionError;
      sessionId = newSession.id;
    }
    
    // Insert attendances
    if (attendances && attendances.length > 0) {
      const attendanceRecords = attendances.map((att: { player_id: string; status: string }) => ({
        session_id: sessionId,
        player_id: att.player_id,
        status: att.status
      }));
      
      const { error: attError } = await supabase
        .from('attendances')
        .insert(attendanceRecords);
      
      if (attError) throw attError;
    }
    
    // Recalculate balances
    await recalculateAllBalances();
    
    // Fetch the complete session with attendances
    const { data: completeSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    const { data: sessionAttendances } = await supabase
      .from('attendances')
      .select(`*, player:players(*)`)
      .eq('session_id', sessionId);
    
    return NextResponse.json({
      ...completeSession,
      attendances: sessionAttendances
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function recalculateAllBalances() {
  // Get all players
  const { data: players } = await supabase.from('players').select('*');
  if (!players) return;
  
  // Initialize balances
  const balances = new Map<string, number>();
  players.forEach(p => balances.set(p.id, 0));
  
  // Find treasurer
  const treasurer = players.find(p => p.role === 'Treasurer');
  
  // Get all sessions with attendances
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
    
    // Treasurer salary when session is settled
    if (treasurer && session.is_settled) {
      balances.set(treasurer.id, (balances.get(treasurer.id) || 0) + 20);
    }
    
    // Group attendances by group_id
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
    
    // Process each group
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
  
  // Add payments
  const { data: payments } = await supabase.from('payments').select('*');
  if (payments) {
    for (const payment of payments) {
      balances.set(payment.player_id, (balances.get(payment.player_id) || 0) + payment.amount);
    }
  }
  
  // Update all player balances
  for (const [playerId, balance] of balances) {
    await supabase
      .from('players')
      .update({ balance })
      .eq('id', playerId);
  }
}
