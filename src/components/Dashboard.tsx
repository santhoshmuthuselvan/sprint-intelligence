import React, { useEffect, useState, useMemo } from 'react';
import {
  Loader2, FolderOpen, Zap, Layers, TrendingUp, X, Calendar, User,
  AlertCircle, CheckCircle, Sparkles, Bot, Activity, Target, Clock,
  BarChart2, Shield, ChevronUp, ChevronDown, RefreshCw, Flame, Award
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  ComposedChart
} from 'recharts';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { FilterBar } from './FilterBar';
import { DataTable } from './DataTable';
import { CalendarView } from './CalendarView';
import { supabase, fetchAll } from '../supabase';
import { generateSprintSummary } from '../aiService';

interface RawItem {
  id: string; name: string; description: string; team: string; week: string;
  sprint: string; assignee: string; status: string; type: string; priority: string;
  points: number; epic: string; tags: string; createdOn: string; completedOn: string;
}
interface DashboardData { rawItems: RawItem[]; }

// ─── Palette ────────────────────────────────────────────────
const CHART_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];

// ─── Custom Tooltip (high contrast) ─────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs font-medium text-slate-800">
        {label && <p className="font-bold text-slate-900 mb-1.5">{label}</p>}
        <div className="space-y-1.5 min-w-[140px]">
          {payload.map((entry: any, index: number) => {
            const color = entry.stroke && entry.stroke !== 'none' ? entry.stroke : entry.fill || entry.color || '#6366f1';
            return (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-500 font-medium">{entry.name}</span>
                <span className="font-bold text-slate-800 ml-auto">{entry.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};


// ─── Animation Variants ──────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 130, damping: 18 } }
};

// ─── SVG Gradient Defs ───────────────────────────────────────
const GradientDefs = () => (
  <defs>
    <linearGradient id="gTasks"    x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25}/>
      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
    </linearGradient>
    <linearGradient id="gPoints"   x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
    </linearGradient>
    <linearGradient id="gDone"     x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#059669" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="#059669" stopOpacity={0.02}/>
    </linearGradient>
    <linearGradient id="gInProgress" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
    </linearGradient>
    <linearGradient id="gToDo"     x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#d97706" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="#d97706" stopOpacity={0.02}/>
    </linearGradient>
    <linearGradient id="gBurndown" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#ec4899" stopOpacity={0.25}/>
      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.02}/>
    </linearGradient>
    <linearGradient id="gVelocity" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.25}/>
      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02}/>
    </linearGradient>
    <linearGradient id="gBlocker"  x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02}/>
    </linearGradient>
  </defs>
);


// ─── Main Dashboard ──────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [filters, setFilters] = useState({ team:'', week:'', assignee:'', priority:'', type:'' });
  const [groupBy, setGroupBy] = useState('none');
  const [filteredItems, setFilteredItems] = useState<RawItem[]>([]);
  const [groupedData, setGroupedData] = useState<any[]>([]);

  const [tagRadarData, setTagRadarData] = useState<any[]>([]);
  const [statusAreaChartData, setStatusAreaChartData] = useState<any[]>([]);
  const [epicData, setEpicData] = useState<any[]>([]);
  const [priorityMatrix, setPriorityMatrix] = useState<any[]>([]);
  const [avgCycleTime, setAvgCycleTime] = useState(0);
  const [velocityTrend, setVelocityTrend] = useState<any[]>([]);
  const [velocityTrendPerc, setVelocityTrendPerc] = useState<number|undefined>();
  const [taskTrendPerc, setTaskTrendPerc] = useState<number|undefined>();
  const [workTypeDist, setWorkTypeDist] = useState<any[]>([]);
  const [blockerData, setBlockerData] = useState<any[]>([]);
  const [workloadData, setWorkloadData] = useState<any[]>([]);
  const [taskAgeData, setTaskAgeData] = useState<any[]>([]);
  const [teamVelocityData, setTeamVelocityData] = useState<any[]>([]);
  const [burndownData, setBurndownData] = useState<any[]>([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [healthScore, setHealthScore] = useState(0);
  const [cycleTimeByType, setCycleTimeByType] = useState<any[]>([]);
  const [scopeCreepData, setScopeCreepData] = useState<any[]>([]);

  const [summary, setSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [activeView, setActiveView] = useState<'grid'|'calendar'>('grid');
  const [selectedItem, setSelectedItem] = useState<RawItem|null>(null);

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const payload = filteredItems.map(i => ({
        id: i.id, item_name: i.name, description: i.description,
        team_name: i.team, status: i.status, priority: i.priority,
        estimation_points: i.points, tags: i.tags
      }));
      setSummary(await generateSprintSummary(payload));
    } catch (e) { console.error(e); } finally { setGeneratingSummary(false); }
  };

  useEffect(() => {
    fetchData();
    const ch = supabase.channel('sprint_items_changes')
      .on('postgres_changes', { event:'*', schema:'public', table:'sprint_items' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => { if (data) compute(); }, [data, filters, groupBy]);

  const fetchData = async () => {
    try {
      const rows = await fetchAll(supabase.from('sprint_items').select('*'));
      const rawItems: RawItem[] = (rows || []).map((r: any) => ({
        id: r.item_id, name: r.item_name, description: r.description,
        team: r.team_name, week: r.week_name, sprint: r.sprint, assignee: r.assignee,
        status: r.status, type: r.item_type, priority: r.priority,
        points: Number(r.estimation_points)||0, epic: r.epic, tags: r.tags,
        createdOn: r.created_on, completedOn: r.completed_on,
      }));
      setData({ rawItems }); setLastUpdated(new Date()); setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const compute = () => {
    if (!data) return;
    let items = data.rawItems || [];
    if (filters.team)     items = items.filter(i => i.team === filters.team);
    if (filters.week)     items = items.filter(i => i.week === filters.week);
    if (filters.assignee) items = items.filter(i => i.assignee?.includes(filters.assignee));
    if (filters.priority) items = items.filter(i => i.priority === filters.priority);
    if (filters.type)     items = items.filter(i => i.type === filters.type);
    setFilteredItems(items);

    if (groupBy !== 'none') {
      const g: Record<string,{name:string;tasks:number;points:number}> = {};
      items.forEach(i => { const k=(i as any)[groupBy]||'Unknown'; if(!g[k]) g[k]={name:k,tasks:0,points:0}; g[k].tasks++; g[k].points+=i.points||0; });
      setGroupedData(Object.values(g).sort((a,b)=>b.tasks-a.tasks));
    } else { setGroupedData([]); }

    const weeks = Array.from(new Set(items.map(i=>i.week))).sort();
    const abbr = (w: string) => w.split(' ').slice(-2).join(' ');

    // Tag Radar
    const tc: Record<string,number>={};
    items.forEach(i => i.tags?.split(',').map(t=>t.trim()).filter(Boolean).forEach(t=>{ tc[t]=(tc[t]||0)+(i.points||1); }));
    setTagRadarData(Object.entries(tc).map(([s,v])=>({subject:s,fullMark:v})).sort((a,b)=>b.fullMark-a.fullMark).slice(0,6));

    // Status area
    const wsm: Record<string,Record<string,number>>={};
    items.forEach(i=>{ const w=i.week,s=i.status||'Unknown'; if(!wsm[w]) wsm[w]={}; wsm[w][s]=(wsm[w][s]||0)+1; });
    setStatusAreaChartData(weeks.map(w=>({ name: abbr(w), ...wsm[w] })));


    // Epic
    const ec: Record<string,number>={};
    items.forEach(i=>{ const e=i.epic||'No Epic'; ec[e]=(ec[e]||0)+(i.points||1); });
    setEpicData(Object.entries(ec).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value));

    // Priority matrix
    const up: Record<string,Record<string,number>>={};
    items.forEach(i=>{ if(!i.assignee) return; i.assignee.split(',').map(u=>u.trim()).filter(Boolean).forEach(u=>{ if(!up[u]) up[u]={Critical:0,High:0,Medium:0,Low:0}; up[u][i.priority||'Low']=(up[u][i.priority||'Low']||0)+1; }); });
    setPriorityMatrix(Object.entries(up).map(([name,p])=>({name:name.split(' ')[0],...p})).slice(0,8));

    // Cycle time
    let td=0,tc2=0;
    items.forEach(i=>{ if(i.createdOn&&i.completedOn){ const d=Math.ceil(Math.abs(new Date(i.completedOn).getTime()-new Date(i.createdOn).getTime())/86400000); td+=d; tc2++; } });
    setAvgCycleTime(tc2>0?Math.round((td/tc2)*10)/10:0);

    // Velocity trend
    const tm: Record<string,{name:string;tasks:number;points:number}>={};
    weeks.forEach(w=>tm[w]={name:abbr(w),tasks:0,points:0});
    items.forEach(i=>{ if(tm[i.week]){ tm[i.week].tasks++; tm[i.week].points+=i.points||0; } });
    const vt=Object.values(tm); setVelocityTrend(vt);
    if(weeks.length>=2){ const lw=weeks[weeks.length-1],pw=weeks[weeks.length-2]; const lp=tm[lw].points,pp=tm[pw].points||1; setVelocityTrendPerc(Math.round(((lp-pp)/pp)*100)); const lt=tm[lw].tasks,pt=tm[pw].tasks||1; setTaskTrendPerc(Math.round(((lt-pt)/pt)*100)); }

    // Work type
    const typeC: Record<string,number>={};
    items.forEach(i=>{ const t=i.type||'Unknown'; typeC[t]=(typeC[t]||0)+1; });
    setWorkTypeDist(Object.entries(typeC).map(([name,value])=>({name,value})));

    // Blockers
    const bc: Record<string,number>={};
    items.forEach(i=>{ if(i.tags?.toLowerCase().includes('blocker')||i.status?.toLowerCase().includes('blocker')){ const t=i.team||'Unknown'; bc[t]=(bc[t]||0)+1; } });
    setBlockerData(Object.entries(bc).map(([name,count])=>({name,count})));

    // Workload
    const uw: Record<string,{name:string;points:number;tasks:number}>={};
    items.forEach(i=>{ if(!i.assignee) return; i.assignee.split(',').map(u=>u.trim()).filter(Boolean).forEach(u=>{ if(!uw[u]) uw[u]={name:u.split(' ')[0],points:0,tasks:0}; uw[u].points+=i.points||0; uw[u].tasks++; }); });
    setWorkloadData(Object.values(uw).sort((a,b)=>b.points-a.points).slice(0,10));

    // Task age
    const ab: Record<string,number>={'1-3d':0,'4-7d':0,'8-14d':0,'15+d':0}; const now=new Date();
    items.forEach(i=>{ if(i.status?.toLowerCase().includes('progress')&&i.createdOn){ const d=Math.ceil(Math.abs(now.getTime()-new Date(i.createdOn).getTime())/86400000); if(d<=3) ab['1-3d']++; else if(d<=7) ab['4-7d']++; else if(d<=14) ab['8-14d']++; else ab['15+d']++; } });
    setTaskAgeData(Object.entries(ab).map(([name,value])=>({name,value})));

    // Team velocity comparison
    const twm: Record<string,Record<string,number>>={};
    items.forEach(i=>{ const t=i.team||'Unknown'; const w=abbr(i.week)||'N/A'; if(!twm[t]) twm[t]={}; twm[t][w]=(twm[t][w]||0)+(i.points||0); });
    const allTeams=Object.keys(twm).slice(0,5);
    const allWeekLabels=Array.from(new Set(items.map(i=>abbr(i.week)).filter(Boolean))).sort().slice(-8);
    setTeamVelocityData(allWeekLabels.map(w=>{ const o: any={week:w}; allTeams.forEach(t=>{o[t]=twm[t]?.[w]||0;}); return o; }));

    // Burndown
    const totalPts=items.reduce((s,i)=>s+(i.points||0),0); let rem=totalPts;
    setBurndownData(vt.map((v,idx)=>{ rem=Math.max(0,rem-v.points); return {name:v.name,remaining:rem,ideal:Math.round(totalPts*(1-(idx+1)/vt.length)),completed:v.points}; }));

    // Completion rate
    const done=items.filter(i=>i.status?.toLowerCase().includes('done')||i.status?.toLowerCase()==='completed');
    const cr=items.length>0?Math.round((done.length/items.length)*100):0;
    setCompletionRate(cr);

    // Health score
    const cycleS=Math.max(0,100-avgCycleTime*3);
    const blockerS=blockerData.length===0?100:Math.max(0,100-blockerData.reduce((s,b)=>s+b.count,0)*10);
    const velS=velocityTrendPerc!==undefined?(velocityTrendPerc>=0?Math.min(100,70+velocityTrendPerc):Math.max(0,70+velocityTrendPerc)):70;
    setHealthScore(Math.max(0,Math.min(100,Math.round(cycleS*0.25+blockerS*0.25+cr*0.35+velS*0.15))));

    // Cycle time by type
    const typeCycle: Record<string,{name:string;sum:number;count:number}>={};
    items.forEach(i=>{
      if(i.createdOn&&i.completedOn&&i.type){
        const d=Math.ceil(Math.abs(new Date(i.completedOn).getTime()-new Date(i.createdOn).getTime())/86400000);
        if(!typeCycle[i.type]) typeCycle[i.type]={name:i.type,sum:0,count:0};
        typeCycle[i.type].sum+=d;
        typeCycle[i.type].count++;
      }
    });
    setCycleTimeByType(Object.values(typeCycle).map(t=>({name:t.name,days:t.count>0?Math.round((t.sum/t.count)*10)/10:0})));

    // Scope creep & predictability
    let planned = 0, creep = 0;
    if (items.length > 0) {
      const dates = items.map(i => i.createdOn ? new Date(i.createdOn).getTime() : null).filter(Boolean) as number[];
      if (dates.length > 0) {
        const minDate = Math.min(...dates);
        const cutoff = minDate + 3 * 24 * 60 * 60 * 1000; // 3 days cutoff
        items.forEach(i => {
          const pts = i.points || 0;
          if (i.createdOn && new Date(i.createdOn).getTime() > cutoff) {
            creep += pts;
          } else {
            planned += pts;
          }
        });
      }
    }
    const donePts = items.filter(i=>i.status?.toLowerCase().includes('done')||i.status?.toLowerCase()==='completed').reduce((s,i)=>s+(i.points||0),0);
    setScopeCreepData([
      { name: 'Planned Story Points', value: planned, fill: '#6366f1' },
      { name: 'Scope Creep (Added Mid-Sprint)', value: creep, fill: '#ec4899' },
      { name: 'Actual Completed Points', value: donePts, fill: '#10b981' }
    ]);
  };

  const totalTasks       = filteredItems.length;
  const totalPoints      = filteredItems.reduce((a,c)=>a+(c.points||0),0);
  const completedSprints = new Set(filteredItems.map(i=>i.sprint)).size;
  const teamsList = useMemo(()=>[...new Set((data?.rawItems||[]).map(i=>i.team))].filter(Boolean),[data]);

  if (loading || !data) return (
    <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100"/>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"/>
      </div>
      <p className="text-slate-400 text-sm font-semibold">Loading sprint data…</p>
    </div>
  );

  return (
    <motion.div className="space-y-6 pb-16" variants={containerVariants} initial="hidden" animate="visible">

      {/* ── Header ─────────────────────────────────── */}
      <motion.div variants={cardVariants}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="live-dot"/>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Live</span>
            <span className="text-xs text-slate-400 ml-1">
              · Updated {lastUpdated.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight
            bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
            Sprint Intelligence
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            {totalTasks.toLocaleString()} tasks · {totalPoints.toLocaleString()} story points
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {(['grid','calendar'] as const).map(v => (
              <button key={v} onClick={() => setActiveView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all
                  ${activeView===v
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-slate-400 hover:text-slate-600'}`}>
                {v}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={fetchData}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400
              hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm group">
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500"/>
          </button>

          {/* AI Summary */}
          <button onClick={handleGenerateSummary} disabled={generatingSummary}
            className="btn-primary text-sm">
            {generatingSummary ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
            {generatingSummary ? 'Analyzing…' : 'AI Summary'}
          </button>
        </div>
      </motion.div>

      {/* ── AI Summary Panel ────────────────────────── */}
      <AnimatePresence>
        {summary && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="bg-linear-to-br from-violet-50 to-fuchsia-50 border border-violet-200
              rounded-2xl p-5 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-48 h-48 opacity-10"
              style={{background:'radial-gradient(circle, #7c3aed, transparent)'}}/>
            <div className="flex items-start gap-4 relative">
              <div className="p-2.5 bg-white rounded-xl border border-violet-200 shadow-sm shrink-0">
                <Bot className="w-5 h-5 text-violet-600"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-2">AI Executive Summary</p>
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

      {/* ── Filter Bar ──────────────────────────────── */}
      <FilterBar files={data.rawItems||[]} filters={filters} setFilters={setFilters}
        groupBy={groupBy} setGroupBy={setGroupBy}/>

      {/* ── KPI Cards ───────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(min(160px,100%), 1fr))',gap:'1rem'}}>
        <KPICard id="kpi-tasks"      title="Total Tasks"      value={totalTasks.toLocaleString()} icon={FolderOpen} gradient="from-blue-500 to-indigo-600"   orb="orb-blue"    trend={taskTrendPerc}/>
        <KPICard id="kpi-points"     title="Story Points"     value={totalPoints.toLocaleString()} icon={Zap}       gradient="from-emerald-500 to-teal-600"  orb="orb-emerald" trend={velocityTrendPerc}/>
        <KPICard id="kpi-sprints"    title="Sprints"          value={completedSprints}             icon={Layers}    gradient="from-violet-500 to-purple-600" orb="orb-violet"  />
        <KPICard id="kpi-cycle"      title="Avg Cycle Time"   value={`${avgCycleTime}d`}           icon={Clock}     gradient="from-amber-500 to-orange-500"  orb="orb-amber"   />
        <KPICard id="kpi-completion" title="Completion Rate"  value={`${completionRate}%`}         icon={Target}    gradient="from-rose-500 to-pink-600"     orb="orb-rose"    />
        <KPICard id="kpi-health"     title="Health Score"     value={`${healthScore}/100`}         icon={Shield}    gradient="from-cyan-500 to-sky-600"      orb="orb-cyan"    />
      </div>

      {/* ── Grid / Calendar ─────────────────────────── */}
      {activeView === 'grid' ? (
        <>
          {groupBy !== 'none' ? (
            <BentoBox title="Grouped Analysis" subtitle={`Grouped by ${groupBy}`} fullWidth icon={BarChart2}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupedData} margin={{top:10,right:10,left:-10,bottom:40}}>
                    <GradientDefs/><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} angle={-35} textAnchor="end" height={60} interval={0}/>
                    <YAxis stroke="#94a3b8" fontSize={11}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Legend wrapperStyle={{fontSize:11,paddingTop:8}}/>
                    <Bar dataKey="tasks" fill="url(#gTasks)" stroke="#6366f1" strokeWidth={1.5} name="Tasks" radius={[4,4,0,0]}/>
                    <Bar dataKey="points" fill="url(#gPoints)" stroke="#10b981" strokeWidth={1.5} name="Points" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </BentoBox>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Row 1: Status Evolution */}
              <BentoBox title="Workflow Status Evolution" subtitle="Stacked over time" fullWidth icon={Activity}>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={statusAreaChartData} margin={{top:5,right:5,left:-20,bottom:0}}>
                      <GradientDefs/><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval="preserveStartEnd" tickLine={false}/>
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                      <Area type="monotone" dataKey="Done"        stackId="1" stroke="#059669" fill="url(#gDone)"/>
                      <Area type="monotone" dataKey="In Progress" stackId="1" stroke="#6366f1" fill="url(#gInProgress)"/>
                      <Area type="monotone" dataKey="To Do"       stackId="1" stroke="#d97706" fill="url(#gToDo)"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </BentoBox>

              {/* Row 2: Velocity Trend */}
              <BentoBox title="Velocity Trend" subtitle="Tasks & points per week" fullWidth icon={TrendingUp}>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={velocityTrend} margin={{top:5,right:5,left:-20,bottom:0}}>
                      <GradientDefs/><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval="preserveStartEnd" tickLine={false}/>
                      <YAxis yAxisId="left"  stroke="#94a3b8" fontSize={10} tickLine={false}/>
                      <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                      <Area yAxisId="right" type="monotone" dataKey="points" stroke="#06b6d4" strokeWidth={2} fill="url(#gVelocity)" name="Points"/>
                      <Line yAxisId="left"  type="monotone" dataKey="tasks"  stroke="#6366f1" strokeWidth={2.5} dot={{r:3,fill:'#6366f1'}} name="Tasks"/>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </BentoBox>

              {/* Row 3: Burndown */}
              <BentoBox title="Sprint Burndown" subtitle="Remaining vs ideal" fullWidth icon={Flame}>
                <div className="h-72">
                  {burndownData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={burndownData} margin={{top:5,right:5,left:-20,bottom:0}}>
                        <GradientDefs/><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval="preserveStartEnd" tickLine={false}/>
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false}/>
                        <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                        <Area type="monotone" dataKey="remaining" stroke="#ec4899" strokeWidth={2} fill="url(#gBurndown)" name="Remaining"/>
                        <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Ideal"/>
                        <Bar dataKey="completed" fill="#d1fae5" stroke="#059669" strokeWidth={1} name="Completed/wk" radius={[3,3,0,0]}/>
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                      <Flame className="w-8 h-8"/><p className="text-xs">No burndown data available</p>
                    </div>
                  )}
                </div>
              </BentoBox>

              {/* Row 4: Workload + Task Aging */}
              <BentoBox title="Team Workload" subtitle="Story points per member" colSpan="lg:col-span-2" icon={User}>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workloadData} layout="vertical" margin={{top:0,right:5,left:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false}/>
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={72} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="points" fill="#e0e7ff" stroke="#6366f1" strokeWidth={1.5} name="Story Points" radius={[0,4,4,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </BentoBox>

              <BentoBox title="Task Aging" subtitle="In-progress items" icon={Clock}>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskAgeData} margin={{top:5,right:5,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false}/>
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="value" name="Tasks" radius={[4,4,0,0]}>
                        {taskAgeData.map((_:any,i:number)=>(
                          <Cell key={i} fill={['#d1fae5','#e0e7ff','#fef9c3','#fee2e2'][i]||'#e0e7ff'}
                            stroke={['#059669','#6366f1','#d97706','#dc2626'][i]||'#6366f1'} strokeWidth={1.5}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </BentoBox>

              {/* Row 5: Work Type + Epic + Radar */}
              <BentoBox title="Work Type Mix" subtitle="Distribution by type" icon={BarChart2}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={workTypeDist} cx="50%" cy="45%" innerRadius={42} outerRadius={66} paddingAngle={4} dataKey="value">
                        {workTypeDist.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:10}} iconType="circle"/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </BentoBox>

              <BentoBox title="Effort by Epic" subtitle="Story points per epic" icon={Award}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={epicData.slice(0,6)} cx="50%" cy="45%" innerRadius={32} outerRadius={60} dataKey="value">
                        {epicData.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:9,lineHeight:'1.4'}} iconType="circle"/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </BentoBox>

              <BentoBox title="Sprint Focus Radar" subtitle="Tag concentration" icon={Sparkles}>
                <div className="h-64">
                  {tagRadarData.length>0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={tagRadarData}>
                        <PolarGrid stroke="#e2e8f0"/>
                        <PolarAngleAxis dataKey="subject" tick={{fill:'#94a3b8',fontSize:10}}/>
                        <Radar name="Points" dataKey="fullMark" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2}/>
                        <Tooltip content={<CustomTooltip/>}/>
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                      <Sparkles className="w-8 h-8"/><p className="text-xs">Add tags to enable radar</p>
                    </div>
                  )}
                </div>
              </BentoBox>

              {/* Row 6: Resource Risk Matrix */}
              <BentoBox title="Resource Risk Matrix" subtitle="Priority per member" fullWidth icon={AlertCircle}>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityMatrix} margin={{top:5,right:5,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false}/>
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                      <Bar dataKey="Critical" stackId="a" fill="#fee2e2" stroke="#dc2626" strokeWidth={1}/>
                      <Bar dataKey="High"     stackId="a" fill="#ffedd5" stroke="#ea580c" strokeWidth={1}/>
                      <Bar dataKey="Medium"   stackId="a" fill="#fefce8" stroke="#ca8a04" strokeWidth={1}/>
                      <Bar dataKey="Low"      stackId="a" fill="#eff6ff" stroke="#3b82f6" strokeWidth={1} radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </BentoBox>

              {/* Team Velocity Comparison */}
              <BentoBox title="Team Velocity Comparison" subtitle="Points per team per week" fullWidth icon={TrendingUp}>
                <div className="h-72">
                  {teamVelocityData.length>0 && teamsList.length>1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={teamVelocityData} margin={{top:5,right:5,left:-20,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                        <XAxis dataKey="week" stroke="#94a3b8" fontSize={10} interval="preserveStartEnd" tickLine={false}/>
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false}/>
                        <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                        {teamsList.slice(0,5).map((team,i)=>(
                          <Line key={team} type="monotone" dataKey={team}
                            stroke={CHART_COLORS[i%CHART_COLORS.length]} strokeWidth={2} dot={{r:2}}/>
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                      <TrendingUp className="w-8 h-8"/><p className="text-xs">Multiple teams needed for velocity comparison</p>
                    </div>
                  )}
                </div>
              </BentoBox>

              {/* Cycle Time by Type */}
              <BentoBox title="Cycle Time by Type" subtitle="Avg days to complete by work type" colSpan="lg:col-span-2" icon={Clock}>
                <div className="h-64">
                  {cycleTimeByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cycleTimeByType} margin={{top:5,right:5,left:-20,bottom:0}}>
                        <GradientDefs/>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false}/>
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false}/>
                        <Tooltip content={<CustomTooltip/>}/>
                        <Bar dataKey="days" fill="url(#gTasks)" stroke="#6366f1" strokeWidth={1.5} name="Avg Days" radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                      <Clock className="w-8 h-8"/><p className="text-xs">No completed tasks with cycle times</p>
                    </div>
                  )}
                </div>
              </BentoBox>

              {/* Blockers */}
              <BentoBox title="Blockers by Team" subtitle="Active blockers" icon={AlertCircle}>
                <div className="h-64">
                  {blockerData.length>0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={blockerData} margin={{top:5,right:5,left:-20,bottom:0}}>
                        <GradientDefs/><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false}/>
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false}/>
                        <Tooltip content={<CustomTooltip/>}/>
                        <Bar dataKey="count" fill="#fee2e2" stroke="#dc2626" strokeWidth={1.5} name="Blockers" radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                      <AlertCircle className="w-8 h-8"/><p className="text-xs">No active blockers</p>
                    </div>
                  )}
                </div>
              </BentoBox>

              {/* Scope Creep & Predictability */}
              <BentoBox title="Sprint Scope Creep & Predictability" subtitle="Planned points vs creep vs completed points" fullWidth icon={Activity}>
                <div className="h-72">
                  {scopeCreepData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scopeCreepData} margin={{top:5,right:5,left:-20,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false}/>
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false}/>
                        <Tooltip content={<CustomTooltip/>}/>
                        <Bar dataKey="value" name="Story Points" radius={[4,4,0,0]}>
                          {scopeCreepData.map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                      <Activity className="w-8 h-8"/><p className="text-xs">No scope creep data available</p>
                    </div>
                  )}
                </div>
              </BentoBox>
            </div>
          )}
        </>
      ) : (
        <CalendarView items={filteredItems} onRowClick={setSelectedItem}/>
      )}

      {/* ── Data Table ──────────────────────────────── */}
      <BentoBox title="Detailed Records" subtitle={`${filteredItems.length} items`} fullWidth icon={FolderOpen}>
        <DataTable items={filteredItems} onRowClick={setSelectedItem}/>
      </BentoBox>

      {/* ── Detail Modal ────────────────────────────── */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setSelectedItem(null)}/>
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200"
              initial={{scale:0.94,opacity:0,y:16}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.94,opacity:0,y:16}}>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-start
                bg-linear-to-r from-indigo-50 to-violet-50">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`badge ${selectedItem.type==='Bug' ? 'badge-critical' : 'badge-progress'}`}>
                      {selectedItem.type||'Task'}
                    </span>
                    <span className={`badge ${
                      selectedItem.priority==='Critical' ? 'badge-critical' :
                      selectedItem.priority==='High'     ? 'badge-high' :
                      selectedItem.priority==='Medium'   ? 'badge-medium' : 'badge-low'}`}>
                      {selectedItem.priority}
                    </span>
                    <code className="text-xs text-slate-400 font-mono">{selectedItem.id}</code>
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight">{selectedItem.name}</h2>
                </div>
                <button onClick={()=>setSelectedItem(null)}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 shrink-0">
                  <X className="w-4 h-4"/>
                </button>
              </div>
              {/* Body */}
              <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <DetailItem icon={User}         label="Assignee" value={selectedItem.assignee}/>
                  <DetailItem icon={CheckCircle}  label="Status"   value={selectedItem.status}/>
                  <DetailItem icon={Zap}          label="Points"   value={selectedItem.points}/>
                  <DetailItem icon={Layers}       label="Sprint"   value={selectedItem.sprint}/>
                  <DetailItem icon={Calendar}     label="Week"     value={selectedItem.week}/>
                  <DetailItem icon={Activity}     label="Team"     value={selectedItem.team}/>
                </div>
                {selectedItem.description && (
                  <div>
                    <p className="section-title mb-2">Description</p>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap
                      bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      {selectedItem.description}
                    </p>
                  </div>
                )}
                {selectedItem.tags && (
                  <div>
                    <p className="section-title mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.tags.split(',').map(t=>t.trim()).filter(Boolean).map(tag=>(
                        <span key={tag} className="filter-pill">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <span>Created: {selectedItem.createdOn?new Date(selectedItem.createdOn).toLocaleDateString():'N/A'}</span>
                  <span>Completed: {selectedItem.completedOn?new Date(selectedItem.completedOn).toLocaleDateString():'In Progress'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── BentoBox ────────────────────────────────────────────────
const BentoBox: React.FC<{
  title:string; subtitle?:string; children:React.ReactNode;
  colSpan?:string; fullWidth?:boolean; icon?:React.ElementType;
}> = ({ title, subtitle, children, colSpan='col-span-1', fullWidth, icon:Icon }) => (
  <motion.div variants={cardVariants}
    className={`card p-5 ${fullWidth?'col-span-full':colSpan}`}>
    <div className="flex items-center gap-2.5 mb-4">
      {Icon && (
        <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
          <Icon className="w-3.5 h-3.5 text-indigo-500"/>
        </div>
      )}
      <div>
        <h3 className="text-sm font-bold text-slate-800 leading-none">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{subtitle}</p>}
      </div>
    </div>
    {children}
  </motion.div>
);

// ─── KPI Card ────────────────────────────────────────────────
const KPICard: React.FC<{
  id:string; title:string; value:string|number; icon:React.ElementType;
  gradient:string; orb:string; trend?:number;
}> = ({ id, title, value, icon:Icon, gradient, orb, trend }) => (
  <motion.div id={id} variants={cardVariants}
    className="card p-4 overflow-hidden relative group hover:-translate-y-0.5">
    <div className={`absolute -top-8 -right-8 w-24 h-24 ${orb} opacity-80 blur-xl transition-opacity group-hover:opacity-100`}/>
    <div className={`inline-flex p-2.5 rounded-xl bg-linear-to-br ${gradient} shadow-md shadow-black/10 mb-3`}>
      <Icon className="w-4 h-4 text-white"/>
    </div>
    <p className="section-title mb-1">{title}</p>
    <p className="text-2xl font-black text-slate-800 leading-none stat-value">{value}</p>
    {trend!==undefined && (
      <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
        ${trend>=0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-500 border border-red-200'}`}>
        {trend>=0 ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
        {trend>0?'+':''}{trend}% vs prev week
      </div>
    )}
  </motion.div>
);

// ─── Detail Item ─────────────────────────────────────────────
const DetailItem: React.FC<{icon:React.ElementType;label:string;value:string|number}> = ({ icon:Icon, label, value }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className="w-3 h-3 text-slate-400"/>
      <p className="section-title">{label}</p>
    </div>
    <p className="text-sm font-semibold text-slate-700 truncate">{value||'—'}</p>
  </div>
);
