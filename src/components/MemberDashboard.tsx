import React, { useEffect, useState } from 'react';
import { Loader2, Zap, Layers, TrendingUp, X, Sparkles, Bot, Target } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { DataTable } from './DataTable';
import { supabase, fetchAll } from '../supabase';
import { generateSprintSummary } from '../aiService';
import { useAuth } from '../context/AuthContext';

interface RawItem {
  id: string; name: string; description: string; team: string; week: string;
  sprint: string; assignee: string; status: string; type: string; priority: string;
  points: number; epic: string; tags: string; createdOn: string; completedOn: string;
}

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];

const containerVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } }
};

const tooltipStyle = {
  backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: '10px', color: '#0f172a', fontSize: '12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
};

export const MemberDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems]           = useState<RawItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [summary, setSummary]       = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [velocityTrend, setVelocityTrend] = useState<any[]>([]);
  const [statusDist, setStatusDist]       = useState<any[]>([]);
  const [_avgCycleTime, setAvgCycleTime] = useState(0);

  const fetchData = async () => {
    if (!profile?.full_name) return;
    try {
      const rawData = await fetchAll(
        supabase.from('sprint_items').select('*').ilike('assignee', `%${profile.full_name}%`)
      );
      const mapped: RawItem[] = (rawData || []).map((r: any) => ({
        id: r.item_id, name: r.item_name, description: r.description, team: r.team_name,
        week: r.week_name, sprint: r.sprint, assignee: r.assignee, status: r.status,
        type: r.item_type, priority: r.priority, points: Number(r.estimation_points)||0,
        epic: r.epic, tags: r.tags, createdOn: r.created_on, completedOn: r.completed_on
      }));
      setItems(mapped); calculateMetrics(mapped); setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const calculateMetrics = (data: RawItem[]) => {
    const weeks = Array.from(new Set(data.map(i => i.week))).sort();
    setVelocityTrend(weeks.map(w => {
      const wi = data.filter(i => i.week === w);
      return { name: w, points: wi.reduce((s,i) => s+i.points,0), tasks: wi.length };
    }));
    const counts: Record<string,number> = {};
    data.forEach(i => counts[i.status] = (counts[i.status]||0)+1);
    setStatusDist(Object.entries(counts).map(([name,value]) => ({name,value})));
    let td=0,tc=0;
    data.forEach(i => {
      if (i.createdOn&&i.completedOn) {
        td+=(new Date(i.completedOn).getTime()-new Date(i.createdOn).getTime())/(1000*60*60*24); tc++;
      }
    });
    setAvgCycleTime(tc>0?Math.round((td/tc)*10)/10:0);
  };

  useEffect(() => {
    fetchData();
    const ch = supabase.channel('personal_items')
      .on('postgres_changes',{event:'*',schema:'public',table:'sprint_items'},fetchData).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile]);

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const payload = items.map(i=>({item_name:i.name,status:i.status,priority:i.priority,estimation_points:i.points}));
      setSummary(await generateSprintSummary(payload as any));
    } catch(e){console.error(e);} finally{setGeneratingSummary(false);}
  };

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500"/>
    </div>
  );

  const completedItems = items.filter(i => i.status?.toLowerCase().includes('done'));
  const completionRate = items.length>0?Math.round((completedItems.length/items.length)*100):0;

  return (
    <motion.div className="space-y-6 pb-10" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.header variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-linear-to-r from-emerald-500 to-teal-600
            bg-clip-text text-transparent">My Productivity</h1>
          <p className="mt-1 text-slate-500 text-sm">
            Personal metrics for <span className="font-semibold text-slate-700">{profile?.full_name}</span>
          </p>
        </div>
        <button onClick={handleGenerateSummary} disabled={generatingSummary}
          className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-emerald-500 to-teal-600
            text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all
            shadow-lg shadow-emerald-200 disabled:opacity-50">
          {generatingSummary ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
          {generatingSummary ? 'Analyzing…' : 'My AI Retro'}
        </button>
      </motion.header>

      {/* AI Panel */}
      <AnimatePresence>
        {summary && (
          <motion.div variants={itemVariants}
            initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-200
              rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-white rounded-xl border border-emerald-200 shadow-sm shrink-0">
                <Bot className="w-5 h-5 text-emerald-600"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">AI Personal Retro</p>
                <div className="prose prose-sm max-w-none text-slate-700 text-sm leading-relaxed">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              </div>
              <button onClick={()=>setSummary('')} className="text-slate-400 hover:text-slate-600 shrink-0">
                <X className="w-4 h-4"/>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <motion.div variants={itemVariants}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MemberKPI title="My Tasks"       value={items.length}                                          icon={Target}     color="indigo"/>
        <MemberKPI title="My Points"      value={items.reduce((s,i)=>s+i.points,0)}                   icon={Zap}        color="emerald"/>
        <MemberKPI title="Sprints"        value={new Set(items.map(i=>i.sprint)).size}                 icon={Layers}     color="violet"/>
        <MemberKPI title="Completion"     value={`${completionRate}%`}                                  icon={TrendingUp} color="teal"/>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div variants={itemVariants} className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4">My Velocity Over Time</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityTrend}>
                <defs>
                  <linearGradient id="colMyVel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false}/>
                <YAxis fontSize={11} stroke="#94a3b8" tickLine={false}/>
                <Tooltip contentStyle={tooltipStyle}/>
                <Area type="monotone" dataKey="points" stroke="#10b981" strokeWidth={2}
                  fillOpacity={1} fill="url(#colMyVel)" name="Story Points"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Status Breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDist} layout="vertical" margin={{left:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                <XAxis type="number" hide/>
                <YAxis dataKey="name" type="category" fontSize={11} stroke="#94a3b8" width={80} tickLine={false}/>
                <Tooltip contentStyle={tooltipStyle}/>
                <Bar dataKey="value" radius={[0,4,4,0]} name="Tasks">
                  {statusDist.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Task Table */}
      <motion.div variants={itemVariants} className="card p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4">My Assigned Tasks</h3>
        <DataTable items={items}/>
      </motion.div>
    </motion.div>
  );
};

// ─── Member KPI ──────────────────────────────────────────────
const colorMap: Record<string,{bg:string;text:string;shadow:string}> = {
  indigo:  {bg:'from-indigo-500 to-violet-600', text:'text-indigo-600',  shadow:'shadow-indigo-100'},
  emerald: {bg:'from-emerald-500 to-teal-600',  text:'text-emerald-600', shadow:'shadow-emerald-100'},
  violet:  {bg:'from-violet-500 to-purple-600', text:'text-violet-600',  shadow:'shadow-violet-100'},
  teal:    {bg:'from-teal-500 to-cyan-600',     text:'text-teal-600',    shadow:'shadow-teal-100'},
};
const MemberKPI: React.FC<{title:string;value:number|string;icon:React.ElementType;color:string}> = ({title,value,icon:Icon,color}) => {
  const c=colorMap[color]||colorMap.indigo;
  return (
    <motion.div variants={itemVariants} className="card p-5 hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-linear-to-br ${c.bg} shadow-md ${c.shadow}`}>
          <Icon className="w-4 h-4 text-white"/>
        </div>
      </div>
      <p className="section-title mb-1">{title}</p>
      <p className="text-2xl font-black text-slate-800">{value}</p>
    </motion.div>
  );
};
