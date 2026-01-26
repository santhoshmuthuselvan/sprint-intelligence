import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface DataTableProps {
    items: any[];
    onRowClick?: (item: any) => void;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
    key: string;
    direction: SortDirection;
}

export const DataTable: React.FC<DataTableProps> = ({ items, onRowClick }) => {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

    const sortedItems = useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return items;

        return [...items].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            // Handle numeric values
            const aNum = Number(aValue);
            const bNum = Number(bValue);

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
            }

            // Handle string values
            const aString = String(aValue || '').toLowerCase();
            const bString = String(bValue || '').toLowerCase();

            if (aString < bString) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aString > bString) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [items, sortConfig]);

    const handleSort = (key: string) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = null; // Reset to default order
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig.key !== columnKey) return <ChevronsUpDown className="w-4 h-4 ml-1 text-zinc-400 opacity-50" />;
        if (sortConfig.direction === 'asc') return <ChevronUp className="w-4 h-4 ml-1 text-blue-500" />;
        return <ChevronDown className="w-4 h-4 ml-1 text-blue-500" />;
    };

    if (items.length === 0) return <div className="text-center py-8 text-zinc-500">No items match the filters.</div>;

    const headers = [
        { key: 'id', label: 'ID' },
        { key: 'type', label: 'Type' },
        { key: 'name', label: 'Summary' },
        { key: 'assignee', label: 'Assignee' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'points', label: 'Points' },
    ];

    return (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 flex flex-col h-[500px]">
            {/* Header is separate or sticky to remain viewable while scrolling */}
            <div className="overflow-auto flex-1">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700 relative">
                    <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0 z-10 shadow-sm">
                        <tr>
                            {headers.map((header) => (
                                <th
                                    key={header.key}
                                    onClick={() => handleSort(header.key)}
                                    className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors select-none group"
                                >
                                    <div className="flex items-center">
                                        {header.label}
                                        <SortIcon columnKey={header.key} />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                        {sortedItems.map((item, idx) => (
                            <tr
                                key={`${item.id}-${idx}`}
                                onClick={() => onRowClick && onRowClick(item)}
                                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">{item.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">{item.type}</td>
                                <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100 max-w-xs truncate" title={item.name}>
                                    {item.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">{item.assignee}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={clsx(
                                        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                        item.priority === 'High' || item.priority === 'Critical' ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                                            item.priority === 'Medium' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
                                                "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    )}>
                                        {item.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">{item.status}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">{item.points}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
