import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation helpers
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.endsWith('@intorza.com');
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8;
}

function isValidName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 1 && name.length <= 100;
}

function validateInput(data: Record<string, unknown>): { valid: boolean; error?: string } {
  const { email, password, name, phone, work_type, company_id, team_member_id } = data;

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return { valid: false, error: 'Invalid email format. Must be a valid @intorza.com email.' };
  }

  if (!password || typeof password !== 'string' || !isValidPassword(password)) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }

  if (!name || typeof name !== 'string' || !isValidName(name)) {
    return { valid: false, error: 'Name must be between 1 and 100 characters.' };
  }

  if (phone !== undefined && phone !== null && typeof phone !== 'string') {
    return { valid: false, error: 'Phone must be a string if provided.' };
  }

  if (!work_type || typeof work_type !== 'string') {
    return { valid: false, error: 'Work type is required.' };
  }

  if (!company_id || typeof company_id !== 'string' || !isValidUUID(company_id)) {
    return { valid: false, error: 'Invalid company ID format.' };
  }

  if (!team_member_id || typeof team_member_id !== 'string' || !isValidUUID(team_member_id)) {
    return { valid: false, error: 'Invalid team member ID format.' };
  }

  return { valid: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get authorization header to verify the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the requesting user
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !requestingUser) {
      throw new Error('Unauthorized');
    }
    const { data: allowed, error: limitError } = await supabaseAdmin.rpc('consume_user_api_limit', { p_user: requestingUser.id, p_operation: 'create-team-member-auth' });
    if (limitError) throw new Error('Request limit could not be checked');
    if (!allowed) return new Response(JSON.stringify({ error: 'Too many account creation attempts. Please wait a minute.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    // Parse and validate input
    const requestBody = await req.json();
    const validation = validateInput(requestBody);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { email, password, name, phone, work_type, company_id, team_member_id } = requestBody;

    console.log('Creating auth account for team member:', { email, name, company_id, team_member_id });

    // Verify the requesting user is the company owner
    if (requestingUser.id !== company_id) {
      throw new Error('You can only create team members for your own company');
    }

    // The service-role client bypasses RLS: validate the target, not just the
    // company ID supplied by the caller, before creating any auth account.
    const { data: member, error: memberError } = await supabaseAdmin
      .from('team_members')
      .select('id, company_id, user_id, email, name')
      .eq('id', team_member_id)
      .eq('company_id', requestingUser.id)
      .is('user_id', null)
      .maybeSingle();
    if (memberError || !member || member.email?.toLowerCase() !== email.toLowerCase()) {
      throw new Error('Team member not found, already linked, or identity does not match');
    }
    const { data: entitled, error: entitlementError } = await supabaseAdmin
      .rpc('is_pro_user', { _user_id: requestingUser.id });
    if (entitlementError || entitled !== true) {
      throw new Error('An active Pro subscription is required');
    }

    // Create the auth user with admin API
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: member.name,
        is_team_member: true,
        company_id: company_id
      }
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      throw new Error(createError.message);
    }

    console.log('Auth user created:', authData.user.id);

    // Update the team_members record with the user_id
    const { data: linkedMember, error: updateError } = await supabaseAdmin
      .from('team_members')
      .update({ user_id: authData.user.id })
      .eq('id', team_member_id)
      .eq('company_id', requestingUser.id)
      .is('user_id', null)
      .select('id')
      .maybeSingle();

    if (updateError || !linkedMember) {
      console.error('Error updating team member:', updateError);
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error('Failed to link auth account to team member');
    }

    console.log('Team member linked successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: authData.user.id,
        message: 'Team member account created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error('Error in create-team-member-auth:', errorMessage);
    return new Response(
      JSON.stringify({ 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
