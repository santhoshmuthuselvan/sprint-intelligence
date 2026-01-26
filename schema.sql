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

-- Create a table for public profiles (linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'member', -- 'Owner', 'manager', 'member'
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile and managers/owners to view all
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create a table for handling invitations
CREATE TABLE user_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted'
    temp_password TEXT, -- Optional: Store if needed for reference, but be careful
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Allow managers and owners to view/create/delete invitations
CREATE POLICY "Admins can view invitations" ON user_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('Owner', 'manager')
        )
    );

CREATE POLICY "Admins can insert invitations" ON user_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('Owner', 'manager')
        )
    );

CREATE POLICY "Admins can delete invitations" ON user_invitations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('Owner', 'manager')
        )
    );

-- Trigger to create profile on signup (Optional if manual creation fails, but good backup)
-- Note: Our Edge Function creates profile manually, but this is good for direct signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'role', 'member'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
