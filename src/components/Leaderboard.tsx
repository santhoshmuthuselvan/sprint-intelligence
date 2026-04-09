import React, { useEffect, useState } from 'react';
import { supabase, fetchAll } from '../supabase';
import { motion, type Variants } from 'framer-motion';
import { Trophy, Medal, Timer, Zap, CheckCircle2, User, TrendingUp } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { FilterBar } from './FilterBar';

interface LeaderboardStats {
    name: string;
    tasksCompleted: number;
    totalPoints: number;
    avgCycleTime: number;
    bugsFixed: number;
    weeklyActivity: number[]; // Tasks per week for sparkline
    streak: number;
    isCenturyClub: boolean;
    isHeavyHitter: boolean;
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
        }
    }
};

export const Leaderboard: React.FC = () => {
    const [stats, setStats] = useState<LeaderboardStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [allItems, setAllItems] = useState<any[]>([]);
    const [selectedMember, setSelectedMember] = useState<LeaderboardStats | null>(null);

    // Filtering State
    const [filters, setFilters] = useState({
        team: '',
        week: '',
        assignee: '',
        priority: '',
        type: ''
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        if (allItems.length > 0) {
            calculateStats(allItems);
        }
    }, [allItems, filters]);

    const fetchAllData = async () => {
        try {
            const items = await fetchAll(supabase.from('sprint_items').select('*'));

            // Map DB columns (snake_case) to Frontend (camelCase) for consistency with FilterBar
            const mappedItems = (items || []).map((row: any) => ({
                id: row.item_id,
                name: row.item_name,
                team: row.team_name,
                week: row.week_name,
                assignee: row.assignee,
                status: row.status,
                type: row.item_type,
                priority: row.priority,
                points: Number(row.estimation_points) || 0,
                createdOn: row.created_on,
                completedOn: row.completed_on
            }));

            setAllItems(mappedItems);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching leaderboard data:', error);
            setLoading(false);
        }
    };

    const calculateStats = (items: any[]) => {
        // Apply filters
        const filtered = items.filter(item => {
            return (!filters.team || item.team === filters.team) &&
                (!filters.week || item.week === filters.week) &&
                (!filters.assignee || (item.assignee && item.assignee.includes(filters.assignee))) &&
                (!filters.priority || item.priority === filters.priority) &&
                (!filters.type || item.type === filters.type);
        });

        const userMap: Record<string, {
            tasks: number,
            points: number,
            totalDays: number,
            timedTasks: number,
            bugs: number,
            weekly: Record<string, number>
        }> = {};

        // Get unique weeks to build sparkline baseline
        const uniqueWeeks = Array.from(new Set(items.map(i => i.week))).filter(Boolean).sort();
        const last5Weeks = uniqueWeeks.slice(-5);

        filtered.forEach((item: any) => {
            if (!item.assignee) return;

            const assignees = item.assignee.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

            assignees.forEach((user: string) => {
                if (!userMap[user]) {
                    userMap[user] = { tasks: 0, points: 0, totalDays: 0, timedTasks: 0, bugs: 0, weekly: {} };
                    last5Weeks.forEach(w => userMap[user].weekly[w as string] = 0);
                }

                const status = item.status?.toLowerCase() || '';
                if (status === 'done' || status === 'completed' || status === 'released') {
                    userMap[user].tasks += 1;
                    userMap[user].points += (Number(item.points) || 0);

                    // Check if bug
                    if (item.type?.toLowerCase() === 'bug') {
                        userMap[user].bugs += 1;
                    }

                    // Sparkline activity
                    if (userMap[user].weekly[item.week] !== undefined) {
                        userMap[user].weekly[item.week]++;
                    }

                    // Cycle Time
                    if (item.createdOn && item.completedOn) {
                        const start = new Date(item.createdOn);
                        const end = new Date(item.completedOn);
                        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                            const diffTime = Math.abs(end.getTime() - start.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            userMap[user].totalDays += diffDays;
                            userMap[user].timedTasks++;
                        }
                    }
                }
            });
        });

        const calculatedStats: LeaderboardStats[] = Object.entries(userMap).map(([name, data]) => {
            const weeklyActivity = last5Weeks.map(w => data.weekly[w as string] || 0);

            // Calculate current streak (consecutive weeks with activity from the end)
            let streak = 0;
            for (let i = weeklyActivity.length - 1; i >= 0; i--) {
                if (weeklyActivity[i] > 0) streak++;
                else if (streak > 0) break; // Streak ended
            }

            return {
                name,
                tasksCompleted: data.tasks,
                totalPoints: data.points,
                avgCycleTime: data.timedTasks > 0 ? parseFloat((data.totalDays / data.timedTasks).toFixed(1)) : 0,
                bugsFixed: data.bugs,
                weeklyActivity,
                streak,
                isCenturyClub: data.tasks >= 100,
                isHeavyHitter: data.points >= 500
            };
        });

        calculatedStats.sort((a, b) => b.tasksCompleted - a.tasksCompleted || b.totalPoints - a.totalPoints);
        setStats(calculatedStats);
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const topThree = stats.slice(0, 3);
    const rest = stats.slice(3);

    return (
        <motion.div
            className="space-y-8 pb-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-yellow-500 via-orange-500 to-yellow-600 inline-block">
                        Sprint Champions
                    </h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">Recognizing top performers and efficiency.</p>
                </div>

                <div className="w-full md:w-auto">
                    {/* Add a button or toggle if needed, or just leave title area */}
                </div>
            </div>

            <div className="mb-12">
                <FilterBar
                    files={allItems}
                    filters={filters}
                    setFilters={setFilters}
                    hideGroupBy
                />
            </div>

            {/* Podium */}
            <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 mb-16 px-4">
                {/* 2nd Place */}
                {topThree[1] && (
                    <PodiumCard
                        user={topThree[1]}
                        rank={2}
                        color="from-slate-300 to-slate-400"
                        delay={0.2}
                        onClick={() => setSelectedMember(topThree[1])}
                    />
                )}

                {/* 1st Place */}
                {topThree[0] && (
                    <PodiumCard
                        user={topThree[0]}
                        rank={1}
                        color="from-yellow-300 to-yellow-500"
                        delay={0}
                        isWinner
                        onClick={() => setSelectedMember(topThree[0])}
                    />
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                    <PodiumCard
                        user={topThree[2]}
                        rank={3}
                        color="from-orange-300 to-orange-400" // Bronze-ish
                        delay={0.4}
                        onClick={() => setSelectedMember(topThree[2])}
                    />
                )}
            </div>

            {/* List View */}
            <motion.div
                className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/20 dark:border-white/5 ring-1 ring-black/5 dark:ring-white/10"
                variants={itemVariants}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Full Rankings
                    </h3>
                    <div className="flex gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        <span className="flex items-center gap-1"><Medal className="w-3 h-3 text-red-400" /> Bug Squasher</span>
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> Impact Maker</span>
                        <span className="flex items-center gap-1"><Timer className="w-3 h-3 text-blue-400" /> Speedster</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase text-zinc-500 font-semibold tracking-wider">
                                <th className="py-4 pl-4">Rank</th>
                                <th className="py-4">Team Member</th>
                                <th className="py-4 text-center">Achievements</th>
                                <th className="py-4 text-center">Tasks</th>
                                <th className="py-4 text-center">Impact</th>
                                <th className="py-4 text-right pr-4">Avg Speed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                            {rest.map((user, index) => (
                                <tr
                                    key={user.name}
                                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedMember(user)}
                                >
                                    <td className="py-4 pl-4 font-bold text-zinc-400">#{index + 4}</td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-zinc-900 dark:text-zinc-200">{user.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 text-center">
                                        <div className="flex justify-center gap-1">
                                            {user.bugsFixed >= 3 && <span title="Bug Squasher"><Medal className="w-4 h-4 text-red-500" /></span>}
                                            {user.totalPoints >= 20 && <span title="Impact Maker"><Zap className="w-4 h-4 text-yellow-500" /></span>}
                                            {user.avgCycleTime <= 3 && user.avgCycleTime > 0 && <span title="Speedster"><Timer className="w-4 h-4 text-blue-500" /></span>}
                                            {user.streak >= 3 && <span title={`Unstoppable: ${user.streak} week streak!`}><TrendingUp className="w-4 h-4 text-orange-500 animate-pulse" /></span>}
                                            {user.isCenturyClub && <span title="Century Club: 100+ Tasks"><Trophy className="w-4 h-4 text-emerald-500" /></span>}
                                            {user.isHeavyHitter && <span title="Heavy Hitter: 500+ Points"><Trophy className="w-4 h-4 text-indigo-500" /></span>}
                                        </div>
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                            {user.tasksCompleted}
                                        </span>
                                    </td>
                                    <td className="py-4 text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                        {user.totalPoints}
                                    </td>
                                    <td className="py-4 text-right pr-4 text-zinc-600 dark:text-zinc-400 font-medium">
                                        {user.avgCycleTime}d
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedMember && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedMember(null)}>
                        <motion.div
                            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 dark:border-white/5"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-8 pb-0">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                        {selectedMember.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedMember.name}</h2>
                                            <div className="h-6 w-24">
                                                <Sparkline data={selectedMember.weeklyActivity} color="#3b82f6" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-1">
                                            {selectedMember.bugsFixed >= 3 && <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Bug Squasher</span>}
                                            {selectedMember.totalPoints >= 20 && <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Impact Maker</span>}
                                            {selectedMember.avgCycleTime <= 3 && selectedMember.avgCycleTime > 0 && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Speedster</span>}
                                            {selectedMember.streak >= 3 && <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 italic"><TrendingUp className="w-3 h-3" /> {selectedMember.streak} Week Streak</span>}
                                            {selectedMember.isCenturyClub && <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Century Club 💯</span>}
                                            {selectedMember.isHeavyHitter && <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Heavy Hitter 💎</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl text-center">
                                        <div className="text-xs text-zinc-400 uppercase font-bold mb-1">Tasks</div>
                                        <div className="text-2xl font-black text-zinc-900 dark:text-white">{selectedMember.tasksCompleted}</div>
                                    </div>
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl text-center border-x border-zinc-200 dark:border-zinc-800">
                                        <div className="text-xs text-zinc-400 uppercase font-bold mb-1">Points</div>
                                        <div className="text-2xl font-black text-zinc-900 dark:text-white">{selectedMember.totalPoints}</div>
                                    </div>
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl text-center">
                                        <div className="text-xs text-zinc-400 uppercase font-bold mb-1">Avg Days</div>
                                        <div className="text-2xl font-black text-zinc-900 dark:text-white">{selectedMember.avgCycleTime}</div>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-blue-500" />
                                        Activity Momentum
                                    </h4>
                                    <div className="h-32 w-full bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl p-4 flex items-end justify-between gap-1 overflow-hidden relative">
                                        {selectedMember.weeklyActivity.map((count, i) => (
                                            <motion.div
                                                key={i}
                                                className="flex-1 bg-linear-to-t from-blue-500 to-indigo-500 rounded-t-lg"
                                                initial={{ height: 0 }}
                                                animate={{ height: `${(count / Math.max(...selectedMember.weeklyActivity, 1)) * 100}%` }}
                                                transition={{ delay: i * 0.1 }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedMember(null)}
                                className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors uppercase text-xs tracking-widest mt-4"
                            >
                                Close Profile
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// --- Sub Components ---

const Sparkline: React.FC<{ data: number[], color: string }> = ({ data, color }) => {
    const max = Math.max(...data, 1);
    const width = 100;
    const height = 20;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (d / max) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="drop-shadow-[0_0_2px_rgba(59,130,246,0.3)]"
            />
        </svg>
    );
};

const PodiumCard: React.FC<{ user: LeaderboardStats, rank: number, color: string, delay: number, isWinner?: boolean, onClick: () => void }> = ({ user, rank, color, delay, isWinner, onClick }) => (
    <motion.div
        className={`relative flex flex-col items-center bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 dark:border-white/10 p-6 w-full md:w-64 cursor-pointer hover:scale-105 transition-transform duration-300 ${isWinner ? 'md:-mt-12 md:w-72 z-10 ring-4 ring-yellow-400/30' : ''}`}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, type: "spring", stiffness: 100 }}
        onClick={onClick}
    >
        {isWinner && (
            <div className="absolute -top-8 text-yellow-500 drop-shadow-lg">
                <Trophy className="w-16 h-16 fill-yellow-400" />
            </div>
        )}
        {!isWinner && (
            <div className={`absolute -top-4 text-zinc-400 drop-shadow-md`}>
                <Medal className={`w-10 h-10 ${rank === 2 ? 'text-slate-400 fill-slate-300' : 'text-orange-400 fill-orange-300'}`} />
            </div>
        )}

        <div className={`mt-8 mb-4 w-20 h-20 rounded-full bg-linear-to-br ${color} flex items-center justify-center shadow-inner`}>
            <span className="text-3xl font-bold text-white drop-shadow-md">{rank}</span>
        </div>

        <h3 className="text-xl font-bold text-zinc-900 dark:text-white text-center mb-1">{user.name.split(' ')[0]}</h3>

        <div className="flex gap-1 mb-4">
            {user.bugsFixed >= 3 && <span title="Bug Squasher"><Medal className="w-4 h-4 text-red-500" /></span>}
            {user.totalPoints >= 20 && <span title="Impact Maker"><Zap className="w-4 h-4 text-yellow-500" /></span>}
            {user.avgCycleTime <= 3 && user.avgCycleTime > 0 && <span title="Speedster"><Timer className="w-4 h-4 text-blue-500" /></span>}
            {user.streak >= 3 && <span title={`Unstoppable: ${user.streak} week streak!`}><TrendingUp className="w-4 h-4 text-orange-500 animate-pulse" /></span>}
        </div>

        <div className="w-full space-y-3">
            <div className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tasks</span>
                </div>
                <span className="font-bold text-zinc-900 dark:text-white">{user.tasksCompleted}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                    <Zap className="w-4 h-4" />
                    <span>Impact</span>
                </div>
                <span className="font-bold text-zinc-900 dark:text-white">{user.totalPoints} pts</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>Speed</span>
                </div>
                <span className="font-bold text-zinc-900 dark:text-white">{user.avgCycleTime}d</span>
            </div>
        </div>
    </motion.div>
);
