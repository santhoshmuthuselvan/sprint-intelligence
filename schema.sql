-- Create the table for storing sprint items
CREATE TABLE sprint_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id TEXT NOT NULL, -- "Item Id" - Keeping as Text to avoid issues with alphanumeric IDs
    item_name TEXT, -- "Item Name"
    description TEXT, -- "Description"
    user_groups TEXT, -- "User Groups"
    created_on TIMESTAMP WITH TIME ZONE, -- "Created On"
    created_by TEXT, -- "Created by"
    sprint TEXT, -- "Sprint"
    completed_on TIMESTAMP WITH TIME ZONE, -- "Completed On"
    tags TEXT, -- "Tags"
    assignee TEXT, -- "Assignee"
    status TEXT, -- "Status"
    epic TEXT, -- "Epic"
    item_type TEXT, -- "Item Type"
    priority TEXT, -- "Priority"
    start_date TIMESTAMP WITH TIME ZONE, -- "Start Date"
    end_date TIMESTAMP WITH TIME ZONE, -- "End Date"
    start_after TIMESTAMP WITH TIME ZONE, -- "Start After"
    duration TEXT, -- "Duration" (Could be "2 days", etc., so TEXT is safer unless formatted)
    estimation_points NUMERIC, -- "Estimation Points"
    release_name TEXT, -- "Release" (Release is a keyword in SQL, using release_name)
    total_workhours NUMERIC, -- "Total Workhours"
    work_hours_per_owner TEXT, -- "Work hours per owner"
    work_hours_type TEXT, -- "Work hours type"
    parent_id TEXT, -- "Parent Id"
    sprint_type TEXT, -- "Sprint Type"
    sprint_start_date TIMESTAMP WITH TIME ZONE, -- "Sprint Start Date"
    sprint_end_date TIMESTAMP WITH TIME ZONE, -- "Sprint End Date"
    comments TEXT, -- "Comments"
    created_time TIMESTAMP WITH TIME ZONE, -- "Created Time"
    last_modified TIMESTAMP WITH TIME ZONE, -- "Last Modified"
    blocked_by TEXT, -- "Blocked by"
    blocked_on TIMESTAMP WITH TIME ZONE, -- "Blocked On"
    
    -- Metadata fields we might want to add for our own tracking
    team_name TEXT, -- From the form submission
    week_name TEXT, -- From the form submission
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on Item Id and Sprint for faster lookups
CREATE INDEX idx_sprint_items_item_id ON sprint_items(item_id);
CREATE INDEX idx_sprint_items_sprint ON sprint_items(sprint);
CREATE INDEX idx_sprint_items_week ON sprint_items(week_name);
