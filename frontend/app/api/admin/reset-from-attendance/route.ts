import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const { data: players, error: playersError } = await supabase.from('players').select('*');
    if (playersError) throw playersError;
    if (!players) {
      return NextResponse.json({ error: 'No players found' }, { status: 400 });
    }

    const balances = new Map<string, number>();
    players.forEach(p => balances.set(p.id, 0));

    const treasurer = players.find(p => p.role === 'Treasurer') || null;

    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .order('date');

    if (sessionsError) throw sessionsError;

    if (sessions) {
      for (const session of sessions) {
        const { data: attendances, error: attError } = await supabase
          .from('attendances')
          .select('*')
          .eq('session_id', session.id);

        if (attError) throw attError;
        if (!attendances) continue;

        if (treasurer && session.is_settled) {
          balances.set(treasurer.id, (balances.get(treasurer.id) || 0) + 20);
        }

        const groupAttendances = new Map<number | null, typeof attendances>();

        for (const att of attendances) {
          const player = players.find(p => p.id === att.player_id);
          if (!player) continue;

          const groupId = player.group_id;
          if (!groupAttendances.has(groupId)) {
            groupAttendances.set(groupId, []);
          }
          const list = groupAttendances.get(groupId);
          if (list) {
            list.push(att);
          }
        }

        for (const groupAtts of groupAttendances.values()) {
          const leaders = groupAtts
            .map(a => players.find(p => p.id === a.player_id))
            .filter(p => p && p.role === 'Leader');

          const hasLate = groupAtts.some(a => a.status === 'Late');
          const hasAbsentUninformed = groupAtts.some(a => a.status === 'Absent Uninformed');

          if (!hasLate && !hasAbsentUninformed) {
            const nAbsentInformed = groupAtts.filter(a => a.status === 'Absent Informed').length;
            const reward = 30 - 10 * nAbsentInformed;

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
    }

    for (const [playerId, balance] of balances) {
      const { error: updateError } = await supabase
        .from('players')
        .update({ balance })
        .eq('id', playerId);

      if (updateError) throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
