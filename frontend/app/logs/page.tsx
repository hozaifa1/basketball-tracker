'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/config';

type Session = {
  id: number;
  date: string;
  is_online: boolean;
  is_settled: boolean;
  attendances: any[];
};

export default function LogsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editAttendances, setEditAttendances] = useState<any[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem('auth') === 'true') {
      setIsAuthenticated(true);
      fetchSessions();
    }
  }, []);

  const fetchSessions = () => {
    fetch(`${API_BASE_URL}/sessions/`)
      .then(res => res.json())
      .then(data => setSessions(data))
      .catch(err => console.error(err));
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
        fetchSessions();
      } else {
        alert('Incorrect password');
      }
    } catch (err) {
      alert('Login failed');
    }
  };

  const deleteSession = async (id: number) => {
    if (!confirm('Are you sure you want to delete this log? This will recalculate all balances.')) return;
    try {
      await fetch(`${API_BASE_URL}/sessions/${id}/`, {
        method: 'DELETE',
        headers: { 'X-Shared-Password': password }
      });
      fetchSessions();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const toggleSettle = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/sessions/${id}/settle/`, {
        method: 'POST',
        headers: { 'X-Shared-Password': password }
      });
      fetchSessions();
    } catch (err) {
      alert('Failed to update status');
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

  const updateAttendanceStatus = (player_id: number, status: string) => {
    setEditAttendances(prev => prev.map(a =>
      a.player === player_id ? { ...a, status } : a
    ));
  };

  const saveEdit = async () => {
    if (editingSessionId === null) return;

    // We need to send the full payload expected by the backend update
    const session = sessions.find(s => s.id === editingSessionId);
    if (!session) return;

    const payload = {
      date: session.date,
      is_online: session.is_online,
      attendances: editAttendances.map(a => ({
        player_id: a.player,
        status: a.status
      }))
    };

    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${editingSessionId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shared-Password': password
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingSessionId(null);
        fetchSessions();
      } else {
        alert('Failed to update session');
      }
    } catch (err) {
      alert('Error updating session');
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
            Unlock Logs
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-orange-500 mb-8">Attendance Logs</h1>

        <div className="space-y-4">
          {sessions.map(session => (
            <div key={session.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{session.date}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${session.is_online ? 'bg-blue-900 text-blue-200' : 'bg-gray-700 text-gray-300'}`}>
                        {session.is_online ? 'Online Session' : 'Offline Session'}
                    </span>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold cursor-pointer select-none ${session.is_settled ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}
                          onClick={() => toggleSettle(session.id)}
                          title="Click to toggle status">
                        {session.is_settled ? '✓ Resolved/Paid' : '⚠ Due/Unsettled'}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {editingSessionId === session.id ? (
                    <>
                      <button
                        onClick={saveEdit}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(session)}
                        className="bg-blue-600/50 hover:bg-blue-600 text-blue-100 px-3 py-1 rounded text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSession(session.id)}
                        className="bg-red-900/50 hover:bg-red-900 text-red-200 px-3 py-1 rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-400">
                  <thead className="bg-gray-800 uppercase">
                    <tr>
                      <th className="px-4 py-2">Player</th>
                      <th className="px-4 py-2">Group</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingSessionId === session.id ? (
                      // Edit Mode Rows
                      editAttendances.map((att: any) => (
                        <tr key={att.player} className="border-b border-gray-800">
                          <td className="px-4 py-2 font-medium text-gray-200">{att.player_name}</td>
                          <td className="px-4 py-2">{att.player_group}</td>
                          <td className="px-4 py-2">
                            <select
                              value={att.status}
                              onChange={(e) => updateAttendanceStatus(att.player, e.target.value)}
                              className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs"
                            >
                              {['On Time', 'Late', 'Absent Informed', 'Absent Uninformed'].map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))
                    ) : (
                      // View Mode Rows
                      session.attendances.map((att: any) => (
                        <tr key={att.id} className="border-b border-gray-800">
                          <td className="px-4 py-2 font-medium text-gray-200">{att.player_name}</td>
                          <td className="px-4 py-2">{att.player_group}</td>
                          <td className={`px-4 py-2
                            ${att.status === 'On Time' ? 'text-green-400' :
                              att.status.includes('Late') ? 'text-yellow-400' :
                              'text-red-400'}`}>
                            {att.status}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-gray-500 text-center">No logs found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
