'use client';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { API_BASE_URL } from '../config';

type Player = {
  id: number;
  name: string;
  role: string;
  group_id: number | null;
  balance: string;
};

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/players/`)
      .then((res) => res.json())
      .then((data) => setPlayers(data))
      .catch((err) => console.error(err));
  }, []);

  // Group players
  const groups: Record<string, Player[]> = {};
  players.forEach((p) => {
    const key = p.group_id ? `Group ${p.group_id}` : 'No Group';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  // Calculate totals
  const totalBalance = players.reduce((sum, p) => sum + parseFloat(p.balance), 0);
  const positiveBalance = players.filter(p => parseFloat(p.balance) > 0).reduce((sum, p) => sum + parseFloat(p.balance), 0);
  const negativeBalance = players.filter(p => parseFloat(p.balance) < 0).reduce((sum, p) => sum + parseFloat(p.balance), 0);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* Hero / Stats Section */}
      <div className="relative bg-gradient-to-b from-gray-900 to-black pt-12 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
             {/* Abstract background elements could go here */}
             <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-orange-600 rounded-full blur-3xl mix-blend-screen opacity-30"></div>
             <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-600 rounded-full blur-3xl mix-blend-screen opacity-20"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 tracking-tighter uppercase mb-4">
            Courtside
          </h1>
          <p className="text-gray-400 text-lg md:text-xl font-light tracking-wide mb-12">
            DU EEE Basketball Team Tracker
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <StatCard label="Total Treasury" value={totalBalance.toFixed(2)} type="neutral" />
            <StatCard label="Total Collected" value={`+${positiveBalance.toFixed(2)}`} type="positive" />
            <StatCard label="Total Due" value={`${negativeBalance.toFixed(2)}`} type="negative" />
          </div>
        </div>
      </div>

      {/* Main Content - Grouped Cards */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 -mt-10 relative z-20">
        {Object.entries(groups).sort().map(([groupName, groupPlayers]) => (
          <div key={groupName} className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white uppercase tracking-wider pl-2 border-l-4 border-orange-500">
                {groupName}
              </h2>
              <div className="h-[1px] bg-gray-800 flex-grow"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {groupPlayers.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>
          </div>
        ))}

        {players.length === 0 && (
            <div className="text-center text-gray-500 py-20">Loading players...</div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, type }: { label: string; value: string; type: 'positive' | 'negative' | 'neutral' }) {
    let colorClass = "text-white";
    if (type === 'positive') colorClass = "text-green-400";
    if (type === 'negative') colorClass = "text-red-400";

    return (
        <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl p-6 shadow-xl hover:border-gray-700 transition-colors">
            <div className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-4xl font-black ${colorClass}`}>{value}</div>
        </div>
    )
}

function PlayerCard({ player }: { player: Player }) {
    const bal = parseFloat(player.balance);
    const isPositive = bal > 0;
    const isNegative = bal < 0;

    return (
        <div className="group relative bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:bg-gray-800/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-orange-500/30">
            {/* Role Badge */}
            <div className="absolute top-4 right-4">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                    ${player.role === 'Leader' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      player.role === 'Treasurer' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                      'bg-gray-700/50 text-gray-400 border border-gray-600'}`}>
                    {player.role}
                </span>
            </div>

            {/* Avatar / Initials */}
            <div className="mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-lg font-bold text-white border border-gray-700 shadow-inner">
                    {player.name.substring(0, 2).toUpperCase()}
                </div>
            </div>

            {/* Name */}
            <h3 className="text-xl font-bold text-white mb-1 truncate">{player.name}</h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-6">
                {player.group_id ? `Member of Group ${player.group_id}` : 'No Group'}
            </p>

            {/* Balance */}
            <div className="flex items-end justify-between border-t border-gray-800 pt-4">
                <div className="text-xs text-gray-500 font-medium">Balance</div>
                <div className={`text-2xl font-black ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400'}`}>
                    {bal.toFixed(2)}
                </div>
            </div>

            {/* Status Indicator */}
            {isNegative && (
                <div className="mt-3 text-[10px] text-red-400 font-semibold flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    Payment Due
                </div>
            )}
             {isPositive && (
                <div className="mt-3 text-[10px] text-green-400 font-semibold flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Credit
                </div>
            )}
            {bal === 0 && (
                 <div className="mt-3 text-[10px] text-gray-600 font-semibold flex items-center justify-end gap-1">
                    Settled
                </div>
            )}
        </div>
    );
}
