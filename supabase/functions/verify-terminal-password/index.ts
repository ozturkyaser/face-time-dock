import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[verify-terminal-password] Request received');

    // Parse request body
    const { username, password } = await req.json();

    // Validate inputs
    if (!username || !password) {
      console.error('[verify-terminal-password] Missing username or password');
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch terminal with matching username
    const { data: terminal, error: terminalError } = await supabase
      .from('terminals')
      .select('id, password_hash, is_active, location_id, name')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (terminalError || !terminal) {
      console.log('[verify-terminal-password] Terminal not found or inactive');
      return new Response(
        JSON.stringify({ valid: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password using bcrypt
    const isValid = await compare(password, terminal.password_hash);

    if (!isValid) {
      console.log('[verify-terminal-password] Invalid password');
      return new Response(
        JSON.stringify({ valid: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch location name separately
    const { data: location } = await supabase
      .from('locations')
      .select('name')
      .eq('id', terminal.location_id)
      .single();

    console.log('[verify-terminal-password] Authentication successful');
    return new Response(
      JSON.stringify({
        valid: true,
        terminal: {
          id: terminal.id,
          name: terminal.name,
          location_id: terminal.location_id,
          location_name: location?.name || ''
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-terminal-password] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
