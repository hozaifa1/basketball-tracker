import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('group_id')
      .order('name');
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawName = typeof body.name === 'string' ? body.name.trim() : '';
    if (!rawName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let group_id: number | null = null;
    if (body.group_id !== undefined && body.group_id !== null && body.group_id !== '') {
      const parsed = Number(body.group_id);
      if (!Number.isNaN(parsed)) {
        group_id = parsed;
      }
    }

    const rawRole = typeof body.role === 'string' ? body.role : '';
    const role =
      rawRole === 'Leader' || rawRole === 'Treasurer' || rawRole === 'Member'
        ? rawRole
        : 'Member';

    const insertPayload = {
      name: rawName,
      role,
      group_id,
    };

    const { data, error } = await supabase
      .from('players')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      const message = (error as { message?: string }).message || 'Database error while creating player';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error while creating player';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
