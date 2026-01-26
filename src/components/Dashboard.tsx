import React, { useEffect, useState } from 'react';
import { Loader2, FolderOpen, Zap, Layers, TrendingUp, X, Calendar, User, AlertCircle, CheckCircle, Sparkles, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
    BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area,
    RadarChart, Radar, PolarGrid, PolarAngleAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { FilterBar } from './FilterBar';
import { DataTable } from './DataTable';
import { CalendarView } from './CalendarView';
import { supabase } from '../supabase';
import { generateSprintSummary } from '../aiService';

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

interface DashboardData {
    rawItems: RawItem[];
    // Other properties (trends, etc.) are calculated on frontend now,
    // so we can relax this interface or keep it for compatibility if we used the backend response structure.
    // For now we just need rawItems.
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

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

const GradientDefs = () => (
    <defs>
        <linearGradient id="gradTasks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
        </linearGradient>
        <linearGradient id="gradPoints" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.3} />
        </linearGradient>
        <linearGradient id="gradBlockers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#be123c" stopOpacity={0.3} />
        </linearGradient>
        <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
        </linearGradient>
        <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0.6} />
        </linearGradient>
        <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eab308" stopOpacity={1} />
            <stop offset="100%" stopColor="#eab308" stopOpacity={0.6} />
        </linearGradient>
        <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
        </linearGradient>
    </defs>
);


export const Dashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    // Filtering State
    const [filters, setFilters] = useState({
        team: '',
        week: '',
        assignee: '',
        priority: '',
        type: ''
    });
    const [groupBy, setGroupBy] = useState<string>('none');
    const [filteredItems, setFilteredItems] = useState<RawItem[]>([]);
    const [groupedData, setGroupedData] = useState<any[]>([]);

    // Metrics State (Calculated on Frontend)
    const [tagRadarData, setTagRadarData] = useState<any[]>([]);
    const [statusAreaChartData, setStatusAreaChartData] = useState<any[]>([]);
    const [epicData, setEpicData] = useState<any[]>([]);
    const [priorityMatrix, setPriorityMatrix] = useState<any[]>([]);
    const [avgCycleTime, setAvgCycleTime] = useState<number>(0);
    const [velocityTrend, setVelocityTrend] = useState<any[]>([]);
    const [velocityTrendPerc, setVelocityTrendPerc] = useState<number | undefined>(undefined);
    const [taskTrendPerc, setTaskTrendPerc] = useState<number | undefined>(undefined);
    const [workTypeDist, setWorkTypeDist] = useState<any[]>([]);
    const [blockerData, setBlockerData] = useState<any[]>([]);
    const [workloadData, setWorkloadData] = useState<any[]>([]);
    const [taskAgeData, setTaskAgeData] = useState<any[]>([]);

    // AI Summary State
    const [summary, setSummary] = useState<string>('');
    const [generatingSummary, setGeneratingSummary] = useState(false);

    // View State
    const [activeView, setActiveView] = useState<'grid' | 'calendar'>('grid');

    // Modal State
    const [selectedItem, setSelectedItem] = useState<RawItem | null>(null);

    const handleGenerateSummary = async () => {
        setGeneratingSummary(true);
        try {
            const itemsForAI = filteredItems.map(item => ({
                id: item.id,
                item_name: item.name,
                description: item.description,
                team_name: item.team,
                status: item.status,
                priority: item.priority,
                estimation_points: item.points,
                tags: item.tags
            }));

            const result = await generateSprintSummary(itemsForAI);
            setSummary(result);
        } catch (error) {
            console.error("Summary generation failed", error);
        } finally {
            setGeneratingSummary(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Real-time subscription
        const channel = supabase
            .channel('sprint_items_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sprint_items' },
                (payload) => {
                    console.log('Real-time update:', payload);
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (data) {
            applyFiltersAndCalculateMetrics();
        }
    }, [data, filters, groupBy]);

    const fetchData = async () => {
        try {
            const { data: items, error } = await supabase
                .from('sprint_items')
                .select('*');

            if (error) throw error;

            // Map DB columns (snake_case) to Frontend (camelCase)
            const rawItems: RawItem[] = (items || []).map((row: any) => ({
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

            setData({ rawItems });
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
            setLoading(false);
        }
    };

    const applyFiltersAndCalculateMetrics = () => {
        if (!data) return;

        // 1. Apply Filters
        let items = data.rawItems || [];
        if (filters.team) items = items.filter(i => i.team === filters.team);
        if (filters.week) items = items.filter(i => i.week === filters.week);
        if (filters.assignee) items = items.filter(i => i.assignee.includes(filters.assignee));
        if (filters.priority) items = items.filter(i => i.priority === filters.priority);
        if (filters.type) items = items.filter(i => i.type === filters.type);

        setFilteredItems(items);

        // 2. Calculate All Metrics based on FILTERED items

        // A. Grouping
        if (groupBy !== 'none') {
            const groups: Record<string, { name: string; tasks: number; points: number }> = {};
            items.forEach(item => {
                let key = (item as any)[groupBy];
                if (!key) key = 'Unknown';
                if (!groups[key]) groups[key] = { name: key, tasks: 0, points: 0 };
                groups[key].tasks++;
                groups[key].points += (item.points || 0);
            });
            setGroupedData(Object.values(groups).sort((a, b) => b.tasks - a.tasks));
        } else {
            setGroupedData([]);
        }

        // B. Radar Chart (Tags)
        const tagCounts: Record<string, number> = {};
        items.forEach(item => {
            if (item.tags) {
                const tags = item.tags.split(',').map(t => t.trim());
                tags.forEach(tag => {
                    if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + (item.points || 1);
                });
            }
        });
        setTagRadarData(Object.entries(tagCounts)
            .map(([subject, fullMark]) => ({ subject, fullMark }))
            .sort((a, b) => b.fullMark - a.fullMark)
            .slice(0, 6));

        // C. Status Evolution (Stacked Area)
        const weekStatusMap: Record<string, Record<string, number>> = {};
        const weeks = Array.from(new Set(items.map(i => i.week))).sort();
        items.forEach(item => {
            const w = item.week;
            const s = item.status || 'Unknown';
            if (!weekStatusMap[w]) weekStatusMap[w] = {};
            weekStatusMap[w][s] = (weekStatusMap[w][s] || 0) + 1;
        });
        setStatusAreaChartData(weeks.map(week => ({ name: week, ...weekStatusMap[week] })));

        // D. Epic Distribution
        const epicCounts: Record<string, number> = {};
        items.forEach(item => {
            const epic = item.epic || 'No Epic';
            epicCounts[epic] = (epicCounts[epic] || 0) + (item.points || 1);
        });
        setEpicData(Object.entries(epicCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

        // E. Priority Matrix
        const userPriority: Record<string, Record<string, number>> = {};
        items.forEach(item => {
            if (item.assignee) {
                const users = item.assignee.split(',').map(u => u.trim()).filter(u => u.length > 0);
                users.forEach(u => {
                    if (!userPriority[u]) userPriority[u] = { High: 0, Medium: 0, Low: 0, Critical: 0 };
                    const p = item.priority || 'Low';
                    userPriority[u][p] = (userPriority[u][p] || 0) + 1;
                });
            }
        });
        setPriorityMatrix(Object.entries(userPriority).map(([name, priorities]) => ({ name, ...priorities })).slice(0, 10));

        // F. Cycle Time
        let totalDays = 0;
        let count = 0;
        items.forEach(item => {
            if (item.createdOn && item.completedOn) {
                const start = new Date(item.createdOn);
                const end = new Date(item.completedOn);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    totalDays += diffDays;
                    count++;
                }
            }
        });
        setAvgCycleTime(count > 0 ? Math.round((totalDays / count) * 10) / 10 : 0);

        // G. Velocity Trend (Re-calculated from filtered items)
        const trendMap: Record<string, { name: string, tasks: number, points: number }> = {};
        weeks.forEach(w => trendMap[w] = { name: w, tasks: 0, points: 0 });
        items.forEach(item => {
            if (trendMap[item.week]) {
                trendMap[item.week].tasks++;
                trendMap[item.week].points += (item.points || 0);
            }
        });
        setVelocityTrend(Object.values(trendMap));

        // Calculate Trend Percentage (Points and Tasks)
        if (weeks.length >= 2) {
            const lastWeek = weeks[weeks.length - 1];
            const prevWeek = weeks[weeks.length - 2];

            const lastPoints = trendMap[lastWeek].points;
            const prevPoints = trendMap[prevWeek].points || 1; // Avoid divide by zero
            const pPerc = Math.round(((lastPoints - prevPoints) / prevPoints) * 100);
            setVelocityTrendPerc(pPerc);

            const lastTasks = trendMap[lastWeek].tasks;
            const prevTasks = trendMap[prevWeek].tasks || 1;
            const tPerc = Math.round(((lastTasks - prevTasks) / prevTasks) * 100);
            setTaskTrendPerc(tPerc);
        } else {
            setVelocityTrendPerc(undefined);
            setTaskTrendPerc(undefined);
        }

        // H. Work Type Dist
        const typeCounts: Record<string, number> = {};
        items.forEach(item => {
            const t = item.type || 'Unknown';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        setWorkTypeDist(Object.entries(typeCounts).map(([name, value]) => ({ name, value })));

        // I. Blocker Frequency (by Team)
        const blockerCounts: Record<string, number> = {};
        items.forEach(i => {
            if (i.tags?.toLowerCase().includes('blocker') || i.status?.toLowerCase().includes('blocker')) {
                const team = i.team || 'Unknown';
                blockerCounts[team] = (blockerCounts[team] || 0) + 1;
            }
        });
        setBlockerData(Object.entries(blockerCounts).map(([name, count]) => ({ name, count })));

        // J. Team Workload Balance
        const userWorkload: Record<string, { name: string, points: number, tasks: number }> = {};
        items.forEach(item => {
            if (item.assignee) {
                const users = item.assignee.split(',').map(u => u.trim()).filter(u => u.length > 0);
                users.forEach(u => {
                    if (!userWorkload[u]) userWorkload[u] = { name: u, points: 0, tasks: 0 };
                    userWorkload[u].points += (item.points || 0);
                    userWorkload[u].tasks++;
                });
            }
        });
        setWorkloadData(Object.values(userWorkload).sort((a, b) => b.points - a.points).slice(0, 10));

        // K. Age of In-Progress Tasks
        const ageBuckets: Record<string, number> = { '1-3 Days': 0, '4-7 Days': 0, '8-14 Days': 0, '15+ Days': 0 };
        const now = new Date();
        items.forEach(item => {
            if (item.status?.toLowerCase().includes('progress') && item.createdOn) {
                const created = new Date(item.createdOn);
                const diffDays = Math.ceil(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays <= 3) ageBuckets['1-3 Days']++;
                else if (diffDays <= 7) ageBuckets['4-7 Days']++;
                else if (diffDays <= 14) ageBuckets['8-14 Days']++;
                else ageBuckets['15+ Days']++;
            }
        });
        setTaskAgeData(Object.entries(ageBuckets).map(([name, value]) => ({ name, value })));
    };

    if (loading || !data) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const totalTasks = filteredItems.length;
    const totalPoints = filteredItems.reduce((acc, curr) => acc + (curr.points || 0), 0);

    return (
        <motion.div
            className="space-y-8 pb-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">Analytics Dashboard</h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">Real-time insights on sprint velocity, focus, and delivery.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <button
                            onClick={() => setActiveView('grid')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'grid' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setActiveView('calendar')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'calendar' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            Calendar
                        </button>
                    </div>
                    <button
                        onClick={handleGenerateSummary}
                        disabled={generatingSummary}
                        className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-purple-500/20"
                    >
                        {generatingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {generatingSummary ? 'Generating...' : 'AI Executive Summary'}
                    </button>
                </div>
            </motion.div>

            {/* AI Summary Result */}
            <AnimatePresence>
                {summary && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-linear-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border border-violet-100 dark:border-violet-800 rounded-2xl p-6 relative overflow-hidden"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-sm">
                                <Bot className="w-6 h-6 text-violet-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Executive Summary</h3>
                                <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300">
                                    <ReactMarkdown>{summary}</ReactMarkdown>
                                </div>
                            </div>
                            <button onClick={() => setSummary('')} className="text-zinc-400 hover:text-zinc-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filter Bar */}
            <FilterBar
                files={data.rawItems || []}
                filters={filters}
                setFilters={setFilters}
                groupBy={groupBy}
                setGroupBy={setGroupBy}
            />

            {/* KPIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Total Tasks" value={totalTasks} icon={FolderOpen} color="blue" trend={taskTrendPerc} />
                <KPICard title="Story Points" value={totalPoints} icon={Zap} color="yellow" trend={velocityTrendPerc} />
                <KPICard title="Completed Sprints" value={new Set(filteredItems.map(i => i.sprint)).size} icon={Layers} color="purple" />
                <KPICard title="Avg Cycle Time" value={`${avgCycleTime} days`} icon={TrendingUp} color="orange" />
            </div>

            {activeView === 'grid' ? (
                <>
                    {groupBy !== 'none' ? (
                        // Grouped View
                        <BentoBox title={`Grouped by ${groupBy}`} colSpan="col-span-full">
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={groupedData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                        <GradientDefs />
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} angle={-45} textAnchor="end" interval={0} height={70} />
                                        <YAxis stroke="#888888" fontSize={12} />
                                        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} cursor={{ fill: 'transparent' }} />
                                        <Legend verticalAlign="top" />
                                        <Bar dataKey="tasks" fill="url(#gradTasks)" name="Tasks" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="points" fill="url(#gradPoints)" name="Points" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </BentoBox>
                    ) : (
                        // Bento Grid Layout
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Analytics Row */}
                            <BentoBox title="Workflow Status Evolution" colSpan="lg:col-span-2">
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={statusAreaChartData}>
                                            <defs>
                                                <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorInProgress" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorToDo" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                                            <YAxis stroke="#888888" fontSize={12} />
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                                            <Legend />
                                            <Area type="monotone" dataKey="Done" stackId="1" stroke="#10b981" fill="url(#colorDone)" />
                                            <Area type="monotone" dataKey="In Progress" stackId="1" stroke="#3b82f6" fill="url(#colorInProgress)" />
                                            <Area type="monotone" dataKey="To Do" stackId="1" stroke="#f59e0b" fill="url(#colorToDo)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </BentoBox>

                            <BentoBox title="Velocity Trend" colSpan="lg:col-span-1">
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={velocityTrend}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                            <XAxis dataKey="name" stroke="#888888" fontSize={10} angle={-30} textAnchor="end" height={50} />
                                            <YAxis yAxisId="left" stroke="#888888" fontSize={12} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} />
                                            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                                            <Line yAxisId="left" type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={2} name="Tasks" dot={false} />
                                            <Line yAxisId="right" type="monotone" dataKey="points" stroke="#10b981" strokeWidth={2} name="Points" dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </BentoBox>

                            {/* Workload & Capacity Row */}
                            <BentoBox title="Team Workload Balance" colSpan="lg:col-span-2">
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={workloadData} layout="vertical" margin={{ left: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                            <XAxis type="number" stroke="#888888" fontSize={12} />
                                            <YAxis dataKey="name" type="category" stroke="#888888" fontSize={11} width={80} />
                                            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                                            <Bar dataKey="points" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Story Points" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </BentoBox>

                            <BentoBox title="In-Progress Task Aging" colSpan="lg:col-span-1">
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={taskAgeData}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                            <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                                            <YAxis stroke="#888888" fontSize={12} />
                                            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                                            <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Count" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </BentoBox>

                            {/* Breakdown Row */}
                            <BentoBox title="Work Type Dist." colSpan="lg:col-span-1">
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={workTypeDist} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {workTypeDist.map((_: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                                            <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </BentoBox>

                            <BentoBox title="Effort by Project" colSpan="lg:col-span-1">
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={epicData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                                                {epicData.map((_: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                                            <Legend
                                                verticalAlign="bottom"
                                                align="center"
                                                iconType="circle"
                                                wrapperStyle={{
                                                    fontSize: '9px',
                                                    paddingTop: '20px',
                                                    lineHeight: '1.2'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </BentoBox>

                            <BentoBox title="Sprint Focus Radar" colSpan="lg:col-span-1">
                                <div className="h-72 w-full flex justify-center">
                                    {tagRadarData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={tagRadarData}>
                                                <PolarGrid stroke="#888888" opacity={0.2} />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888888', fontSize: 10 }} />
                                                <Radar name="Points" dataKey="fullMark" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                                                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
                                            <Sparkles className="w-8 h-8 opacity-20" />
                                            <p className="text-xs italic text-center px-6">Add tags for focus radar</p>
                                        </div>
                                    )}
                                </div>
                            </BentoBox>

                            <BentoBox title="Resource Risk Matrix" colSpan="col-span-full">
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={priorityMatrix} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                            <XAxis dataKey="name" stroke="#888888" fontSize={11} interval={0} tickFormatter={(val) => val.split(' ')[0]} />
                                            <YAxis stroke="#888888" fontSize={12} />
                                            <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                                            <Legend verticalAlign="top" />
                                            <Bar dataKey="Critical" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="High" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="Medium" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="Low" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </BentoBox>

                            {/* Blocker Frequency - Only show if data exists */}
                            {blockerData.length > 0 && (
                                <BentoBox title="Blockers by Team" colSpan="lg:col-span-1">
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={blockerData}>
                                                <GradientDefs />
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                                                <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
                                                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} cursor={{ fill: 'transparent' }} />
                                                <Bar dataKey="count" fill="url(#gradBlockers)" radius={[4, 4, 0, 0]} name="Blockers" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </BentoBox>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <CalendarView items={filteredItems} onRowClick={setSelectedItem} />
            )}

            {/* Data Table */}
            <BentoBox title="Detailed Records" colSpan="col-span-full">
                <DataTable items={filteredItems} onRowClick={setSelectedItem} />
            </BentoBox>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                        />
                        <motion.div
                            className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-md uppercase ${selectedItem.type === 'Bug' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {selectedItem.type}
                                        </span>
                                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{selectedItem.id}</h2>
                                    </div>
                                    <h3 className="mt-2 text-lg text-zinc-800 dark:text-zinc-200 font-medium">{selectedItem.name}</h3>
                                </div>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailItem icon={User} label="Assignee" value={selectedItem.assignee} />
                                    <DetailItem icon={AlertCircle} label="Priority" value={selectedItem.priority}
                                        color={selectedItem.priority === 'High' || selectedItem.priority === 'Critical' ? 'text-red-600' : 'text-zinc-700'} />
                                    <DetailItem icon={CheckCircle} label="Status" value={selectedItem.status} />
                                    <DetailItem icon={Zap} label="Points" value={selectedItem.points} />
                                    <DetailItem icon={Layers} label="Sprint" value={selectedItem.sprint} />
                                    <DetailItem icon={Calendar} label="Week" value={selectedItem.week} />
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Description</h4>
                                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
                                        {selectedItem.description}
                                    </p>
                                </div>

                                <div className="flex gap-4 text-sm text-zinc-500">
                                    <span>Created: {selectedItem.createdOn ? new Date(selectedItem.createdOn).toLocaleDateString() : 'N/A'}</span>
                                    <span>Completed: {selectedItem.completedOn ? new Date(selectedItem.completedOn).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// --- Sub Components ---

const BentoBox: React.FC<{ title: string; children: React.ReactNode; colSpan?: string }> = ({ title, children, colSpan = "col-span-1" }) => (
    <motion.div
        className={`bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/20 dark:border-white/5 ${colSpan} hover:shadow-2xl transition-all duration-300 ring-1 ring-black/5 dark:ring-white/10 relative hover:z-50`}
        variants={itemVariants}
    >
        <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            {title}
        </h3>
        {children}
    </motion.div>
);

const KPICard: React.FC<{ title: string; value: number | string; icon: React.ElementType; color: string; trend?: number }> = ({ title, value, icon: Icon, color, trend }) => {
    const gradients: Record<string, string> = {
        blue: 'from-blue-500 to-indigo-500',
        yellow: 'from-amber-400 to-orange-500',
        purple: 'from-violet-500 to-fuchsia-500',
        orange: 'from-orange-500 to-red-500',
    };

    return (
        <motion.div
            className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/20 dark:border-white/5 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
            variants={itemVariants}
        >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-linear-to-br ${gradients[color]} opacity-10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:opacity-20 transition-opacity`} />
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl bg-linear-to-br ${gradients[color]} text-white shadow-lg`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
                        <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</h3>
                    </div>
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${trend >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                        {trend > 0 ? '+' : ''}{trend}%
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const DetailItem: React.FC<{ icon: React.ElementType, label: string, value: string | number, color?: string }> = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center gap-3">
        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <Icon className="w-4 h-4 text-zinc-500" />
        </div>
        <div>
            <p className="text-xs text-zinc-400">{label}</p>
            <p className={`font-medium ${color || 'text-zinc-900 dark:text-white'}`}>{value || '-'}</p>
        </div>
    </div>
);

const tooltipStyle = {
    backgroundColor: '#18181b',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
};
