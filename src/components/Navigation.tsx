import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, BarChart3, Trophy, Database, LogOut, User as UserIcon, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navigation: React.FC = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    const isOwner = profile?.role === 'Owner';
    const isManager = profile?.role === 'manager';

    const handleLogout = async () => {
        await signOut();
        navigate('/login', { replace: true });
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="hidden md:flex fixed left-6 top-6 bottom-6 w-24 flex-col items-center py-8 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-50">
                <div className="shrink-0 mb-12">
                    <div className="p-3 bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    {(isOwner || isManager) && (
                        <NavIcon
                            to="/dashboard"
                            icon={<LayoutDashboard className="w-6 h-6" />}
                            label="Dashboard"
                        />
                    )}

                    {profile?.role === 'member' && (
                        <NavIcon
                            to="/member-dashboard"
                            icon={<LayoutDashboard className="w-6 h-6" />}
                            label="Goals"
                        />
                    )}

                    <NavIcon
                        to="/leaderboard"
                        icon={<Trophy className="w-6 h-6" />}
                        label="Rank"
                    />

                    {isManager && (
                        <NavIcon
                            to="/submit"
                            icon={<PlusCircle className="w-6 h-6" />}
                            label="Submit"
                        />
                    )}

                    {isManager && (
                        <NavIcon
                            to="/manage"
                            icon={<Database className="w-6 h-6" />}
                            label="History"
                        />
                    )}

                    {(isOwner || isManager) && (
                        <NavIcon
                            to="/invite"
                            icon={<UserPlus className="w-6 h-6" />}
                            label="Invite"
                        />
                    )}
                </div>

                <div className="mt-auto flex flex-col gap-6 items-center">
                    <button
                        onClick={handleLogout}
                        className="p-3 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all duration-300 group relative"
                    >
                        <LogOut className="w-6 h-6" />
                        <span className="absolute left-16 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 translate-x-3 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap shadow-xl">
                            Logout
                        </span>
                    </button>

                    <button
                        onClick={() => navigate('/profile')}
                        className="w-10 h-10 rounded-full bg-linear-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-xs font-bold shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden group relative cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                    >
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : <UserIcon className="w-5 h-5 opacity-40" />
                        )}
                        <span className="absolute left-16 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 translate-x-3 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap shadow-xl">
                            View Profile
                        </span>
                    </button>
                </div>
            </nav>

            {/* Mobile Bottom Bar */}
            <nav className="md:hidden fixed bottom-6 left-6 right-6 h-20 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-4xl border border-white/20 dark:border-white/5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-50 px-2 overflow-hidden">
                <div className="flex items-center justify-around h-full">
                    <NavIcon
                        to={profile?.role === 'member' ? '/member-dashboard' : '/dashboard'}
                        icon={<LayoutDashboard className="w-5 h-5" />}
                        label="Home"
                    />
                    <NavIcon
                        to="/leaderboard"
                        icon={<Trophy className="w-5 h-5" />}
                        label="Top"
                    />
                    {isManager && (
                        <NavIcon
                            to="/submit"
                            icon={<PlusCircle className="w-5 h-5" />}
                            label="Add"
                        />
                    )}
                    {(isOwner || isManager) && (
                        <NavIcon
                            to="/invite"
                            icon={<UserPlus className="w-5 h-5" />}
                            label="Teams"
                        />
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex flex-col items-center justify-center p-2 text-zinc-500 active:scale-90 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-[10px] font-bold mt-1 uppercase opacity-60">Out</span>
                    </button>
                </div>
            </nav>
        </>
    );
};

const NavIcon: React.FC<{ to: string, icon: React.ReactNode, label: string }> = ({ to, icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `group relative flex flex-col md:flex-row items-center justify-center p-1.5 md:p-3 rounded-xl md:rounded-2xl transition-all duration-300 ${isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-zinc-500 hover:bg-white dark:hover:bg-zinc-800 hover:text-blue-600 dark:text-zinc-400'
            }`
        }
    >
        {icon}
        <span className="hidden md:block absolute left-20 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 translate-x-3 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap shadow-xl z-60">
            {label}
        </span>
        <span className="md:hidden text-[10px] font-bold mt-1 uppercase tracking-tighter truncate max-w-[48px]">{label}</span>
    </NavLink>
);
