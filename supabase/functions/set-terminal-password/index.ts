import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { genSalt, hash } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

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
    console.log('[set-terminal-password] Request received');

    // Parse request body
    const { terminalId, password } = await req.json();

    // Validate inputs
    if (!terminalId || !password) {
      console.error('[set-terminal-password] Missing terminalId or password');
      return new Response(
        JSON.stringify({ error: 'Terminal ID and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof password !== 'string' || password.length < 8) {
      console.error('[set-terminal-password] Password too short');
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key (has admin access)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify terminal exists
    const { data: terminal, error: terminalError } = await supabaseAdmin
      .from('terminals')
      .select('id')
      .eq('id', terminalId)
      .single();

    if (terminalError || !terminal) {
      console.error('[set-terminal-password] Terminal not found:', terminalError);
      return new Response(
        JSON.stringify({ error: 'Terminal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash password using bcrypt with salt
    console.log('[set-terminal-password] Hashing password with bcrypt');
    const salt = await genSalt(10);
    const hashedPassword = await hash(password, salt);

    // Update terminal with new password hash
    const { error: updateError } = await supabaseAdmin
      .from('terminals')
      .update({ password_hash: hashedPassword })
      .eq('id', terminalId);

    if (updateError) {
      console.error('[set-terminal-password] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[set-terminal-password] Password updated successfully');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[set-terminal-password] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
