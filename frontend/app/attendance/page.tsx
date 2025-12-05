'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/config';
import { 
  Lock, 
  Calendar, 
  Wifi, 
  WifiOff, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  ChevronDown,
  Send,
  Users,
  Loader2
} from 'lucide-react';

type Player = {
  id: string;
  name: string;
  role: string;
  group_id: number | null;
};

const STATUS_OPTIONS = [
  { value: 'On Time', label: 'On Time', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  { value: 'Late', label: 'Late', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  { value: 'Absent Informed', label: 'Absent (Informed)', icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  { value: 'Absent Uninformed', label: 'Absent (Uninformed)', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
];

export default function AttendancePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isOnline, setIsOnline] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('auth') === 'true') {
      setIsAuthenticated(true);
      setPassword(sessionStorage.getItem('pwd') || '');
      fetchPlayers();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/players/`);
      const data = await res.json();
      const activePlayers = (data as Player[]).filter(p => p.role !== 'Treasurer');
      setPlayers(activePlayers);
      const initial: Record<string, string> = {};
      activePlayers.forEach((p: Player) => initial[p.id] = 'On Time');
      setAttendance(initial);
      setLoading(false);
    } catch (err) {
      console.error(err);
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
        fetchPlayers();
      } else {
        setLoginError('Incorrect password. Please try again.');
      }
    } catch {
      setLoginError('Connection failed. Please try again.');
    }
  };

  const handleSubmit = async () => {
    const missing = players.filter(p => !attendance[p.id]);
    if (missing.length > 0) {
      alert(`Please select status for: ${missing.map(p => p.name).join(', ')}`);
      return;
    }

    setSubmitting(true);
    const payload = {
      date,
      is_online: isOnline,
      attendances: Object.entries(attendance).map(([pid, status]) => ({
        player_id: pid,
        status,
      })),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/sessions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert('Attendance logged successfully!');
      } else {
        const err = await res.json();
        alert(`Failed to submit: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const setAllStatus = (status: string) => {
    const updated: Record<string, string> = {};
    players.forEach(p => updated[p.id] = status);
    setAttendance(updated);
  };

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
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
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access Required</h1>
            <p className="text-gray-500 text-sm">Enter the password to log attendance</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
            <div className="mb-4">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-gray-600"
                autoFocus
              />
            </div>
            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
            >
              Unlock
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

  // Group players
  const groups: Record<string, Player[]> = {};
  players.forEach(p => {
    const key = p.group_id ? `Group ${p.group_id}` : 'No Group';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const completedCount = Object.values(attendance).filter(v => v).length;
  const progress = players.length > 0 ? (completedCount / players.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Log Attendance
            </span>
          </h1>
          <p className="text-gray-500">Record attendance for today&apos;s practice session</p>
        </div>

        {/* Session Settings Card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="text-orange-500" size={20} />
            Session Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Picker */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Practice Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>

            {/* Session Type Toggle */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Session Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsOnline(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                    !isOnline 
                      ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <WifiOff size={18} />
                  Offline
                </button>
                <button
                  onClick={() => setIsOnline(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                    isOnline 
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Wifi size={18} />
                  Online
                </button>
              </div>
              {isOnline && (
                <p className="text-xs text-blue-400/70 mt-2">
                  * Uninformed absence fine reduced to 50 BDT
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-sm text-gray-500 mr-2 self-center">Quick set all:</span>
          {STATUS_OPTIONS.map(status => (
            <button
              key={status.value}
              onClick={() => setAllStatus(status.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105 ${status.bg} ${status.color}`}
            >
              {status.label}
            </button>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm text-gray-400">{completedCount}/{players.length} players</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Player Groups */}
        <div className="space-y-6">
          {Object.entries(groups).sort().map(([groupName, groupPlayers]) => (
            <div key={groupName} className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="text-orange-500" size={18} />
                  <h3 className="font-semibold text-white">{groupName}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-500 text-xs">
                    {groupPlayers.length}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-white/5">
                {groupPlayers.map(player => {
                  const currentStatus = getStatusInfo(attendance[player.id]);
                  const isExpanded = expandedPlayer === player.id;
                  const StatusIcon = currentStatus.icon;

                  return (
                    <div key={player.id} className="px-5 py-3">
                      <button
                        onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-sm font-bold text-white border border-white/10">
                            {player.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-white">{player.name}</div>
                            <div className="text-xs text-gray-500">{player.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${currentStatus.bg} ${currentStatus.color}`}>
                            <StatusIcon size={14} />
                            {currentStatus.label}
                          </span>
                          <ChevronDown 
                            className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            size={18} 
                          />
                        </div>
                      </button>

                      {/* Expanded Status Options */}
                      {isExpanded && (
                        <div className="mt-3 grid grid-cols-2 gap-2 pl-13">
                          {STATUS_OPTIONS.map(status => {
                            const Icon = status.icon;
                            const isSelected = attendance[player.id] === status.value;
                            return (
                              <button
                                key={status.value}
                                onClick={() => {
                                  setAttendance({ ...attendance, [player.id]: status.value });
                                  setExpandedPlayer(null);
                                }}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                                  isSelected 
                                    ? `${status.bg} ${status.color}` 
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                              >
                                <Icon size={16} />
                                <span className="text-sm font-medium">{status.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 sticky bottom-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || completedCount < players.length}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Submitting...
              </>
            ) : (
              <>
                <Send size={20} />
                Submit Attendance for {date}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
