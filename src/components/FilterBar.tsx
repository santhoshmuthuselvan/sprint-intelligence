import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterBarProps {
  files: any[];
  filters: { team: string; week: string; assignee: string; priority: string; type: string };
  setFilters: (f: any) => void;
  groupBy?: string;
  setGroupBy?: (g: string) => void;
  hideGroupBy?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  files, filters, setFilters, groupBy, setGroupBy, hideGroupBy = false
}) => {
  const unique = (key: string) =>
    Array.from(new Set(files.map((f: any) => f[key]))).filter(Boolean).sort() as string[];

  const teams      = unique('team');
  const weeks      = unique('week');
  const assignees  = Array.from(new Set(
    files.flatMap((f: any) => (f.assignee || '').split(',').map((s: string) => s.trim()))
  )).filter(Boolean).sort() as string[];
  const priorities = unique('priority');
  const types      = unique('type');

  const handleChange = (key: string, value: string) =>
    setFilters({ ...filters, [key]: value });

  const clearAll = () =>
    setFilters({ team: '', week: '', assignee: '', priority: '', type: '' });

  const activeFilters = Object.entries(filters).filter(([, v]) => v) as [string, string][];
  const activeCount   = activeFilters.length;

  const LABELS: Record<string, string> = {
    team: 'Team', week: 'Week', assignee: 'Assignee', priority: 'Priority', type: 'Type'
  };

  const dropdowns = [
    { key: 'team',      label: 'All Teams',     options: teams },
    { key: 'week',      label: 'All Weeks',      options: weeks },
    { key: 'assignee',  label: 'All Assignees',  options: assignees },
    { key: 'priority',  label: 'All Priorities', options: priorities },
    { key: 'type',      label: 'All Types',      options: types },
    ...(!hideGroupBy && setGroupBy ? [{
      key: '__groupBy',
      label: 'No Grouping',
      options: ['team', 'week', 'assignee', 'priority', 'type'].map(k => k)
    }] : [])
  ];

  return (
    <div className="card p-5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Filters</h3>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black
              inline-flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button onClick={clearAll}
            className="text-xs font-semibold text-slate-400 hover:text-red-500 flex items-center gap-1
              px-2 py-1 rounded-lg hover:bg-red-50 transition-all">
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Active Pills */}
      <AnimatePresence>
        {activeCount > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5 mb-4 overflow-hidden">
            {activeFilters.map(([key, value]) => (
              <button key={key} onClick={() => handleChange(key, '')} className="filter-pill">
                <span className="opacity-60">{LABELS[key]}:</span>
                <span>{value}</span>
                <X className="w-2.5 h-2.5" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdowns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))',
        gap: '0.6rem'
      }}>
        {dropdowns.map(({ key, label, options }) => {
          const isGroupBy = key === '__groupBy';
          const currentVal = isGroupBy ? (groupBy || 'none') : (filters as any)[key] || '';

          return (
            <div key={key} className="relative">
              <select
                value={currentVal}
                onChange={e => {
                  if (isGroupBy) setGroupBy?.(e.target.value);
                  else handleChange(key, e.target.value);
                }}
                className="input-base truncate text-sm"
                style={{ paddingRight: '2rem' }}
              >
                {isGroupBy ? (
                  <>
                    <option value="none">No Grouping</option>
                    {options.map(o => (
                      <option key={o} value={o}>
                        Group by {o.charAt(0).toUpperCase() + o.slice(1)}
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    <option value="">{label}</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </>
                )}
              </select>
              {/* Custom chevron */}
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
