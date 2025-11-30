'use client';

import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { API_BASE_URL } from '../config';
import { TrendingUp, TrendingDown, Wallet, Users, ChevronRight, RefreshCw } from 'lucide-react';

type Player = {
  id: string;
  name: string;
  role: string;
  group_id: number | null;
  balance: number;
};

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/players/`);
      const data = await res.json();

      if (!res.ok) {
        const message = (data && typeof data === 'object' && 'error' in data)
          ? (data.error as string)
          : 'Failed to load players from server.';
        console.error('Error fetching players:', message);
        setError(message);
        setPlayers([]);
        return;
      }

      if (!Array.isArray(data)) {
        console.error('Unexpected /players response shape:', data);
        setError('Unexpected response from server while loading players.');
        setPlayers([]);
        return;
      }

      setError(null);
      setPlayers(data as Player[]);
    } catch (err) {
      console.error(err);
      setError('Unable to reach the server. Please check your Supabase setup or network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPlayers();
  };

  // Group players
  const groups: Record<string, Player[]> = {};
  const safePlayers = Array.isArray(players) ? players : [];
  safePlayers.forEach((p) => {
    const key = p.group_id ? `Group ${p.group_id}` : 'No Group';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  // Calculate totals
  const totalCollected = players
    .filter(p => p.balance > 0)
    .reduce((sum, p) => sum + p.balance, 0);
  const totalDue = players
    .filter(p => p.balance < 0)
    .reduce((sum, p) => sum + Math.abs(p.balance), 0);
  const netBalance = players.reduce((sum, p) => sum + p.balance, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <h1 className="text-xl font-semibold text-red-300 mb-2">Unable to load players</h1>
            <p className="text-sm text-red-200 mb-4">{error}</p>
            <p className="text-xs text-red-200/70">
              Make sure your Supabase tables are created (see <code>supabase-schema.sql</code>) and
              environment variables <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set correctly on Vercel / locally.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-black mb-2">
                <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                  Dashboard
                </span>
              </h1>
              <p className="text-gray-500 text-sm md:text-base">
                DU EEE Basketball Team Budget Tracker
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <StatCard
              icon={<Wallet className="text-blue-400" size={24} />}
              label="Net Balance"
              value={netBalance}
              trend={netBalance >= 0 ? 'up' : 'down'}
              color="blue"
            />
            <StatCard
              icon={<TrendingUp className="text-green-400" size={24} />}
              label="Total Credits"
              value={totalCollected}
              trend="up"
              color="green"
            />
            <StatCard
              icon={<TrendingDown className="text-red-400" size={24} />}
              label="Total Dues"
              value={totalDue}
              trend="down"
              color="red"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Quick Stats */}
        <div className="flex items-center gap-4 mb-8 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <Users className="text-orange-500" size={20} />
          <span className="text-gray-400">
            <span className="text-white font-semibold">{players.length}</span> players across{' '}
            <span className="text-white font-semibold">{Object.keys(groups).length}</span> groups
          </span>
        </div>

        {/* Player Groups */}
        {Object.entries(groups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([groupName, groupPlayers]) => (
            <div key={groupName} className="mb-10">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
                  <h2 className="text-xl font-bold text-white">{groupName}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-500 text-xs">
                    {groupPlayers.length} players
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-white/10 to-transparent flex-grow"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupPlayers.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            </div>
          ))}

        {players.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-600" size={32} />
            </div>
            <p className="text-gray-500">No players found. Add players from the Manage page.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red';
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
    green: 'from-green-500/20 to-green-500/5 border-green-500/20',
    red: 'from-red-500/20 to-red-500/5 border-red-500/20',
  };

  const valueColor = {
    blue: value >= 0 ? 'text-blue-400' : 'text-red-400',
    green: 'text-green-400',
    red: 'text-red-400',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClasses[color]} border p-6 transition-all hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-xl bg-white/5">{icon}</div>
        <ChevronRight className="text-gray-600" size={20} />
      </div>
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-3xl font-black ${valueColor[color]}`}>
        {color === 'red' ? '' : value >= 0 ? '+' : ''}
        {value.toFixed(0)}
        <span className="text-lg text-gray-600 ml-1">BDT</span>
      </div>
    </div>
  );
}

function PlayerCard({ player }: { player: Player }) {
  const bal = player.balance;
  const isPositive = bal > 0;
  const isNegative = bal < 0;

  const roleColors = {
    Leader: 'from-orange-500/20 to-orange-500/5 text-orange-400 border-orange-500/30',
    Treasurer: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/30',
    Member: 'from-gray-500/20 to-gray-500/5 text-gray-400 border-gray-500/30',
  };

  const roleColor = roleColors[player.role as keyof typeof roleColors] || roleColors.Member;

  return (
    <div className="group relative rounded-2xl bg-white/[0.02] border border-white/5 p-5 hover:bg-white/[0.04] hover:border-orange-500/20 transition-all duration-300 card-hover">
      <div className="flex items-start justify-between mb-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-lg font-bold text-white border border-white/10">
          {player.name.substring(0, 2).toUpperCase()}
        </div>

        {/* Role Badge */}
        <span
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r border ${roleColor}`}
        >
          {player.role}
        </span>
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-white mb-1 truncate group-hover:text-orange-400 transition-colors">
        {player.name}
      </h3>
      <p className="text-xs text-gray-600 mb-4">
        {player.group_id ? `Group ${player.group_id}` : 'No Group'}
      </p>

      {/* Balance Section */}
      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Balance</span>
          <div className="flex items-center gap-2">
            {isNegative && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
            {isPositive && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
            <span
              className={`text-xl font-black ${
                isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-500'
              }`}
            >
              {bal >= 0 ? '+' : ''}
              {bal.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="mt-2 text-right">
          {isNegative && (
            <span className="text-[10px] text-red-400/80 font-medium">Payment Due</span>
          )}
          {isPositive && (
            <span className="text-[10px] text-green-400/80 font-medium">Credit Available</span>
          )}
          {bal === 0 && (
            <span className="text-[10px] text-gray-600 font-medium">Settled</span>
          )}
        </div>
      </div>
    </div>
  );
}
