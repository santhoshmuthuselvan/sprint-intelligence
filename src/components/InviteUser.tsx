import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Shield, Loader2, CheckCircle, AlertCircle, Clock, Trash2, User as UserIcon } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

interface Invitation {
    id: string;
    email: string;
    full_name: string;
    role: string;
    status: string;
    created_at: string;
    temp_password?: string;
}

export const InviteUser: React.FC = () => {
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('member');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchInvitations();
    }, []);

    const fetchInvitations = async () => {
        setFetching(true);
        try {
            const { data, error } = await supabase
                .from('user_invitations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvitations(data || []);
        } catch (err: any) {
            console.error('Error fetching invitations:', err);
        } finally {
            setFetching(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Call Edge Function to create user and send invite
            const { data, error: functionError } = await supabase.functions.invoke('invite-user', {
                body: {
                    email,
                    fullName,
                    role,
                    invitedBy: user?.id
                }
            });

            if (functionError) throw new Error(functionError.message || 'Failed to invoke invite function');
            if (data?.error) throw new Error(data.error);

            setSuccess(true);
            setEmail('');
            setFullName('');
            setRole('member');
            fetchInvitations();

        } catch (err: any) {
            console.error('Invite error:', err);
            setError(err.message || 'Failed to send invitation');
        } finally {
            setLoading(false);
        }
    };

    const deleteInvitation = async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('user_invitations')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            fetchInvitations();
        } catch (err: any) {
            console.error('Error deleting invitation:', err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-6 bg-white/90 dark:bg-zinc-800/50 backdrop-blur-xl rounded-lg shadow-md ring-1 ring-black/5 dark:ring-white/10">
            <header>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">Team Invitations</h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">Expand your squad. Invite new members to the command center.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invite Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-1 bg-white/90 dark:bg-zinc-900/50 backdrop-blur-xl p-6 rounded-lg shadow-md ring-1 ring-black/5 dark:ring-white/10"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Invite User</h2>
                    </div>

                    <form onSubmit={handleInvite} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Full Name</label>
                            <div className="relative group">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 py-3.5 pl-12 pr-4 rounded-2xl outline-none transition-all dark:text-white"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 py-3.5 pl-12 pr-4 rounded-2xl outline-none transition-all dark:text-white"
                                    placeholder="colleague@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Assigned Role</label>
                            <div className="relative group">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 py-3.5 pl-12 pr-4 rounded-2xl outline-none transition-all dark:text-white appearance-none"
                                >
                                    <option value="member">Member</option>
                                    <option value="manager">Manager</option>
                                    <option value="Owner">Owner</option>
                                </select>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm rounded-xl flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Invitation sent successfully!
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                            {loading ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </form>
                </motion.div>

                {/* Invitations List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2 bg-white/90 dark:bg-zinc-900/50 backdrop-blur-xl p-6 rounded-lg shadow-md ring-1 ring-black/5 dark:ring-white/10 h-full"
                >
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Pending Invitations</h2>

                    {fetching ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                        </div>
                    ) : invitations.length > 0 ? (
                        <div className="space-y-4">
                            {invitations.map((invite) => (
                                <div
                                    key={invite.id}
                                    className="flex items-center justify-between p-4 bg-white/50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 group hover:border-blue-500/30 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                            <Mail className="w-5 h-5 text-zinc-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-zinc-900 dark:text-white">{invite.email}</p>
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                                                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md uppercase tracking-wider">{invite.role}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(invite.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800/50">
                                            Pending
                                        </span>
                                        <button
                                            onClick={() => deleteInvitation(invite.id)}
                                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 flex flex-col items-center gap-4 opacity-40">
                            <Clock className="w-12 h-12" />
                            <p className="font-medium">No pending invitations</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};