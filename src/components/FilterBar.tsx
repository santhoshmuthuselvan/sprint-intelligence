import React from 'react';
import { Filter } from 'lucide-react';

interface FilterBarProps {
    files: any[];
    filters: any;
    setFilters: (filters: any) => void;
    groupBy: string;
    setGroupBy: (groupBy: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ files, filters, setFilters, groupBy, setGroupBy }) => {
    // Extract unique options
    const teams = Array.from(new Set(files.map(f => f.team))).filter(Boolean);
    const weeks = Array.from(new Set(files.map(f => f.week))).filter(Boolean);
    const assignees = Array.from(new Set(files.flatMap(f => f.assignee ? f.assignee.split(',').map((s: string) => s.trim()) : []))).filter(Boolean).sort();
    const priorities = Array.from(new Set(files.map(f => f.priority))).filter(Boolean);
    const types = Array.from(new Set(files.map(f => f.type))).filter(Boolean);

    const handleFilterChange = (key: string, value: string) => {
        setFilters({ ...filters, [key]: value });
    };

    return (
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Filter className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-zinc-900 dark:text-white">Filters & Grouping</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Filters */}
                <select
                    className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 text-sm"
                    value={filters.team || ''}
                    onChange={e => handleFilterChange('team', e.target.value)}
                >
                    <option value="">All Teams</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                    className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 text-sm"
                    value={filters.week || ''}
                    onChange={e => handleFilterChange('week', e.target.value)}
                >
                    <option value="">All Weeks</option>
                    {weeks.map(w => <option key={w} value={w}>{w}</option>)}
                </select>

                <select
                    className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 text-sm"
                    value={filters.assignee || ''}
                    onChange={e => handleFilterChange('assignee', e.target.value)}
                >
                    <option value="">All Assignees</option>
                    {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                <select
                    className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 text-sm"
                    value={filters.priority || ''}
                    onChange={e => handleFilterChange('priority', e.target.value)}
                >
                    <option value="">All Priorities</option>
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                    className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 text-sm"
                    value={filters.type || ''}
                    onChange={e => handleFilterChange('type', e.target.value)}
                >
                    <option value="">All Types</option>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {/* Group By */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-zinc-500 whitespace-nowrap">Group By:</label>
                    <select
                        className="w-full p-2 rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-sm font-medium text-blue-700 dark:text-blue-300"
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
            </div>
        </div>
    );
};
