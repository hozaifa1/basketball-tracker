'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { API_BASE_URL } from '@/config';
import {
  Lock,
  UserPlus,
  CreditCard,
  Users,
  Trash2,
  AlertCircle,
  Loader2,
  Crown,
  Wallet,
  User,
  Plus,
  DollarSign
} from 'lucide-react';

type Player = {
  id: string;
  name: string;
  role: string;
  group_id: number | null;
  balance: number;
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Player Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('Member');
  const [groupId, setGroupId] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);

  // Payment Form State
  const [paymentPlayerId, setPaymentPlayerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentDirection, setPaymentDirection] = useState<'player_to_treasurer' | 'treasurer_to_player'>('player_to_treasurer');

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
      setPlayers(data);
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
        fetchPlayers();
      } else {
        setLoginError('Incorrect password');
      }
    } catch {
      setLoginError('Connection failed');
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingPlayer(true);
    const payload = {
      name: name.trim(),
      role,
      group_id: groupId ? parseInt(groupId, 10) : null,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/players/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setName('');
        setGroupId('');
        setRole('Member');
        fetchPlayers();
      } else {
        let message = 'Failed to add player';
        try {
          const data = await res.json();
          if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
            message = data.error;
          }
        } catch {}
        alert(message);
      }
    } catch (err) {
      console.error(err);
      alert('Error adding player');
    } finally {
      setAddingPlayer(false);
    }
  };

  const deletePlayer = async (id: string, playerName: string) => {
    if (!confirm(`Delete ${playerName}? This action cannot be undone.`)) return;
    try {
      await fetch(`${API_BASE_URL}/players/${id}/`, { method: 'DELETE' });
      fetchPlayers();
    } catch {
      alert('Error deleting');
    }
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    const current = players.find(p => p.id === id);
    if (!current) return;

    const payload = {
      name: updates.name ?? current.name,
      role: updates.role ?? current.role,
      group_id: updates.group_id !== undefined ? updates.group_id : current.group_id,
      balance: updates.balance ?? current.balance,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/players/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlayers(prev => prev.map(p => (p.id === id ? updated : p)));
      } else {
        alert('Failed to update player');
      }
    } catch {
      alert('Error updating player');
    }
  };

  const handleGroupUpdate = (id: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      updatePlayer(id, { group_id: null });
      return;
    }
    const num = parseInt(trimmed, 10);
    if (!Number.isNaN(num)) {
      updatePlayer(id, { group_id: num });
    }
  };

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPlayerId || !paymentAmount) return;

    setRecordingPayment(true);
    const baseAmount = Math.abs(parseFloat(paymentAmount));
    const signedAmount =
      paymentDirection === 'player_to_treasurer' ? baseAmount : -baseAmount;
    const payload = {
      player_id: paymentPlayerId,
      amount: signedAmount,
      notes: paymentNotes || null,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/payments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setPaymentPlayerId('');
        setPaymentAmount('');
        setPaymentNotes('');
        alert('Payment recorded successfully!');
        fetchPlayers();
      } else {
        alert('Failed to record payment');
      }
    } catch {
      alert('Error recording payment');
    } finally {
      setRecordingPayment(false);
    }
  };
 
  const resolveDue = async (player: Player) => {
    const rawBalance = player.balance as unknown as number | string;
    const numericBalance = typeof rawBalance === 'string' ? parseFloat(rawBalance) : rawBalance;
    if (!numericBalance || numericBalance >= 0) return;
    const amount = Math.abs(numericBalance);
    if (!window.confirm(`Resolve due for ${player.name} by recording a payment of ${amount.toFixed(0)} BDT?`)) {
      return;
    }

    setRecordingPayment(true);
    try {
      const res = await fetch(`${API_BASE_URL}/payments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          amount,
          notes: 'Due resolved from Admin Panel',
        }),
      });
      if (res.ok) {
        alert('Due resolved successfully!');
        fetchPlayers();
      } else {
        let message = 'Failed to resolve due';
        try {
          const data = await res.json();
          if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
            message = data.error;
          }
        } catch {}
        alert(message);
      }
    } catch (err) {
      console.error(err);
      alert('Error resolving due');
    } finally {
      setRecordingPayment(false);
    }
  };

  const resolveCredit = async (player: Player) => {
    const rawBalance = player.balance as unknown as number | string;
    const numericBalance = typeof rawBalance === 'string' ? parseFloat(rawBalance) : rawBalance;
    if (!numericBalance || numericBalance <= 0) return;
    const amount = Math.abs(numericBalance);
    if (!window.confirm(`Resolve credit for ${player.name} by recording a payout of ${amount.toFixed(0)} BDT?`)) {
      return;
    }

    setRecordingPayment(true);
    try {
      const res = await fetch(`${API_BASE_URL}/payments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          amount: -amount,
          notes: 'Credit resolved from Admin Panel',
        }),
      });
      if (res.ok) {
        alert('Credit resolved successfully!');
        fetchPlayers();
      } else {
        let message = 'Failed to resolve credit';
        try {
          const data = await res.json();
          if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
            message = data.error;
          }
        } catch {}
        alert(message);
      }
    } catch (err) {
      console.error(err);
      alert('Error resolving credit');
    } finally {
      setRecordingPayment(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Leader':
        return <Crown className="text-orange-400" size={14} />;
      case 'Treasurer':
        return <Wallet className="text-purple-400" size={14} />;
      default:
        return <User className="text-gray-400" size={14} />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Leader':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Treasurer':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
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
            <h1 className="text-2xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-gray-500 text-sm">Manage players and record payments</p>
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
              Access Admin Panel
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

  // Group players by group_id
  const groupedPlayers: Record<string, Player[]> = {};
  players.forEach(p => {
    const key = p.group_id ? `Group ${p.group_id}` : 'No Group';
    if (!groupedPlayers[key]) groupedPlayers[key] = [];
    groupedPlayers[key].push(p);
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Admin Panel
            </span>
          </h1>
          <p className="text-gray-500">Manage players and record payments</p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Add Player Card */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <UserPlus className="text-orange-500" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Add New Player</h2>
                <p className="text-xs text-gray-500">Register a new team member</p>
              </div>
            </div>

            <form onSubmit={addPlayer} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Player Name</label>
                <input
                  type="text"
                  placeholder="Enter player name..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-gray-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    aria-label="New player role"
                    className="admin-select w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-all"
                  >
                    <option value="Member">Member</option>
                    <option value="Leader">Leader</option>
                    <option value="Treasurer">Treasurer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Group</label>
                  <input
                    type="number"
                    placeholder="Group #"
                    value={groupId}
                    onChange={e => setGroupId(e.target.value)}
                    className="w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-gray-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addingPlayer || !name}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 rounded-xl transition-all"
              >
                {addingPlayer ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Plus size={18} />
                )}
                Add Player
              </button>
            </form>
          </div>

          {/* Record Payment Card */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <CreditCard className="text-green-500" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Record Payment</h2>
                <p className="text-xs text-gray-500">Log a payment from a player</p>
              </div>
            </div>

            <form onSubmit={addPayment} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Select Player</label>
                <select
                  value={paymentPlayerId}
                  onChange={e => setPaymentPlayerId(e.target.value)}
                  aria-label="Select player for payment"
                  className="admin-select w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-all"
                  required
                >
                  <option value="">Choose a player...</option>
                  {players
                    .filter(p => p.balance < 0)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Owes: {Math.abs(p.balance).toFixed(0)} BDT)
                      </option>
                    ))}
                  <optgroup label="All Players">
                    {players.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Balance: {p.balance.toFixed(0)} BDT)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Who paid who?</label>
                <select
                  value={paymentDirection}
                  onChange={e =>
                    setPaymentDirection(
                      e.target.value === 'treasurer_to_player'
                        ? 'treasurer_to_player'
                        : 'player_to_treasurer'
                    )
                  }
                  aria-label="Select payment direction"
                  className="admin-select w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-all"
                  required
                >
                  <option value="player_to_treasurer">Player paid Treasurer</option>
                  <option value="treasurer_to_player">Treasurer paid Player</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount (BDT)</label>
                <input
                  type="number"
                  placeholder="Enter amount..."
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-gray-600"
                  required
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Payment notes..."
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-gray-600"
                />
              </div>

              <button
                type="submit"
                disabled={recordingPayment || !paymentPlayerId || !paymentAmount}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 rounded-xl transition-all"
              >
                {recordingPayment ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <DollarSign size={18} />
                )}
                Record Payment
              </button>
            </form>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="text-orange-500" size={20} />
              <h2 className="text-lg font-semibold text-white">All Players</h2>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-500 text-xs">
                {players.length} total
              </span>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {Object.entries(groupedPlayers)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([groupName, groupPlayers]) => (
                <div key={groupName}>
                  <div className="px-6 py-2 bg-white/[0.02] text-xs text-gray-500 uppercase tracking-wider">
                    {groupName}
                  </div>
                  {groupPlayers.map(player => (
                    <div
                      key={player.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-sm font-bold text-white border border-white/10">
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white">{player.name}</div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span
                              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium border ${getRoleBadge(
                                player.role
                              )}`}
                            >
                              {getRoleIcon(player.role)}
                              {player.role}
                            </span>
                            <span className="text-xs text-gray-500">
                              Group {player.group_id ?? ''}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <select
                              value={player.role}
                              onChange={e => updatePlayer(player.id, { role: e.target.value })}
                              aria-label={`Change role for ${player.name}`}
                              className="admin-select bg-white/5 text-xs border-white/10 px-2 py-1 h-8"
                            >
                              <option value="Member">Member</option>
                              <option value="Leader">Leader</option>
                              <option value="Treasurer">Treasurer</option>
                            </select>
                            <input
                              key={`${player.id}-${player.group_id ?? 'none'}`}
                              type="number"
                              defaultValue={player.group_id ?? ''}
                              onBlur={e => handleGroupUpdate(player.id, e.target.value)}
                              placeholder="Group #"
                              className="w-20 bg-white/5 text-xs text-white border border-white/10 rounded-xl px-2 py-1 focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-gray-600"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Balance</div>
                          <div
                            className={`text-lg font-bold ${
                              player.balance > 0
                                ? 'text-green-400'
                                : player.balance < 0
                                ? 'text-red-400'
                                : 'text-gray-500'
                            }`}
                          >
                            {player.balance >= 0 ? '+' : ''}
                            {player.balance.toFixed(0)}
                          </div>
                          {player.balance < 0 && (
                            <button
                              onClick={() => resolveDue(player)}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-medium hover:bg-green-500/20 transition-all"
                            >
                              <DollarSign size={14} />
                              Resolve Due
                            </button>
                          )}
                          {player.balance > 0 && player.role !== 'Treasurer' && (
                            <button
                              onClick={() => resolveCredit(player)}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium hover:bg-blue-500/20 transition-all"
                            >
                              <DollarSign size={14} />
                              Resolve Credit
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => deletePlayer(player.id, player.name)}
                          aria-label={`Delete ${player.name}`}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>

          {players.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-600 mb-3" size={40} />
              <p className="text-gray-500">No players registered yet</p>
              <p className="text-gray-600 text-sm">Add your first player above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
