import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

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

interface CalendarViewProps {
    items: RawItem[];
    onRowClick: (item: RawItem) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ items, onRowClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);

        const days = [];
        // Pad previous month days
        for (let i = 0; i < startDay; i++) {
            days.push({ day: null, date: null });
        }
        // Current month days
        for (let i = 1; i <= totalDays; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({ day: i, date: dateStr });
        }
        return days;
    }, [currentDate]);

    const tasksByDate = useMemo(() => {
        const map: Record<string, RawItem[]> = {};
        items.forEach(item => {
            if (item.completedOn) {
                const date = item.completedOn.split('T')[0];
                if (!map[date]) map[date] = [];
                map[date].push(item);
            } else if (item.createdOn) {
                const date = item.createdOn.split('T')[0];
                if (!map[date]) map[date] = [];
                map[date].push(item);
            }
        });
        return map;
    }, [items]);

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();

    return (
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/5 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{monthName} {year}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5 text-zinc-500" />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-600 dark:text-zinc-400">
                        Today
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <ChevronRight className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/10">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 grid-rows-5 auto-rows-fr min-h-[600px]">
                {calendarData.map((d, i) => (
                    <div key={i} className={`p-2 border-r border-b border-zinc-200 dark:border-zinc-800 min-h-[120px] ${!d.day ? 'bg-zinc-50/20 dark:bg-zinc-800/5' : ''}`}>
                        {d.day && (
                            <>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-sm font-semibold ${new Date().toISOString().split('T')[0] === d.date
                                        ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full'
                                        : 'text-zinc-500 dark:text-zinc-400 p-1'
                                        }`}>
                                        {d.day}
                                    </span>
                                    {tasksByDate[d.date!]?.length > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-md">
                                            {tasksByDate[d.date!]?.length} items
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                                    {tasksByDate[d.date!]?.slice(0, 4).map(task => (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={() => onRowClick(task)}
                                            className={`px-2 py-1 rounded text-[10px] font-medium truncate cursor-pointer transition-all hover:ring-1 hover:ring-blue-400 shadow-sm ${task.status === 'Done'
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50'
                                                : task.status?.includes('Progress')
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50'
                                                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-700'
                                                }`}
                                        >
                                            <div className="flex items-center gap-1">
                                                {task.priority === 'Critical' && <AlertCircle className="w-2.5 h-2.5 text-red-500" />}
                                                {task.id}
                                            </div>
                                        </motion.div>
                                    ))}
                                    {tasksByDate[d.date!]?.length > 4 && (
                                        <div className="text-[9px] text-zinc-400 text-center font-medium py-1">
                                            + {tasksByDate[d.date!].length - 4} more
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
