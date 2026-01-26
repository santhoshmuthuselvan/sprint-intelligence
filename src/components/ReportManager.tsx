import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Trash2, AlertTriangle, Database, CheckCircle2, RefreshCcw, Search, ArrowLeft, Edit3, X, Zap, User, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SprintItem } from '../types';

interface UploadBatch {
    team: string;
    week: string;
    count: number;
    lastUpdated: string;
}

export const ReportManager: React.FC = () => {
    const [batches, setBatches] = useState<UploadBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null); // team-week string or item_id

    // Drill-down State
    const [selectedBatch, setSelectedBatch] = useState<UploadBatch | null>(null);
    const [batchItems, setBatchItems] = useState<SprintItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    // Edit Modal State
    const [editingItem, setEditingItem] = useState<SprintItem | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sprint_items')
                .select('team_name, week_name, uploaded_at');

            if (error) throw error;

            const batchMap: Record<string, UploadBatch> = {};
            (data || []).forEach(item => {
                const key = `${item.team_name}|${item.week_name}`;
                if (!batchMap[key]) {
                    batchMap[key] = {
                        team: item.team_name,
                        week: item.week_name,
                        count: 0,
                        lastUpdated: item.uploaded_at
                    };
                }
                batchMap[key].count++;
                if (new Date(item.uploaded_at) > new Date(batchMap[key].lastUpdated)) {
                    batchMap[key].lastUpdated = item.uploaded_at;
                }
            });

            setBatches(Object.values(batchMap).sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()));
        } catch (err) {
            console.error('Error fetching batches:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBatchItems = async (batch: UploadBatch) => {
        setLoadingItems(true);
        try {
            const { data, error } = await supabase
                .from('sprint_items')
                .select('*')
                .match({ team_name: batch.team, week_name: batch.week });

            if (error) throw error;
            setBatchItems(data || []);
            setSelectedBatch(batch);
        } catch (err) {
            console.error('Error fetching batch items:', err);
        } finally {
            setLoadingItems(false);
        }
    };

    const handleDeleteBatch = async (team: string, week: string) => {
        const key = `${team}|${week}`;
        setDeleting(key);
        try {
            const { error } = await supabase
                .from('sprint_items')
                .delete()
                .match({ team_name: team, week_name: week });

            if (error) throw error;
            setBatches(prev => prev.filter(b => `${b.team}|${b.week}` !== key));
            if (selectedBatch?.team === team && selectedBatch?.week === week) {
                setSelectedBatch(null);
            }
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete report. Please try again.');
        } finally {
            setDeleting(null);
        }
    };

    const handleDeleteRecord = async (itemId: string) => {
        setDeleting(itemId);
        try {
            const { error } = await supabase
                .from('sprint_items')
                .delete()
                .match({ id: itemId }); // Using UUID primary key

            if (error) throw error;
            setBatchItems(prev => prev.filter(item => item.id !== itemId));

            // Update counts in batches
            setBatches(prev => prev.map(b => {
                if (b.team === selectedBatch?.team && b.week === selectedBatch?.week) {
                    return { ...b, count: b.count - 1 };
                }
                return b;
            }).filter(b => b.count > 0));

        } catch (err) {
            console.error('Delete individual record failed:', err);
        } finally {
            setDeleting(null);
        }
    };

    const handleUpdateRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('sprint_items')
                .update({
                    item_name: editingItem.item_name,
                    status: editingItem.status,
                    priority: editingItem.priority,
                    estimation_points: editingItem.estimation_points,
                    assignee: editingItem.assignee,
                    description: editingItem.description
                })
                .match({ id: editingItem.id });

            if (error) throw error;

            setBatchItems(prev => prev.map(item => item.id === editingItem.id ? editingItem : item));
            setEditingItem(null);
        } catch (err) {
            console.error('Update failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const filteredBatches = batches.filter(b =>
        b.team.toLowerCase().includes(search.toLowerCase()) ||
        b.week.toLowerCase().includes(search.toLowerCase())
    );

    const filteredItems = batchItems.filter(item =>
        item.item_name.toLowerCase().includes(search.toLowerCase()) ||
        item.assignee?.toLowerCase().includes(search.toLowerCase()) ||
        item.item_id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">
            <AnimatePresence mode="wait">
                {!selectedBatch ? (
                    <motion.div
                        key="batch-list"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-8"
                    >
                        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-3">
                                    <Database className="w-8 h-8 text-blue-600" />
                                    Report Management
                                </h1>
                                <p className="text-zinc-500 mt-1">Audit and clean up your sprint data uploads.</p>
                            </div>
                            <button
                                onClick={fetchBatches}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors"
                            >
                                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </header>

                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search by team or week..."
                                className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium shadow-sm"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filteredBatches.map((batch) => (
                                    <motion.div
                                        key={`${batch.team}|${batch.week}`}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
                                        onClick={() => fetchBatchItems(batch)}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                                <CheckCircle2 className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg leading-tight">{batch.team}</h3>
                                                <p className="text-sm text-zinc-500 font-medium">{batch.week}</p>
                                                <div className="mt-3 flex items-center gap-3">
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                                                        {batch.count} Records
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 font-medium">
                                                        {new Date(batch.lastUpdated).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Are you sure you want to delete all ${batch.count} records for ${batch.team} - ${batch.week}?`)) {
                                                        handleDeleteBatch(batch.team, batch.week);
                                                    }
                                                }}
                                                disabled={deleting === `${batch.team}|${batch.week}`}
                                                className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                {deleting === `${batch.team}|${batch.week}` ? (
                                                    <RefreshCcw className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-10 -mt-10" />
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {!loading && filteredBatches.length === 0 && (
                                <div className="col-span-full py-20 text-center">
                                    <AlertTriangle className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-zinc-400">No report batches found</h3>
                                    <p className="text-zinc-500 mt-1">Try a different search or upload a new report.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="item-drilldown"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <button
                            onClick={() => setSelectedBatch(null)}
                            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors font-semibold group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            Back to Batches
                        </button>

                        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">{selectedBatch.team}</h1>
                                <p className="text-zinc-500 flex items-center gap-2 font-medium">
                                    {selectedBatch.week} • {selectedBatch.count} Total Records
                                </p>
                            </div>
                            <div className="relative flex-1 md:max-w-md">
                                <Search className="absolute left-4 top-3 w-4 h-4 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Search by ID, task or assignee..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-sm transition-all"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {loadingItems ? (
                                <div className="py-20 flex justify-center">
                                    <RefreshCcw className="w-10 h-10 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                filteredItems.map(item => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        className="bg-white/80 dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow flex items-center gap-6"
                                    >
                                        <div className="hidden sm:flex flex-col items-center justify-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl min-w-[70px]">
                                            <span className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Points</span>
                                            <span className="text-lg font-black text-blue-600">{item.estimation_points || 0}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                                    {item.item_id}
                                                </span>
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${item.status?.toLowerCase() === 'done' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-lg">{item.item_name}</h3>
                                            <div className="flex flex-wrap gap-4 mt-2 text-xs text-zinc-500 font-medium">
                                                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {item.assignee || 'Unassigned'}</span>
                                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {item.item_type || 'Task'}</span>
                                                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> {item.priority || 'Low'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditingItem(item)}
                                                className="p-2.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                                            >
                                                <Edit3 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Delete record ${item.item_id}?`)) handleDeleteRecord(item.id);
                                                }}
                                                disabled={deleting === item.id}
                                                className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                            >
                                                {deleting === item.id ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
                            onClick={() => setEditingItem(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                        >
                            <form onSubmit={handleUpdateRecord}>
                                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Edit3 className="w-5 h-5 text-blue-500" />
                                        Edit Record {editingItem.item_id}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setEditingItem(null)}
                                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Title</label>
                                            <input
                                                type="text"
                                                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                                value={editingItem.item_name}
                                                onChange={e => setEditingItem({ ...editingItem, item_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Status</label>
                                            <input
                                                type="text"
                                                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                                value={editingItem.status}
                                                onChange={e => setEditingItem({ ...editingItem, status: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Points</label>
                                            <input
                                                type="number"
                                                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                                value={editingItem.estimation_points}
                                                onChange={e => setEditingItem({ ...editingItem, estimation_points: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Priority</label>
                                            <input
                                                type="text"
                                                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                                value={editingItem.priority}
                                                onChange={e => setEditingItem({ ...editingItem, priority: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Assignee</label>
                                            <input
                                                type="text"
                                                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                                                value={editingItem.assignee}
                                                onChange={e => setEditingItem({ ...editingItem, assignee: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-zinc-500 ml-1">Description</label>
                                        <textarea
                                            rows={4}
                                            className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-medium resize-none"
                                            value={editingItem.description}
                                            onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditingItem(null)}
                                        className="flex-1 px-4 py-2.5 text-zinc-500 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        {saving && <RefreshCcw className="w-4 h-4 animate-spin" />}
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

