import React, { useEffect, useState } from 'react';
import { Loader2, FolderOpen, Zap, Layers, TrendingUp, X, Calendar, User, AlertCircle, CheckCircle } from 'lucide-react';
import {
    BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { FilterBar } from './FilterBar';
import { DataTable } from './DataTable';
import { supabase } from '../supabase';

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
    const [workTypeDist, setWorkTypeDist] = useState<any[]>([]);

    // Modal State
    const [selectedItem, setSelectedItem] = useState<RawItem | null>(null);

    useEffect(() => {
        fetchData();
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

        // H. Work Type Dist
        const typeCounts: Record<string, number> = {};
        items.forEach(item => {
            const t = item.type || 'Unknown';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        setWorkTypeDist(Object.entries(typeCounts).map(([name, value]) => ({ name, value })));
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
        <div className="space-y-8 pb-10">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">Analytics Dashboard</h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">Real-time insights on sprint velocity, focus, and delivery.</p>
            </motion.div>

            {/* Filter Bar */}
            <FilterBar
                files={data.rawItems || []}
                filters={filters}
                setFilters={setFilters}
                groupBy={groupBy}
                setGroupBy={setGroupBy}
            />

            {/* KPIS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard title="Total Tasks" value={totalTasks} icon={FolderOpen} color="blue" />
                <KPICard title="Story Points" value={totalPoints} icon={Zap} color="yellow" />
                <KPICard title="Active Sprints" value={new Set(filteredItems.map(i => i.sprint)).size} icon={Layers} color="purple" />
                <KPICard title="Avg Cycle Time" value={`${avgCycleTime} days`} icon={TrendingUp} color="orange" />
            </div>

            {groupBy !== 'none' ? (
                // Grouped View
                <BentoBox title={`Grouped by ${groupBy}`} colSpan="col-span-full">
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={groupedData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} angle={-45} textAnchor="end" interval={0} height={70} />
                                <YAxis stroke="#888888" fontSize={12} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Legend verticalAlign="top" />
                                <Bar dataKey="tasks" fill="#3b82f6" name="Tasks" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="points" fill="#10b981" name="Points" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </BentoBox>
            ) : (
                // Bento Grid Layout
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Status Evolution (Stacked Area) */}
                    <BentoBox title="Workflow Status Evolution" colSpan="lg:col-span-2">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statusAreaChartData}>
                                    <defs>
                                        <linearGradient id="colorStatus" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                                    <YAxis stroke="#888888" fontSize={12} />
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend />
                                    <Area type="monotone" dataKey="Done" stackId="1" stroke="#10b981" fill="#10b981" />
                                    <Area type="monotone" dataKey="In Progress" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                                    <Area type="monotone" dataKey="To Do" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </BentoBox>

                    {/* Sprint Focus (Radar) */}
                    <BentoBox title="Sprint Focus Top 5 (Tags)" colSpan="lg:col-span-1">
                        <div className="h-80 w-full flex justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={tagRadarData}>
                                    <PolarGrid opacity={0.2} />
                                    <PolarAngleAxis dataKey="subject" fontSize={11} stroke="#888888" />
                                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} opacity={0} />
                                    <Radar name="Points" dataKey="fullMark" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </BentoBox>

                    {/* Velocity Trend */}
                    <BentoBox title="Velocity Trend" colSpan="lg:col-span-2">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={velocityTrend}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                                    <YAxis yAxisId="left" stroke="#888888" fontSize={12} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} name="Tasks" />
                                    <Line yAxisId="right" type="monotone" dataKey="points" stroke="#10b981" strokeWidth={3} name="Points" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </BentoBox>

                    {/* Task Distribution */}
                    <BentoBox title="Work Type" colSpan="lg:col-span-1">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={workTypeDist}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {workTypeDist.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </BentoBox>

                    {/* Epic Distribution */}
                    <BentoBox title="Effort by Project" colSpan="lg:col-span-1">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={epicData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={80}
                                        dataKey="value"
                                    >
                                        {epicData.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </BentoBox>

                    {/* Resource Priority Matrix */}
                    <BentoBox title="Resource Risk Matrix (Top 10)" colSpan="lg:col-span-2">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={priorityMatrix} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                                    <YAxis stroke="#888888" fontSize={12} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend />
                                    <Bar dataKey="Critical" stackId="a" fill="#ef4444" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="High" stackId="a" fill="#f97316" />
                                    <Bar dataKey="Medium" stackId="a" fill="#eab308" />
                                    <Bar dataKey="Low" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </BentoBox>
                </div>
            )}

            {/* Data Table */}
            <BentoBox title="Detailed Records" colSpan="col-span-full">
                <DataTable items={filteredItems} onRowClick={setSelectedItem} />
            </BentoBox>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedItem(null)}
                    >
                        <motion.div
                            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
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
                                    <span>Created: {selectedItem.createdOn || 'N/A'}</span>
                                    <span>Completed: {selectedItem.completedOn || 'N/A'}</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Sub Components ---

const BentoBox: React.FC<{ title: string; children: React.ReactNode; colSpan?: string }> = ({ title, children, colSpan = "col-span-1" }) => (
    <motion.div
        className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 ${colSpan}`}
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        viewport={{ once: true }}
    >
        <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-white flex items-center gap-2">
            {title}
        </h3>
        {children}
    </motion.div>
)

const KPICard: React.FC<{ title: string; value: number | string; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => {
    const colors: Record<string, string> = {
        blue: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
        yellow: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
        purple: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
        orange: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
    };
    return (
        <motion.div
            className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center gap-4"
            whileHover={{ y: -5 }}
        >
            <div className={`p-4 rounded-xl ${colors[color] || colors.blue}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white">{value}</h3>
            </div>
        </motion.div>
    )
}

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
)

const tooltipStyle = {
    backgroundColor: '#18181b',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
};
