import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, Loader2, Sparkles, Shield, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export const Login: React.FC = () => {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const { data: profileData } = await supabase.from('profiles').select('role')
        .eq('id', (await supabase.auth.getUser()).data.user?.id).single();
      navigate(profileData?.role === 'member' ? '/submit' : from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl"/>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-200/40 rounded-full blur-3xl"/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64
          bg-fuchsia-100/30 rounded-full blur-3xl"/>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/90 backdrop-blur-2xl rounded-4xl shadow-2xl shadow-slate-200/80
          border border-white p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              whileHover={{ scale: 1.08, rotate: 5 }}
              className="p-4 bg-linear-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-xl
                shadow-indigo-300/50 mb-5"
            >
              <Shield className="w-8 h-8 text-white"/>
            </motion.div>
            <h1 className="text-3xl font-black text-slate-800">
              Sprint{' '}
              <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Intelligence
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 font-medium">
              Secure access to your team's velocity
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300
                  group-focus-within:text-indigo-500 transition-colors"/>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input-base pl-11" placeholder="name@company.com" required/>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300
                  group-focus-within:text-indigo-500 transition-colors"/>
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-base pl-11 pr-12" placeholder="••••••••" required/>
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300
                    hover:text-slate-500 transition-colors focus:outline-none">
                  {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password"
                  className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
                className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-600
                  text-sm font-medium flex items-center gap-2.5">
                <LogIn className="w-4 h-4 shrink-0"/>
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-7 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <span className="text-indigo-600 font-bold cursor-pointer hover:underline">
                Contact your Owner
              </span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}; // Trigger IDE update
