import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2, Sparkles, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export const ResetPassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Session state
    const [sessionReady, setSessionReady] = useState(false);
    const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

    const navigate = useNavigate();

    useEffect(() => {
        // 1. Check current session immediately
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                console.log('ResetPassword: Initial session found', session.user.email);
                setSessionReady(true);
                setUserEmail(session.user.email);
            } else {
                console.log('ResetPassword: No initial session');
            }
        });

        // 2. Listen for auth changes (specifically PASSWORD_RECOVERY)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('ResetPassword: Auth Event:', event);

            if (event === 'PASSWORD_RECOVERY') {
                console.log('ResetPassword: Password Recovery event detected');
                setSessionReady(true);
                setUserEmail(session?.user.email);
            }

            if (event === 'SIGNED_IN' && session) {
                console.log('ResetPassword: Signed In event detected');
                setSessionReady(true);
                setUserEmail(session.user.email);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;
            setSuccess(true);

            // Force logout after password change
            setTimeout(async () => {
                await supabase.auth.signOut();
                navigate('/login', { replace: true });
                // We could also do window.location.reload() to be super safe
            }, 3000);
        } catch (err: any) {
            console.error('Password update error:', err);
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    // Loading State
    if (!sessionReady && !success) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-6" />
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Verifying Secure Link...</h2>
                <p className="text-zinc-500 max-w-md text-center">
                    Please wait while we validate your invitation token. This may take a few seconds.
                </p>
            </div>
        );
    }

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
                        <h1 className="text-3xl font-black text-zinc-900 dark:text-white">Set New Password</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium text-center">Final step to secure your account</p>
                    </div>

                    {!success ? (
                        <form onSubmit={handleReset} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">New Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 py-3.5 pl-12 pr-4 rounded-2xl outline-none transition-all dark:text-white"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Debug: Showing who we are updating */}
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    Updating password for:<br />
                                    <span className="font-mono text-sm font-bold">{userEmail || 'Recovering...'}</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Confirm Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 py-3.5 pl-12 pr-4 rounded-2xl outline-none transition-all dark:text-white"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                {loading ? 'One Last Click' : 'Update Password'}
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
                                <h2 className="text-xl font-bold dark:text-white">Password Updated!</h2>
                                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Redirecting you to login...</p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
