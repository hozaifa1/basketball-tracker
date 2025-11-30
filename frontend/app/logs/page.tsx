'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/config';
import { format } from 'date-fns';
import {
  Lock,
  Calendar,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  Edit3,
  Trash2,
  Save,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  History
} from 'lucide-react';

type Attendance = {
  id: string;
  player_id: string;
  status: string;
  player: {
    id: string;
    name: string;
    role: string;
    group_id: number;
  };
};

type Session = {
  id: string;
  date: string;
  is_online: boolean;
  is_settled: boolean;
  attendances: Attendance[];
};

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  'On Time': { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  'Late': { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'Absent Informed': { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  'Absent Uninformed': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function LogsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editAttendances, setEditAttendances] = useState<Attendance[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem('auth') === 'true') {
      setIsAuthenticated(true);
      setPassword(sessionStorage.getItem('pwd') || '');
      fetchSessions();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/`);
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        sessionStorage.setItem('auth', 'true');
        sessionStorage.setItem('pwd', password);
        fetchSessions();
      } else {
        setLoginError('Incorrect password');
      }
    } catch {
      setLoginError('Connection failed');
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Delete this attendance log? This will recalculate all balances.')) return;
    try {
      await fetch(`${API_BASE_URL}/sessions/${id}/`, { method: 'DELETE' });
      fetchSessions();
    } catch {
      alert('Failed to delete');
    }
  };

  const toggleSettle = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/sessions/${id}/settle/`, { method: 'POST' });
      fetchSessions();
    } catch {
      alert('Failed to update');
    }
  };

  const startEdit = (session: Session) => {
    setEditingSessionId(session.id);
    setEditAttendances(JSON.parse(JSON.stringify(session.attendances)));
  };

  const cancelEdit = () => {
    setEditingSessionId(null);
    setEditAttendances([]);
  };

  const updateAttendanceStatus = (playerId: string, status: string) => {
    setEditAttendances(prev =>
      prev.map(a => (a.player_id === playerId ? { ...a, status } : a))
    );
  };

  const saveEdit = async () => {
    if (!editingSessionId) return;
    const session = sessions.find(s => s.id === editingSessionId);
    if (!session) return;

    const payload = {
      date: session.date,
      is_online: session.is_online,
      attendances: editAttendances.map(a => ({
        player_id: a.player_id,
        status: a.status,
      })),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${editingSessionId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingSessionId(null);
        fetchSessions();
      } else {
        alert('Failed to update');
      }
    } catch {
      alert('Error updating session');
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
              <Lock className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">View Attendance History</h1>
            <p className="text-gray-500 text-sm">Enter password to access logs</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-gray-600"
              autoFocus
            />
            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20"
            >
              Unlock History
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="animate-spin text-orange-500" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black mb-2">
              <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                Attendance History
              </span>
            </h1>
            <p className="text-gray-500">View, edit, and manage past attendance logs</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <History className="text-orange-500" size={18} />
            <span className="text-gray-400">{sessions.length} sessions</span>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {sessions.map(session => {
            const isEditing = editingSessionId === session.id;
            const dateObj = new Date(session.date);
            const formattedDate = format(dateObj, 'EEEE, MMMM d, yyyy');

            // Group attendances
            const groupedAttendances: Record<string, Attendance[]> = {};
            const attendanceList = isEditing ? editAttendances : session.attendances;
            attendanceList.forEach(att => {
              const groupKey = att.player?.group_id ? `Group ${att.player.group_id}` : 'No Group';
              if (!groupedAttendances[groupKey]) groupedAttendances[groupKey] = [];
              groupedAttendances[groupKey].push(att);
            });

            return (
              <div
                key={session.id}
                className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden"
              >
                {/* Session Header */}
                <div className="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center border border-orange-500/20">
                      <Calendar className="text-orange-500" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{formattedDate}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                            session.is_online
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                          }`}
                        >
                          {session.is_online ? <Wifi size={12} /> : <WifiOff size={12} />}
                          {session.is_online ? 'Online' : 'Offline'}
                        </span>
                        <button
                          onClick={() => toggleSettle(session.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            session.is_settled
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                          }`}
                        >
                          {session.is_settled ? (
                            <>
                              <CheckCircle size={12} />
                              Settled
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={12} />
                              Unsettled
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all text-sm font-medium"
                        >
                          <Save size={16} />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(session)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all text-sm font-medium"
                        >
                          <Edit3 size={16} />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all text-sm font-medium"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Attendance Grid */}
                <div className="p-4">
                  {Object.entries(groupedAttendances)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([groupName, groupAtts]) => (
                      <div key={groupName} className="mb-4 last:mb-0">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-2">
                          {groupName}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {groupAtts.map(att => {
                            const statusConfig = STATUS_CONFIG[att.status] || STATUS_CONFIG['On Time'];
                            const StatusIcon = statusConfig.icon;

                            return (
                              <div
                                key={att.player_id}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                                    {att.player?.name?.substring(0, 2).toUpperCase() || '??'}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-white">
                                      {att.player?.name || 'Unknown'}
                                    </div>
                                    <div className="text-xs text-gray-500">{att.player?.role}</div>
                                  </div>
                                </div>

                                {isEditing ? (
                                  <select
                                    value={att.status}
                                    onChange={e => updateAttendanceStatus(att.player_id, e.target.value)}
                                    className="bg-white/5 text-white border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-500/50"
                                  >
                                    {Object.keys(STATUS_CONFIG).map(opt => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
                                  >
                                    <StatusIcon size={12} />
                                    {att.status}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}

          {sessions.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <History className="text-gray-600" size={32} />
              </div>
              <p className="text-gray-500">No attendance logs found</p>
              <p className="text-gray-600 text-sm mt-1">Start by logging attendance for a session</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
