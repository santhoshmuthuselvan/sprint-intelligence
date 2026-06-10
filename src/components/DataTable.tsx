import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from 'lucide-react';

interface DataTableProps {
  items: any[];
  onRowClick?: (item: any) => void;
}
type SortDir = 'asc' | 'desc' | null;

export const DataTable: React.FC<DataTableProps> = ({ items, onRowClick }) => {
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: '', dir: null });

  const sorted = useMemo(() => {
    if (!sort.key || !sort.dir) return items;
    return [...items].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const an = Number(av), bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn)) return sort.dir === 'asc' ? an - bn : bn - an;
      const as = String(av || '').toLowerCase(), bs = String(bv || '').toLowerCase();
      return sort.dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [items, sort]);

  const toggleSort = (key: string) => {
    setSort(prev => ({
      key,
      dir: prev.key === key
        ? prev.dir === 'asc' ? 'desc' : prev.dir === 'desc' ? null : 'asc'
        : 'asc'
    }));
  };

  const SortIcon = ({ k }: { k: string }) => {
    if (sort.key !== k)           return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />;
    if (sort.dir === 'asc')  return <ChevronUp    className="w-3.5 h-3.5 text-indigo-500" />;
    if (sort.dir === 'desc') return <ChevronDown   className="w-3.5 h-3.5 text-indigo-500" />;
    return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />;
  };

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
      <Inbox className="w-12 h-12 mb-3 opacity-40" />
      <p className="text-sm font-semibold text-slate-400">No items match the current filters</p>
    </div>
  );

  const headers = [
    { key: 'id',       label: 'ID' },
    { key: 'type',     label: 'Type' },
    { key: 'name',     label: 'Summary' },
    { key: 'assignee', label: 'Assignee' },
    { key: 'priority', label: 'Priority' },
    { key: 'status',   label: 'Status' },
    { key: 'points',   label: 'Pts' },
  ];

  const priorityBadge = (p: string) => {
    if (!p) return 'badge badge-low';
    const l = p.toLowerCase();
    if (l === 'critical') return 'badge badge-critical';
    if (l === 'high')     return 'badge badge-high';
    if (l === 'medium')   return 'badge badge-medium';
    return 'badge badge-low';
  };

  const statusBadge = (s: string) => {
    const l = (s || '').toLowerCase();
    if (l.includes('done') || l.includes('complete')) return 'badge badge-done';
    if (l.includes('progress'))                        return 'badge badge-progress';
    return 'badge badge-medium';
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 flex flex-col" style={{ height: 480 }}>
      <div className="overflow-auto flex-1">
        <table className="min-w-full">
          {/* Sticky header */}
          <thead className="table-header sticky top-0 z-10">
            <tr>
              {headers.map(h => (
                <th key={h.key} onClick={() => toggleSort(h.key)}
                  className="px-4 py-3 text-left whitespace-nowrap cursor-pointer select-none
                    hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    {h.label}
                    <SortIcon k={h.key} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-slate-50">
            {sorted.map((item, idx) => (
              <tr key={`${item.id}-${idx}`}
                onClick={() => onRowClick?.(item)}
                className={`table-row ${onRowClick ? 'cursor-pointer' : ''}`}>
                <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-indigo-600">{item.id}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs text-slate-500 font-medium">{item.type}</span>
                </td>
                <td className="px-4 py-3 max-w-xs truncate text-sm text-slate-700 font-medium" title={item.name}>
                  {item.name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{item.assignee}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={priorityBadge(item.priority)}>{item.priority}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={statusBadge(item.status)}>{item.status}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-700">{item.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
