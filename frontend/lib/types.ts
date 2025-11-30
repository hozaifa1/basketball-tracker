export type PlayerRole = 'Member' | 'Leader' | 'Treasurer';

export type AttendanceStatus = 'On Time' | 'Late' | 'Absent Informed' | 'Absent Uninformed';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  group_id: number;
  balance: number;
  created_at: string;
}

export interface PracticeSession {
  id: string;
  date: string;
  is_online: boolean;
  is_settled: boolean;
  created_at: string;
}

export interface Attendance {
  id: string;
  session_id: string;
  player_id: string;
  status: AttendanceStatus;
  player?: Player;
}

export interface Payment {
  id: string;
  player_id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  player?: Player;
}

export interface SessionWithAttendances extends PracticeSession {
  attendances: (Attendance & { player: Player })[];
}

export interface PlayerBalance {
  player_id: string;
  player_name: string;
  role: PlayerRole;
  group_id: number;
  amount_due: number; // Negative means player owes money
  amount_owed: number; // Positive means player is owed money
  net_balance: number;
  is_settled: boolean;
}

export const STATUS_OPTIONS: AttendanceStatus[] = [
  'On Time',
  'Late',
  'Absent Informed',
  'Absent Uninformed',
];

export const ROLE_OPTIONS: PlayerRole[] = ['Member', 'Leader', 'Treasurer'];
