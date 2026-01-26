// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Manual Authentication Check
        // We do this manually so we can disable "Enforce JWT" in the Supabase Dashboard,
        // which fixes CORS preflight issues.
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing Authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create a client context for the caller to verify their session
        const userClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Verify the token
        const { data: { user }, error: authError } = await userClient.auth.getUser();

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized', details: authError }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Check Permissions (Role-based Access Control)
        const { data: profile } = await userClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || !['Owner', 'manager'].includes(profile.role)) {
            return new Response(
                JSON.stringify({ error: 'Forbidden: You do not have permission to invite users.' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Admin Operations (Service Role)
        // Now that we've verified the user, we use the Service Role Key to perform admin tasks
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { email, fullName, role, invitedBy } = await req.json();

        if (!email || !fullName) {
            throw new Error('Email and Full Name are required');
        }

        // Generate Random 8-digit Password
        const tempPassword = Math.random().toString(36).slice(-8);

        // Create User in Supabase Auth (Auto-confirmed)
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: role || 'member'
            }
        });

        if (createError) throw createError;

        const userId = userData.user.id;

        // Create Profile Entry
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                full_name: fullName,
                role: role || 'member',
                email: email
            });

        if (profileError) {
            console.error('Error updating profile:', profileError);
        }

        // Record Invitation for tracking
        const { error: inviteError } = await supabaseAdmin
            .from('user_invitations')
            .insert({
                email,
                full_name: fullName,
                role: role || 'member',
                invited_by: invitedBy,
                status: 'accepted',
                temp_password: tempPassword
            });

        if (inviteError) console.error('Error saving invitation record:', inviteError);

        // Send Password Reset Link
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo: `${req.headers.get('origin')}/reset-password`,
        });

        if (resetError) throw resetError;

        return new Response(
            JSON.stringify({
                success: true,
                message: 'User created and invite sent',
                user: userData.user
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
