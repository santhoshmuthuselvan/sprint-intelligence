export interface SprintItem {
    id: string; // UUID primary key
    item_id: string;
    item_name: string;
    description: string;
    user_groups: string;
    created_on: string | null;
    created_by: string;
    sprint: string;
    completed_on: string | null;
    tags: string;
    assignee: string;
    status: string;
    epic: string;
    item_type: string;
    priority: string;
    start_date: string | null;
    end_date: string | null;
    start_after: string | null;
    duration: string;
    estimation_points: number;
    release_name: string;
    total_workhours: number;
    work_hours_per_owner: string;
    work_hours_type: string;
    parent_id: string;
    sprint_type: string;
    sprint_start_date: string | null;
    sprint_end_date: string | null;
    comments: string;
    created_time: string | null;
    last_modified: string | null;
    blocked_by: string;
    blocked_on: string | null;
    team_name: string;
    week_name: string;
    uploaded_at: string;
}
