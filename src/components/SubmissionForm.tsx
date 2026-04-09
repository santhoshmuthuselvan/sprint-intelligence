import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, ChevronDown, Check, Plus } from 'lucide-react';
import * as xlsx from 'xlsx';
import { supabase, fetchAll } from '../supabase';

export const SubmissionForm: React.FC = () => {
    const [team, setTeam] = useState('');
    const [week, setWeek] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    // Creatable Select State - Team
    const [availableTeams, setAvailableTeams] = useState<string[]>([]);
    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    const teamDropdownRef = useRef<HTMLDivElement>(null);

    // Creatable Select State - Week
    const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
    const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);
    const weekDropdownRef = useRef<HTMLDivElement>(null);

    // Fetch existing teams and weeks from Supabase
    useEffect(() => {
        const fetchData = async () => {
            const data = await fetchAll(
                supabase.from('sprint_items').select('team_name, week_name')
            );

            if (data) {
                const uniqueTeams = Array.from(new Set(data.map((item: any) => item.team_name))).filter(t => t) as string[];
                const uniqueWeeks = Array.from(new Set(data.map((item: any) => item.week_name))).filter(w => w) as string[];

                setAvailableTeams(uniqueTeams.sort());
                setAvailableWeeks(uniqueWeeks.sort());
            }
        };
        fetchData();
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
                setIsTeamDropdownOpen(false);
            }
            if (weekDropdownRef.current && !weekDropdownRef.current.contains(event.target as Node)) {
                setIsWeekDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleTeamSelect = (selectedTeam: string) => {
        setTeam(selectedTeam);
        setIsTeamDropdownOpen(false);
    };

    const handleWeekSelect = (selectedWeek: string) => {
        setWeek(selectedWeek);
        setIsWeekDropdownOpen(false);
    };

    const filteredTeams = availableTeams.filter(t =>
        t.toLowerCase().includes(team.toLowerCase())
    );

    const filteredWeeks = availableWeeks.filter(w =>
        w.toLowerCase().includes(week.toLowerCase())
    );

    const showCreateTeamOption = team && !availableTeams.some(t => t.toLowerCase() === team.toLowerCase());
    const showCreateWeekOption = week && !availableWeeks.some(w => w.toLowerCase() === week.toLowerCase());

    const parseDate = (value: any) => {
        if (!value) return null;
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
    };

    // Helper to find key case-insensitively and ignoring spaces
    const findKey = (row: any, target: string) => {
        const normalizedTarget = target.toLowerCase().replace(/\s+/g, '');
        return Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, '') === normalizedTarget);
    };

    const getValue = (row: any, target: string) => {
        const key = findKey(row, target);
        return key ? row[key] : undefined;
    };

    const mapRowToDb = (row: any, teamName: string, weekName: string) => {
        return {
            item_id: String(getValue(row, 'Item Id') || getValue(row, 'ID') || ''),
            item_name: getValue(row, 'Item Name') || getValue(row, 'Name'),
            description: getValue(row, 'Description'),
            user_groups: getValue(row, 'User Groups'),
            created_on: parseDate(getValue(row, 'Created On')),
            created_by: getValue(row, 'Created by'),
            sprint: getValue(row, 'Sprint'),
            completed_on: parseDate(getValue(row, 'Completed On')),
            tags: getValue(row, 'Tags'),
            assignee: getValue(row, 'Assignee') || getValue(row, 'Owner'),
            status: getValue(row, 'Status'),
            epic: getValue(row, 'Epic'),
            item_type: getValue(row, 'Item Type') || getValue(row, 'Type'),
            priority: getValue(row, 'Priority'),
            start_date: parseDate(getValue(row, 'Start Date')),
            end_date: parseDate(getValue(row, 'End Date')),
            start_after: parseDate(getValue(row, 'Start After')),
            duration: getValue(row, 'Duration'),
            estimation_points: parseFloat(getValue(row, 'Estimation Points') || '0'),
            release_name: getValue(row, 'Release'),
            total_workhours: parseFloat(getValue(row, 'Total Workhours') || '0'),
            work_hours_per_owner: getValue(row, 'Work hours per owner'),
            work_hours_type: getValue(row, 'Work hours type'),
            parent_id: String(getValue(row, 'Parent Id') || ''),
            sprint_type: getValue(row, 'Sprint Type'),
            sprint_start_date: parseDate(getValue(row, 'Sprint Start Date')),
            sprint_end_date: parseDate(getValue(row, 'Sprint End Date')),
            comments: getValue(row, 'Comments'),
            created_time: parseDate(getValue(row, 'Created Time')),
            last_modified: parseDate(getValue(row, 'Last Modified')),
            blocked_by: getValue(row, 'Blocked by'),
            blocked_on: parseDate(getValue(row, 'Blocked On')),

            // Metadata
            team_name: teamName,
            week_name: weekName
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!team || !week || !file) {
            setMessage('Please fill in all fields');
            setStatus('error');
            return;
        }

        setStatus('uploading');

        try {
            // Read file
            const data = await file.arrayBuffer();
            const workbook = xlsx.read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // 1. Read as array of arrays to find the header row
            const rawRows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });

            // 2. Find the row index that contains 'Item Id'
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(rawRows.length, 20); i++) { // Check first 20 rows
                const row = rawRows[i];
                if (row && row.some((cell: any) =>
                    String(cell).toLowerCase().replace(/\s+/g, '') === 'itemid' ||
                    String(cell).toLowerCase().replace(/\s+/g, '') === 'id'
                )) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                throw new Error("Could not find a header row containing 'Item Id' or 'ID'. Please check your file format.");
            }

            console.log(`Found header row at index ${headerRowIndex}:`, rawRows[headerRowIndex]);

            // 3. Re-parse using the found header row
            const jsonData = xlsx.utils.sheet_to_json<any>(sheet, { range: headerRowIndex, defval: '' });

            console.log('Parsed Data Sample:', jsonData.slice(0, 2));

            const recordsToInsert = jsonData
                .filter(row => {
                    const hasId = getValue(row, 'Item Id') || getValue(row, 'ID');
                    if (!hasId) console.warn('Row skipped (missing ID):', row);
                    return hasId;
                })
                .map(row => mapRowToDb(row, team, week));

            if (recordsToInsert.length === 0) {
                const foundKeys = jsonData.length > 0 ? Object.keys(jsonData[0]).join(', ') : 'None';
                throw new Error(`No valid records found. Found columns: ${foundKeys}`);
            }

            // Insert into Supabase
            const { error } = await supabase
                .from('sprint_items')
                .insert(recordsToInsert);

            if (error) throw error;

            setStatus('success');
            setMessage(`Successfully submitted ${recordsToInsert.length} records!`);
            setFile(null);

            // Refresh lists (optimistic or re-fetch)
            if (!availableTeams.includes(team)) setAvailableTeams([...availableTeams, team].sort());
            if (!availableWeeks.includes(week)) setAvailableWeeks([...availableWeeks, week].sort());

        } catch (err: any) {
            console.error('Submission error:', err);
            setStatus('error');
            setMessage(err.message || 'Failed to submit report. Please try again.');
        }
    };

    return (
        <div className="max-w-xl mx-auto">
            <div className="bg-white dark:bg-zinc-800 p-8 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700">
                <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-6 h-6 text-blue-500" />
                    Submit Sprint Report
                </h2>

                {status === 'success' && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        {message}
                    </div>
                )}

                {status === 'error' && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Team Dropdown */}
                        <div className="relative" ref={teamDropdownRef}>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Team Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Select or Create Team"
                                    value={team}
                                    onChange={(e) => {
                                        setTeam(e.target.value);
                                        setIsTeamDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsTeamDropdownOpen(true)}
                                    className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow pr-10"
                                />
                                <ChevronDown
                                    className={`absolute right-3 top-2.5 w-5 h-5 text-zinc-400 pointer-events-none transition-transform ${isTeamDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </div>

                            {isTeamDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                                    {filteredTeams.length > 0 ? (
                                        filteredTeams.map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => handleTeamSelect(t)}
                                                className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 text-zinc-900 dark:text-zinc-100 flex items-center justify-between group"
                                            >
                                                {t}
                                                {t === team && <Check className="w-4 h-4 text-blue-500" />}
                                            </button>
                                        ))
                                    ) : (
                                        !showCreateTeamOption && (
                                            <div className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                No teams found
                                            </div>
                                        )
                                    )}

                                    {showCreateTeamOption && (
                                        <button
                                            type="button"
                                            onClick={() => setIsTeamDropdownOpen(false)}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-700 font-medium"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Create "{team}"
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Week Dropdown */}
                        <div className="relative" ref={weekDropdownRef}>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Week</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Select or Create Week"
                                    value={week}
                                    onChange={(e) => {
                                        setWeek(e.target.value);
                                        setIsWeekDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsWeekDropdownOpen(true)}
                                    className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow pr-10"
                                />
                                <ChevronDown
                                    className={`absolute right-3 top-2.5 w-5 h-5 text-zinc-400 pointer-events-none transition-transform ${isWeekDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </div>

                            {isWeekDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                                    {filteredWeeks.length > 0 ? (
                                        filteredWeeks.map((w) => (
                                            <button
                                                key={w}
                                                type="button"
                                                onClick={() => handleWeekSelect(w)}
                                                className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 text-zinc-900 dark:text-zinc-100 flex items-center justify-between group"
                                            >
                                                {w}
                                                {w === week && <Check className="w-4 h-4 text-blue-500" />}
                                            </button>
                                        ))
                                    ) : (
                                        !showCreateWeekOption && (
                                            <div className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                No weeks found
                                            </div>
                                        )
                                    )}

                                    {showCreateWeekOption && (
                                        <button
                                            type="button"
                                            onClick={() => setIsWeekDropdownOpen(false)}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-700 font-medium"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Create "{week}"
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Report File (CSV/XLS/XLSX)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-300 dark:border-zinc-600 border-dashed rounded-lg hover:border-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-all cursor-pointer relative group">
                            <div className="space-y-1 text-center">
                                <FileText className="mx-auto h-12 w-12 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                                <div className="flex text-sm text-zinc-600 dark:text-zinc-400">
                                    <span className="relative font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                        Upload a file
                                    </span>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-zinc-500">CSV, XLS, XLSX up to 10MB</p>
                            </div>
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                accept=".csv,.xls,.xlsx"
                            />
                        </div>
                        {file && (
                            <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 font-medium flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Selected: {file.name}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'uploading'}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {status === 'uploading' ? 'Uploading...' : 'Submit Report'}
                    </button>
                </form>
            </div>
        </div>
    );
};
