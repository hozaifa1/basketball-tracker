'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/config';

type Player = {
  id: number;
  name: string;
  role: string;
  group_id: number | null;
};

const STATUS_OPTIONS = [
  'On Time',
  'Late',
  'Absent Informed',
  'Absent Uninformed',
];

export default function AttendancePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isOnline, setIsOnline] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session storage for simple auth persistence
    if (sessionStorage.getItem('auth') === 'true') {
      setIsAuthenticated(true);
      fetchPlayers();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/players/`);
      const data = await res.json();
      setPlayers(data);
      // Initialize attendance
      const initial: Record<number, string> = {};
      data.forEach((p: Player) => initial[p.id] = '');
      setAttendance(initial);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
        fetchPlayers();
      } else {
        alert('Incorrect password');
      }
    } catch (err) {
      alert('Login failed');
    }
  };

  const handleSubmit = async () => {
    // Validate
    const missing = players.filter(p => !attendance[p.id]);
    if (missing.length > 0) {
      alert(`Please select status for: ${missing.map(p => p.name).join(', ')}`);
      return;
    }

    const payload = {
      date,
      is_online: isOnline,
      attendances: Object.entries(attendance).map(([pid, status]) => ({
        player_id: parseInt(pid),
        status,
      })),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shared-Password': password
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert('Attendance submitted successfully!');
        // Reset or redirect?
      } else {
        alert('Failed to submit');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <form onSubmit={handleLogin} className="bg-gray-900 p-8 rounded-lg border border-gray-800 w-full max-w-md">
          <h2 className="text-2xl text-orange-500 font-bold mb-6 text-center">Admin Login</h2>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter Password"
            className="w-full bg-gray-800 text-white border border-gray-700 rounded px-4 py-2 mb-4 focus:outline-none focus:border-orange-500"
          />
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors">
            Unlock
          </button>
        </form>
      </div>
    );
  }

  if (loading) return <div className="text-white text-center mt-20">Loading...</div>;

  // Group players
  const groups: Record<string, Player[]> = {};
  players.forEach(p => {
    const key = p.group_id ? `Group ${p.group_id}` : 'No Group';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-orange-500 mb-8">Log Attendance</h1>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOnline}
                  onChange={e => setIsOnline(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-orange-500 rounded border-gray-700 bg-gray-800"
                />
                <span className="text-gray-300 font-medium">Online Session (50% fine for absent)</span>
              </label>
            </div>
          </div>

          <div className="space-y-8">
            {Object.entries(groups).sort().map(([groupName, groupPlayers]) => (
              <div key={groupName} className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-400 mb-4 border-b border-gray-700 pb-2">
                  {groupName}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupPlayers.map(p => (
                    <div key={p.id} className="flex flex-col">
                      <label className="text-sm text-gray-300 mb-1">
                        {p.name} <span className="text-xs text-gray-500">({p.role})</span>
                      </label>
                      <select
                        value={attendance[p.id] || ''}
                        onChange={e => setAttendance({...attendance, [p.id]: e.target.value})}
                        className="bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 text-sm focus:border-orange-500 outline-none"
                      >
                        <option value="">Select status...</option>
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            className="mt-8 w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-[1.01]"
          >
            Submit Attendance
          </button>
        </div>
      </div>
    </div>
  );
}
