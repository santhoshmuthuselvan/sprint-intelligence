import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Save, Loader2, Camera, Shield, UserCircle, CheckCircle, AlertCircle, Eye, EyeOff, ChevronRight, Upload } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export const Profile: React.FC = () => {
    const { user, profile, refreshProfile } = useAuth();

    // Profile State
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Password State
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // UI State for Passwords
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // File Upload State
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setAvatarUrl(profile.avatar_url || '');
        }
    }, [profile]);

    // Auto-hide success message
    useEffect(() => {
        if (profileMessage?.type === 'success') {
            const timer = setTimeout(() => {
                setProfileMessage(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [profileMessage]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            setProfileMessage(null);

            if (!e.target.files || e.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            setAvatarUrl(data.publicUrl);

            // Auto-save the avatar URL to profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: data.publicUrl })
                .eq('id', user?.id);

            if (updateError) throw updateError;

            // Refresh global state to update navigation bar immediately
            await refreshProfile();

            setProfileMessage({ type: 'success', text: 'Image uploaded and profile updated!' });
        } catch (error: any) {
            setProfileMessage({ type: 'error', text: error.message || 'Error uploading image' });
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingProfile(true);
        setProfileMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    avatar_url: avatarUrl,
                })
                .eq('id', user?.id);

            if (error) throw error;
            await refreshProfile();
            setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditingProfile(false);
        } catch (err: any) {
            setProfileMessage({ type: 'error', text: err.message || 'Failed to update profile' });
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleCancelEdit = () => {
        if (profile) {
            setFullName(profile.full_name || '');
            setAvatarUrl(profile.avatar_url || '');
        }
        setIsEditingProfile(false);
        setProfileMessage(null);
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        if (password.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setLoadingPassword(true);
        setPasswordMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
            setPassword('');
            setConfirmPassword('');
            setIsChangingPassword(false); // Reset view
        } catch (err: any) {
            setPasswordMessage({ type: 'error', text: err.message || 'Failed to update password' });
        } finally {
            setLoadingPassword(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
                    <UserCircle className="w-8 h-8 text-blue-600" />
                    My Profile
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium ml-11">
                    Manage your personal information and security settings
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Information Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 rounded-4xl border border-white/20 dark:border-white/5 shadow-xl h-fit"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Personal Details</h2>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                disabled={!isEditingProfile}
                                className={`w-full border py-3 px-4 rounded-xl outline-none transition-all dark:text-white ${isEditingProfile
                                        ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                                        : 'bg-transparent border-transparent px-0 font-medium text-lg'
                                    }`}
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Email <span className="text-xs font-normal text-zinc-400"></span></label>
                            <input
                                type="email"
                                value={profile?.email || user?.email || ''}
                                disabled
                                className="w-full bg-transparent border-transparent px-0 font-medium text-lg outline-none text-zinc-600 dark:text-zinc-400 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Avatar Image</label>

                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative group">
                                        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border-4 border-white dark:border-zinc-700 shadow-md flex items-center justify-center relative">
                                            {uploading ? (
                                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                            ) : avatarUrl ? (
                                                <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl font-bold text-zinc-400">
                                                    {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                                                </span>
                                            )}

                                            {isEditingProfile && (
                                                <label
                                                    htmlFor="avatar-upload"
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                                                >
                                                    <Camera className="w-6 h-6" />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        {isEditingProfile && (
                                            <>
                                                <label
                                                    htmlFor="avatar-upload"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm rounded-xl cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-200 dark:border-blue-800/50"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                    Upload New Picture
                                                </label>
                                                <input
                                                    id="avatar-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    disabled={uploading}
                                                    className="hidden"
                                                />
                                                <p className="text-xs text-zinc-500 mt-2">
                                                    Supports JPG, PNG, GIF
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>


                            </div>
                        </div>

                        {/* Avatar Preview */}


                        {profileMessage && (
                            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${profileMessage.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                }`}>
                                {profileMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {profileMessage.text}
                            </div>
                        )}

                        {isEditingProfile ? (
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold py-3.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loadingProfile}
                                    className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loadingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save Changes
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditingProfile(true)}
                                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                Edit Profile
                            </button>
                        )}
                    </form>
                </motion.div>

                {/* Password Security Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl p-6 rounded-4xl border border-white/20 dark:border-white/5 shadow-xl h-fit w-full"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Security</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Password Status</p>
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800/30">
                                <CheckCircle className="w-4 h-4" />
                                <span>Password is set and secure</span>
                            </div>
                        </div>

                        {!isChangingPassword ? (
                            <button
                                onClick={() => setIsChangingPassword(true)}
                                className="w-full group flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl transition-all"
                            >
                                <span className="font-bold text-indigo-700 dark:text-indigo-300">Change Password</span>
                                <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                onSubmit={handleUpdatePassword}
                                className="space-y-5 border-t border-zinc-100 dark:border-zinc-800 pt-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">New Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 py-3 pl-12 pr-12 rounded-xl outline-none transition-all dark:text-white"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Confirm New Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 py-3 pl-12 pr-12 rounded-xl outline-none transition-all dark:text-white"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {passwordMessage && (
                                    <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                        }`}>
                                        {passwordMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {passwordMessage.text}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsChangingPassword(false)}
                                        className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold py-3.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loadingPassword}
                                        className="flex-2 bg-linear-to-r from-indigo-600 to-blue-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loadingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                                        Update Password
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
