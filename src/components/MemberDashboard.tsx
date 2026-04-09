import React, { useEffect, useState } from 'react';
import { Loader2, Zap, Layers, TrendingUp, X, Sparkles, Bot, Target } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
    BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { DataTable } from './DataTable';
import { supabase, fetchAll } from '../supabase';
import { generateSprintSummary } from '../aiService';
import { useAuth } from '../context/AuthContext';

interface RawItem {
    id: string;
    name: string;
    description: string;
    team: string;
    week: string;
    sprint: string;
    assignee: string;
    status: string;
    type: string;
    priority: string;
    points: number;
    epic: string;
    tags: string;
    createdOn: string;
    completedOn: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

const tooltipStyle = {
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '12px',
    padding: '12px',
    color: '#fff'
};

export const MemberDashboard: React.FC = () => {
    const { profile } = useAuth();
    const [items, setItems] = useState<RawItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<string>('');
    const [generatingSummary, setGeneratingSummary] = useState(false);

    // Derived Metrics
    const [velocityTrend, setVelocityTrend] = useState<any[]>([]);
    const [statusDist, setStatusDist] = useState<any[]>([]);
    const [avgCycleTime, setAvgCycleTime] = useState(0);

    const fetchData = async () => {
        if (!profile?.full_name) return;

        try {
            const rawData = await fetchAll(
                supabase
                    .from('sprint_items')
                    .select('*')
                    .ilike('assignee', `%${profile.full_name}%`)
            );

            const mappedItems: RawItem[] = (rawData || []).map((row: any) => ({
                id: row.item_id,
                name: row.item_name,
                description: row.description,
                team: row.team_name,
                week: row.week_name,
                sprint: row.sprint,
                assignee: row.assignee,
                status: row.status,
                type: row.item_type,
                priority: row.priority,
                points: Number(row.estimation_points) || 0,
                epic: row.epic,
                tags: row.tags,
                createdOn: row.created_on,
                completedOn: row.completed_on
            }));

            setItems(mappedItems);
            calculateMetrics(mappedItems);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch personal dashboard data', error);
            setLoading(false);
        }
    };

    const calculateMetrics = (data: RawItem[]) => {
        // 1. Velocity Trend
        const weeks = Array.from(new Set(data.map(i => i.week))).sort();
        const trend = weeks.map(w => {
            const weekItems = data.filter(i => i.week === w);
            return {
                name: w,
                points: weekItems.reduce((sum, i) => sum + i.points, 0),
                tasks: weekItems.length
            };
        });
        setVelocityTrend(trend);

        // 2. Status Distribution
        const counts: Record<string, number> = {};
        data.forEach(i => counts[i.status] = (counts[i.status] || 0) + 1);
        setStatusDist(Object.entries(counts).map(([name, value]) => ({ name, value })));

        // 3. Cycle Time
        let totalDays = 0, count = 0;
        data.forEach(i => {
            if (i.createdOn && i.completedOn) {
                const diff = (new Date(i.completedOn).getTime() - new Date(i.createdOn).getTime()) / (1000 * 60 * 60 * 24);
                totalDays += diff;
                count++;
            }
        });
        setAvgCycleTime(count > 0 ? Math.round((totalDays / count) * 10) / 10 : 0);
    };

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('personal_items').on('postgres_changes', { event: '*', schema: 'public', table: 'sprint_items' }, fetchData).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [profile]);

    const handleGenerateSummary = async () => {
        setGeneratingSummary(true);
        try {
            const itemsForAI = items.map(i => ({ item_name: i.name, status: i.status, priority: i.priority, estimation_points: i.points }));
            const result = await generateSprintSummary(itemsForAI as any);
            setSummary(result);
        } catch (error) {
            console.error("Summary failed", error);
        } finally {
            setGeneratingSummary(false);
        }
    };

    if (loading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <motion.div className="space-y-8 pb-10" variants={containerVariants} initial="hidden" animate="visible">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-emerald-600 to-teal-600">My Productivity</h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">Personal contribution and sprint performance metrics for {profile?.full_name}.</p>
                </div>
                <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    className="flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                    {generatingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generatingSummary ? 'Analyzing...' : 'My AI Retro'}
                </button>
            </header>

            <AnimatePresence>
                {summary && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="bg-linear-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-6 relative">
                        <div className="flex items-start gap-4">
                            <Bot className="w-6 h-6 text-emerald-600 mt-1" />
                            <div className="flex-1 prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{summary}</ReactMarkdown></div>
                            <button onClick={() => setSummary('')} className="text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="My Tasks" value={items.length} icon={Target} color="emerald" />
                <KPICard title="My Points" value={items.reduce((sum, i) => sum + i.points, 0)} icon={Zap} color="teal" />
                <KPICard title="Active Sprints" value={new Set(items.map(i => i.sprint)).size} icon={Layers} color="blue" />
                <KPICard title="Contribution Speed" value={`${avgCycleTime}d avg`} icon={TrendingUp} color="orange" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <BentoBox title="My Velocity Over Time" colSpan="lg:col-span-2">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={velocityTrend}>
                                <defs>
                                    <linearGradient id="colorMyVelocity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="name" fontSize={12} stroke="#888" />
                                <YAxis fontSize={12} stroke="#888" />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Area type="monotone" dataKey="points" stroke="#10b981" fillOpacity={1} fill="url(#colorMyVelocity)" name="Story Points" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </BentoBox>

                <BentoBox title="Current Progress">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusDist} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" fontSize={11} stroke="#888" width={80} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Tasks">
                                    {statusDist.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </BentoBox>
            </div>

            <BentoBox title="My Assigned Tasks" colSpan="col-span-full">
                <DataTable items={items} />
            </BentoBox>
        </motion.div>
    );
};

const BentoBox: React.FC<{ title: string; children: React.ReactNode; colSpan?: string }> = ({ title, children, colSpan = "col-span-1" }) => (
    <motion.div className={`bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/20 dark:border-white/5 ${colSpan} ring-1 ring-black/5 dark:ring-white/10`} variants={itemVariants}>
        <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">{title}</h3>
        {children}
    </motion.div>
);

const KPICard: React.FC<{ title: string; value: number | string; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => {
    const palette: Record<string, string> = {
        emerald: 'bg-emerald-500',
        teal: 'bg-teal-500',
        blue: 'bg-blue-500',
        orange: 'bg-orange-500'
    };
    return (
        <motion.div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/20 dark:border-white/5 group transition-all" variants={itemVariants}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-black mt-1 text-zinc-900 dark:text-white">{value}</h3>
                </div>
                <div className={`p-4 rounded-2xl ${palette[color]} bg-opacity-10 dark:bg-opacity-20`}>
                    <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
                </div>
            </div>
        </motion.div>
    );
};
