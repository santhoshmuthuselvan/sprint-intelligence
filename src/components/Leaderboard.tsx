import React, { useEffect, useState } from 'react';
import { supabase, fetchAll } from '../supabase';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Trophy, Medal, Timer, Zap, CheckCircle2, User, TrendingUp, Loader2, X } from 'lucide-react';
import { FilterBar } from './FilterBar';

interface LeaderboardStats {
  name: string; tasksCompleted: number; totalPoints: number;
  avgCycleTime: number; bugsFixed: number; weeklyActivity: number[];
  streak: number; isCenturyClub: boolean; isHeavyHitter: boolean;
}

const containerVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } }
};

export const Leaderboard: React.FC = () => {
  const [stats, setStats]               = useState<LeaderboardStats[]>([]);
  const [loading, setLoading]           = useState(true);
  const [allItems, setAllItems]         = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<LeaderboardStats | null>(null);
  const [filters, setFilters] = useState({ team:'', week:'', assignee:'', priority:'', type:'' });

  useEffect(() => { fetchAllData(); }, []);
  useEffect(() => { if (allItems.length > 0) calculateStats(allItems); }, [allItems, filters]);

  const fetchAllData = async () => {
    try {
      const items = await fetchAll(supabase.from('sprint_items').select('*'));
      const mapped = (items || []).map((r: any) => ({
        id: r.item_id, name: r.item_name, team: r.team_name, week: r.week_name,
        assignee: r.assignee, status: r.status, type: r.item_type, priority: r.priority,
        points: Number(r.estimation_points)||0, createdOn: r.created_on, completedOn: r.completed_on
      }));
      setAllItems(mapped); setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const calculateStats = (items: any[]) => {
    const filtered = items.filter(i =>
      (!filters.team     || i.team === filters.team) &&
      (!filters.week     || i.week === filters.week) &&
      (!filters.assignee || i.assignee?.includes(filters.assignee)) &&
      (!filters.priority || i.priority === filters.priority) &&
      (!filters.type     || i.type === filters.type)
    );
    const uniqueWeeks = Array.from(new Set(items.map(i => i.week))).filter(Boolean).sort() as string[];
    const last5 = uniqueWeeks.slice(-5);
    const userMap: Record<string,any> = {};
    filtered.forEach((item: any) => {
      if (!item.assignee) return;
      item.assignee.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((user: string) => {
        if (!userMap[user]) { userMap[user]={tasks:0,points:0,totalDays:0,timedTasks:0,bugs:0,weekly:{}}; last5.forEach(w=>userMap[user].weekly[w]=0); }
        const s=(item.status||'').toLowerCase();
        if (s==='done'||s==='completed'||s==='released') {
          userMap[user].tasks++; userMap[user].points+=Number(item.points)||0;
          if (item.type?.toLowerCase()==='bug') userMap[user].bugs++;
          if (userMap[user].weekly[item.week]!==undefined) userMap[user].weekly[item.week]++;
          if (item.createdOn&&item.completedOn) {
            const d=Math.ceil(Math.abs(new Date(item.completedOn).getTime()-new Date(item.createdOn).getTime())/86400000);
            userMap[user].totalDays+=d; userMap[user].timedTasks++;
          }
        }
      });
    });
    const out: LeaderboardStats[] = Object.entries(userMap).map(([name,data]) => {
      const wa=last5.map(w=>data.weekly[w]||0);
      let streak=0; for(let i=wa.length-1;i>=0;i--){if(wa[i]>0)streak++;else if(streak>0)break;}
      return {name,tasksCompleted:data.tasks,totalPoints:data.points,
        avgCycleTime:data.timedTasks>0?parseFloat((data.totalDays/data.timedTasks).toFixed(1)):0,
        bugsFixed:data.bugs,weeklyActivity:wa,streak,isCenturyClub:data.tasks>=100,isHeavyHitter:data.points>=500};
    });
    out.sort((a,b)=>b.tasksCompleted-a.tasksCompleted||b.totalPoints-a.totalPoints);
    setStats(out);
  };

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  const topThree = stats.slice(0, 3);
  const rest = stats.slice(3);

  return (
    <motion.div className="space-y-8 pb-10" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-4xl font-black tracking-tight bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500
          bg-clip-text text-transparent inline-block">Sprint Champions</h1>
        <p className="mt-1.5 text-slate-500">Recognizing top performers and delivery efficiency.</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <FilterBar files={allItems} filters={filters} setFilters={setFilters} hideGroupBy />
      </motion.div>

      {/* Podium */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6 mb-8 px-4">
        {topThree[1] && <PodiumCard user={topThree[1]} rank={2} gradient="from-slate-200 to-slate-300" delay={0.15} onClick={() => setSelectedMember(topThree[1])} />}
        {topThree[0] && <PodiumCard user={topThree[0]} rank={1} gradient="from-amber-300 to-yellow-500"  delay={0}    isWinner onClick={() => setSelectedMember(topThree[0])} />}
        {topThree[2] && <PodiumCard user={topThree[2]} rank={3} gradient="from-orange-200 to-amber-400"  delay={0.3}  onClick={() => setSelectedMember(topThree[2])} />}
      </div>

      {/* Full Rankings Table */}
      <motion.div variants={itemVariants} className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" /> Full Rankings
          </h3>
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1"><Medal className="w-3 h-3 text-red-400"/>Bug Squasher</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400"/>Impact</span>
            <span className="flex items-center gap-1"><Timer className="w-3 h-3 text-indigo-400"/>Speed</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-header">
              <tr>
                <th className="py-3 pl-5 pr-3">Rank</th>
                <th className="py-3 px-3">Member</th>
                <th className="py-3 px-3 text-center">Badges</th>
                <th className="py-3 px-3 text-center">Tasks</th>
                <th className="py-3 px-3 text-center">Impact</th>
                <th className="py-3 pl-3 pr-5 text-right">Avg Speed</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((user, i) => (
                <tr key={user.name} className="table-row cursor-pointer" onClick={() => setSelectedMember(user)}>
                  <td className="py-3.5 pl-5 pr-3 text-sm font-bold text-slate-400">#{i + 4}</td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-100 to-violet-100
                        flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800 text-sm">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex justify-center gap-1">
                      {user.bugsFixed>=3    && <span title="Bug Squasher"><Medal       className="w-4 h-4 text-red-500"/></span>}
                      {user.totalPoints>=20 && <span title="Impact Maker"><Zap         className="w-4 h-4 text-amber-500"/></span>}
                      {user.avgCycleTime>0&&user.avgCycleTime<=3 && <span title="Speedster"><Timer className="w-4 h-4 text-indigo-500"/></span>}
                      {user.streak>=3       && <span title={`${user.streak}-week streak`}><TrendingUp  className="w-4 h-4 text-orange-500 animate-pulse"/></span>}
                      {user.isCenturyClub   && <span title="Century Club"><Trophy      className="w-4 h-4 text-emerald-500"/></span>}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="badge badge-done">{user.tasksCompleted}</span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-700 text-sm">{user.totalPoints}</td>
                  <td className="py-3.5 pl-3 pr-5 text-right text-slate-500 text-sm">{user.avgCycleTime}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedMember(null)}>
            <motion.div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/>
            <motion.div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
              initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-linear-to-br from-indigo-50 to-violet-50 p-6 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600
                      flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-200">
                      {selectedMember.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{selectedMember.name}</h2>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {selectedMember.bugsFixed>=3   && <span className="badge badge-critical">🐛 Bug Squasher</span>}
                        {selectedMember.totalPoints>=20 && <span className="badge badge-medium">⚡ Impact Maker</span>}
                        {selectedMember.avgCycleTime>0&&selectedMember.avgCycleTime<=3 && <span className="badge badge-progress">🚀 Speedster</span>}
                        {selectedMember.streak>=3      && <span className="badge badge-high">🔥 {selectedMember.streak}-wk Streak</span>}
                        {selectedMember.isCenturyClub  && <span className="badge badge-done">💯 Century Club</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedMember(null)}
                    className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4"/>
                  </button>
                </div>
              </div>
              {/* Stats */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {label:'Tasks',value:selectedMember.tasksCompleted},
                    {label:'Points',value:selectedMember.totalPoints},
                    {label:'Avg Days',value:selectedMember.avgCycleTime},
                  ].map(s=>(
                    <div key={s.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <p className="section-title mb-1">{s.label}</p>
                      <p className="text-2xl font-black text-slate-800">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Activity bars */}
                <div>
                  <p className="section-title mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400"/> Activity Momentum (last 5 weeks)
                  </p>
                  <div className="flex items-end justify-between gap-1.5 h-24 bg-slate-50
                    rounded-xl p-3 border border-slate-100">
                    {selectedMember.weeklyActivity.map((count,i) => {
                      const pct = (count/Math.max(...selectedMember.weeklyActivity,1))*100;
                      return (
                        <motion.div key={i} className="flex-1 rounded-t-lg bg-linear-to-t from-indigo-500 to-violet-500 min-h-[2px]"
                          initial={{height:0}} animate={{height:`${pct}%`}} transition={{delay:i*0.08}}/>
                      );
                    })}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)}
                className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-xs
                  uppercase tracking-widest transition-colors border-t border-slate-100">
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Podium Card ─────────────────────────────────────────────
const PodiumCard: React.FC<{
  user: LeaderboardStats; rank: number; gradient: string;
  delay: number; isWinner?: boolean; onClick: () => void;
}> = ({ user, rank, gradient, delay, isWinner, onClick }) => (
  <motion.div
    className={`relative flex flex-col items-center bg-white border border-slate-200 rounded-2xl shadow-lg
      p-6 w-full md:w-60 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1
      ${isWinner ? 'md:-mt-10 md:w-72 ring-2 ring-amber-200 shadow-amber-100/60' : ''}`}
    initial={{opacity:0,y:50}} animate={{opacity:1,y:0}}
    transition={{delay,type:'spring',stiffness:100}}
    onClick={onClick}
  >
    {isWinner && (
      <div className="absolute -top-8 text-amber-400 drop-shadow-lg animate-float">
        <Trophy className="w-14 h-14 fill-amber-400"/>
      </div>
    )}
    {!isWinner && (
      <div className="absolute -top-5">
        <Medal className={`w-10 h-10 ${rank===2?'text-slate-400 fill-slate-200':'text-orange-400 fill-orange-200'}`}/>
      </div>
    )}

    <div className={`mt-8 mb-4 w-16 h-16 rounded-full bg-linear-to-br ${gradient}
      flex items-center justify-center shadow-md`}>
      <span className="text-2xl font-black text-white">{rank}</span>
    </div>

    <h3 className="text-lg font-bold text-slate-800 text-center mb-2">{user.name.split(' ')[0]}</h3>

    <div className="flex gap-1 mb-4">
      {user.bugsFixed>=3 && <span title="Bug Squasher"><Medal className="w-4 h-4 text-red-400"/></span>}
      {user.totalPoints>=20 && <span title="Impact Maker"><Zap className="w-4 h-4 text-amber-400"/></span>}
      {user.avgCycleTime>0&&user.avgCycleTime<=3 && <span title="Speedster"><Timer className="w-4 h-4 text-indigo-400"/></span>}
      {user.streak>=3 && <span title="On a streak!"><TrendingUp className="w-4 h-4 text-orange-400 animate-pulse"/></span>}
    </div>

    <div className="w-full space-y-2">
      {[
        {icon:<CheckCircle2 className="w-4 h-4"/>,label:'Tasks',val:`${user.tasksCompleted}`},
        {icon:<Zap className="w-4 h-4"/>,         label:'Impact',val:`${user.totalPoints} pts`},
        {icon:<Timer className="w-4 h-4"/>,       label:'Speed', val:`${user.avgCycleTime}d`},
      ].map(r=>(
        <div key={r.label} className="flex items-center justify-between p-2
          bg-slate-50 border border-slate-100 rounded-lg">
          <div className="flex items-center gap-2 text-slate-400 text-sm">{r.icon}<span>{r.label}</span></div>
          <span className="font-bold text-slate-800 text-sm">{r.val}</span>
        </div>
      ))}
    </div>
  </motion.div>
);
