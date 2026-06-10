import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, BarChart3, Trophy,
  Database, LogOut, User as UserIcon, UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export const Navigation: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const isOwner   = profile?.role === 'Owner';
  const isManager = profile?.role === 'manager';

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <nav className="hidden md:flex fixed left-4 top-4 bottom-4 w-[104px] flex-col items-center py-6
        bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/60 z-50">

        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.06 }}
          className="mb-10 p-3 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600
            shadow-lg shadow-indigo-300/40 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <BarChart3 className="w-5 h-5 text-white" />
        </motion.div>

        {/* Nav Items */}
        <div className="flex flex-col gap-1 w-full px-2">
          {(isOwner || isManager) && (
            <NavItem to="/dashboard"     icon={<LayoutDashboard className="w-[18px] h-[18px]" />} label="Board" />
          )}
          {profile?.role === 'member' && (
            <NavItem to="/member-dashboard" icon={<LayoutDashboard className="w-[18px] h-[18px]" />} label="Goals" />
          )}
          <NavItem to="/leaderboard"    icon={<Trophy className="w-[18px] h-[18px]" />}         label="Rank" />
          {isManager && (
            <NavItem to="/submit"        icon={<PlusCircle className="w-[18px] h-[18px]" />}      label="Add" />
          )}
          {isManager && (
            <NavItem to="/manage"        icon={<Database className="w-[18px] h-[18px]" />}        label="History" />
          )}
          {(isOwner || isManager) && (
            <NavItem to="/invite"        icon={<UserPlus className="w-[18px] h-[18px]" />}        label="Invite" />
          )}
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto flex flex-col items-center gap-3 w-full px-2">
          {/* Logout */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleLogout}
            className="w-full flex flex-col items-center gap-1 p-2.5 rounded-xl text-slate-400
              hover:text-red-500 hover:bg-red-50 transition-colors group relative"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Out</span>
            <span className="tooltip-label">Logout</span>
          </motion.button>

          {/* Profile Avatar */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-slate-200
              hover:ring-indigo-400 transition-all relative group cursor-pointer"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-indigo-100 to-violet-100
                flex items-center justify-center text-xs font-bold text-indigo-600">
                {profile?.full_name
                  ? profile.full_name.substring(0, 2).toUpperCase()
                  : <UserIcon className="w-4 h-4 opacity-40 text-indigo-400" />}
              </div>
            )}
            <span className="tooltip-label">Profile</span>
          </motion.button>
        </div>
      </nav>

      {/* ── Mobile Bottom Bar ───────────────────────────────── */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 h-16 bg-white border border-slate-200
        rounded-2xl shadow-xl shadow-slate-200/80 z-50 flex items-center justify-around px-2">
        <MobileNavItem
          to={profile?.role === 'member' ? '/member-dashboard' : '/dashboard'}
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="Home"
        />
        <MobileNavItem to="/leaderboard" icon={<Trophy className="w-5 h-5" />} label="Top" />
        {isManager && (
          <MobileNavItem to="/submit" icon={<PlusCircle className="w-5 h-5" />} label="Add" />
        )}
        {(isOwner || isManager) && (
          <MobileNavItem to="/invite" icon={<UserPlus className="w-5 h-5" />} label="Teams" />
        )}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 p-2 text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Out</span>
        </button>
      </nav>

      <style>{`
        .tooltip-label {
          position: absolute;
          left: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%);
          white-space: nowrap;
          background: #1e293b;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 7px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s, transform 0.15s;
          transform: translateY(-50%) translateX(4px);
          z-index: 60;
        }
        .group:hover .tooltip-label {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
      `}</style>
    </>
  );
};

/* Desktop Nav Item */
const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
  <NavLink to={to} className={({ isActive }) =>
    `flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-200 group relative
     ${isActive
       ? 'bg-linear-to-br from-indigo-50 to-violet-50 text-indigo-600 shadow-sm border border-indigo-100'
       : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-50'}`
  }>
    {icon}
    <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    <span className="tooltip-label">{label}</span>
  </NavLink>
);

/* Mobile Nav Item */
const MobileNavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
  <NavLink to={to} className={({ isActive }) =>
    `flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all
     ${isActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-500'}`
  }>
    {icon}
    <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
  </NavLink>
);
