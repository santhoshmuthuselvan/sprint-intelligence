import React from 'react';
import { Filter } from 'lucide-react';

interface FilterBarProps {
    files: any[];
    filters: any;
    setFilters: (filters: any) => void;
    groupBy?: string;
    setGroupBy?: (groupBy: string) => void;
    hideGroupBy?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({ files, filters, setFilters, groupBy, setGroupBy, hideGroupBy }) => {
    // Extract unique options
    const teams = Array.from(new Set(files.map(f => f.team))).filter(Boolean);
    const weeks = Array.from(new Set(files.map(f => f.week))).filter(Boolean);
    const assignees = Array.from(new Set(files.flatMap(f => f.assignee ? f.assignee.split(',').map((s: string) => s.trim()) : []))).filter(Boolean).sort();
    const priorities = Array.from(new Set(files.map(f => f.priority))).filter(Boolean);
    const types = Array.from(new Set(files.map(f => f.type))).filter(Boolean);

    const handleFilterChange = (key: string, value: string) => {
        setFilters({ ...filters, [key]: value });
    };

    const selectClass = "w-full p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-800/50 text-sm text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-hidden transition-all hover:bg-white/80 dark:hover:bg-zinc-800/80 cursor-pointer backdrop-blur-sm";

    return (
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/20 dark:border-white/5 space-y-6 ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-lg">Filters & Grouping</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Filters */}
                <select
                    className={selectClass}
                    value={filters.team || ''}
                    onChange={e => handleFilterChange('team', e.target.value)}
                >
                    <option value="">All Teams</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                    className={selectClass}
                    value={filters.week || ''}
                    onChange={e => handleFilterChange('week', e.target.value)}
                >
                    <option value="">All Weeks</option>
                    {weeks.map(w => <option key={w} value={w}>{w}</option>)}
                </select>

                <select
                    className={selectClass}
                    value={filters.assignee || ''}
                    onChange={e => handleFilterChange('assignee', e.target.value)}
                >
                    <option value="">All Assignees</option>
                    {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                <select
                    className={selectClass}
                    value={filters.priority || ''}
                    onChange={e => handleFilterChange('priority', e.target.value)}
                >
                    <option value="">All Priorities</option>
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                    className={selectClass}
                    value={filters.type || ''}
                    onChange={e => handleFilterChange('type', e.target.value)}
                >
                    <option value="">All Types</option>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {/* Group By */}
                {!hideGroupBy && setGroupBy && (
                    <div className="relative">
                        <label className="absolute -top-2.5 left-3 px-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-900 rounded-sm uppercase tracking-wider z-10 shadow-sm transition-all group-focus-within:text-blue-500">
                            Group By
                        </label>
                        <select
                            className={`${selectClass} border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/20`}
                            value={groupBy}
                            onChange={e => setGroupBy(e.target.value)}
                        >
                            <option value="none">None</option>
                            <option value="assignee">Assignee</option>
                            <option value="priority">Priority</option>
                            <option value="type">Type</option>
                            <option value="status">Status</option>
                            <option value="week">Week</option>
                            <option value="team">Team</option>
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};
