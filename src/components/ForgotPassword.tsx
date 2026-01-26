import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Loader2, Sparkles, Shield, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (resetError) throw resetError;
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/5 relative z-10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="p-4 bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-zinc-900 dark:text-white">Recover Password</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium text-center px-4">Enter your email and we'll send you a recovery link</p>
                    </div>

                    {!success ? (
                        <form onSubmit={handleReset} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 py-3.5 pl-12 pr-4 rounded-2xl outline-none transition-all dark:text-white"
                                        placeholder="name@company.com"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-3.5 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                {loading ? 'Sending link...' : 'Send Reset Link'}
                            </button>
                        </form>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-6 py-4"
                        >
                            <div className="flex justify-center">
                                <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold dark:text-white">Check your email</h2>
                                <p className="text-zinc-500 dark:text-zinc-400">We've sent a password recovery link to <strong>{email}</strong>.</p>
                            </div>
                        </motion.div>
                    )}

                    <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-center">
                        <Link to="/login" className="text-sm font-bold text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2 group transition-colors">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
