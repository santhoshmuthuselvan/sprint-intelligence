import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, ChevronDown, Check, Plus } from 'lucide-react';
import * as xlsx from 'xlsx';
import { supabase } from '../supabase';

const INITIAL_TEAMS = ['AI Team'];

export const SubmissionForm: React.FC = () => {
    const [team, setTeam] = useState('');
    const [week, setWeek] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    // Creatable Select State
    const [availableTeams, setAvailableTeams] = useState<string[]>(INITIAL_TEAMS);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
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
        setIsDropdownOpen(false);
    };

    const handleCreateTeam = () => {
        if (team && !availableTeams.includes(team)) {
            setAvailableTeams([...availableTeams, team]);
            setIsDropdownOpen(false);
        }
    };

    const filteredTeams = availableTeams.filter(t =>
        t.toLowerCase().includes(team.toLowerCase())
    );

    const showCreateOption = team && !availableTeams.some(t => t.toLowerCase() === team.toLowerCase());

    const parseDate = (value: any) => {
        if (!value) return null;
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
    };

    const mapRowToDb = (row: any, teamName: string, weekName: string) => {
        return {
            item_id: String(row['Item Id'] || ''),
            item_name: row['Item Name'],
            description: row['Description'],
            user_groups: row['User Groups'],
            created_on: parseDate(row['Created On']),
            created_by: row['Created by'],
            sprint: row['Sprint'],
            completed_on: parseDate(row['Completed On']),
            tags: row['Tags'],
            assignee: row['Assignee'],
            status: row['Status'],
            epic: row['Epic'],
            item_type: row['Item Type'],
            priority: row['Priority'],
            start_date: parseDate(row['Start Date']),
            end_date: parseDate(row['End Date']),
            start_after: parseDate(row['Start After']),
            duration: row['Duration'],
            estimation_points: parseFloat(row['Estimation Points']) || 0,
            release_name: row['Release'],
            total_workhours: parseFloat(row['Total Workhours']) || 0,
            work_hours_per_owner: row['Work hours per owner'],
            work_hours_type: row['Work hours type'],
            parent_id: String(row['Parent Id'] || ''),
            sprint_type: row['Sprint Type'],
            sprint_start_date: parseDate(row['Sprint Start Date']),
            sprint_end_date: parseDate(row['Sprint End Date']),
            comments: row['Comments'],
            created_time: parseDate(row['Created Time']),
            last_modified: parseDate(row['Last Modified']),
            blocked_by: row['Blocked by'],
            blocked_on: parseDate(row['Blocked On']),

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
            const jsonData = xlsx.utils.sheet_to_json<any>(sheet, { defval: '' });

            const recordsToInsert = jsonData
                .filter(row => row['Item Id']) // Ensure at least Item Id exists
                .map(row => mapRowToDb(row, team, week));

            if (recordsToInsert.length === 0) {
                throw new Error('No valid records found in file');
            }

            // Insert into Supabase
            const { error } = await supabase
                .from('sprint_items')
                .insert(recordsToInsert);

            if (error) throw error;

            setStatus('success');
            setMessage(`Successfully submitted ${recordsToInsert.length} records!`);
            setFile(null);

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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative" ref={dropdownRef}>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Team Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Select or Create Team"
                                    value={team}
                                    onChange={(e) => {
                                        setTeam(e.target.value);
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow pr-10"
                                />
                                <ChevronDown
                                    className={`absolute right-3 top-2.5 w-5 h-5 text-zinc-400 pointer-events-none transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </div>

                            {isDropdownOpen && (
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
                                        !showCreateOption && (
                                            <div className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                No teams found
                                            </div>
                                        )
                                    )}

                                    {showCreateOption && (
                                        <button
                                            type="button"
                                            onClick={handleCreateTeam}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-700 font-medium"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Create "{team}"
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Week</label>
                            <input
                                type="text"
                                placeholder="e.g. Week-42"
                                value={week}
                                onChange={(e) => setWeek(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                            />
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
