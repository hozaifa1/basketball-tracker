'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/config';

type Player = {
  id: number;
  name: string;
  role: string;
  group_id: number | null;
  balance: string;
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);

  // Player Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('Member');
  const [groupId, setGroupId] = useState('');

  // Payment Form State
  const [paymentPlayerId, setPaymentPlayerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('auth') === 'true') {
      setIsAuthenticated(true);
      fetchPlayers();
    }
  }, []);

  const fetchPlayers = () => {
    fetch(`${API_BASE_URL}/players/`)
      .then(res => res.json())
      .then(data => setPlayers(data))
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
        fetchPlayers();
      } else {
        alert('Incorrect password');
      }
    } catch (err) {
      alert('Login failed');
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      role,
      group_id: groupId ? parseInt(groupId) : null,
      balance: "0.00"
    };

    try {
      const res = await fetch(`${API_BASE_URL}/players/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shared-Password': password
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setName('');
        setGroupId('');
        fetchPlayers();
      } else {
        alert('Failed to add player');
      }
    } catch (err) {
      alert('Error adding player');
    }
  };

  const deletePlayer = async (id: number) => {
    if (!confirm('Delete player?')) return;
    try {
      await fetch(`${API_BASE_URL}/players/${id}/`, {
        method: 'DELETE',
        headers: { 'X-Shared-Password': password }
      });
      fetchPlayers();
    } catch (err) {
      alert('Error deleting');
    }
  };

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPlayerId || !paymentAmount) return;

    const payload = {
      player: parseInt(paymentPlayerId),
      amount: parseFloat(paymentAmount),
      notes: paymentNotes
    };

    try {
      const res = await fetch(`${API_BASE_URL}/payments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shared-Password': password
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setPaymentAmount('');
        setPaymentNotes('');
        alert('Payment recorded!');
        fetchPlayers();
      } else {
        alert('Failed to record payment');
      }
    } catch (err) {
      alert('Error recording payment');
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
            Manage Players
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-orange-500 mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Add Player */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Add New Player</h2>
            <form onSubmit={addPlayer} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-orange-500 outline-none flex-grow"
                  required
                />
                <input
                  type="number"
                  placeholder="Group"
                  value={groupId}
                  onChange={e => setGroupId(e.target.value)}
                  className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-orange-500 outline-none w-24"
                />
              </div>
              <div className="flex gap-4">
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-orange-500 outline-none flex-grow"
                >
                  <option value="Member">Member</option>
                  <option value="Leader">Leader</option>
                  <option value="Treasurer">Treasurer</option>
                </select>
                <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded font-bold transition-colors">
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Record Payment */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Record Payment</h2>
            <form onSubmit={addPayment} className="flex flex-col gap-4">
              <select
                value={paymentPlayerId}
                onChange={e => setPaymentPlayerId(e.target.value)}
                className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-orange-500 outline-none"
                required
              >
                <option value="">Select Player...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Bal: {p.balance})</option>
                ))}
              </select>
              <div className="flex gap-4">
                <input
                  type="number"
                  placeholder="Amount"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-orange-500 outline-none flex-grow"
                  required
                  step="0.01"
                />
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold transition-colors">
                  Pay
                </button>
              </div>
              <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-orange-500 outline-none"
                />
            </form>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {players.map(player => (
                <tr key={player.id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {player.group_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {player.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {player.role}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold
                      ${parseFloat(player.balance) > 0 ? 'text-green-400' :
                        parseFloat(player.balance) < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {player.balance}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => deletePlayer(player.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
