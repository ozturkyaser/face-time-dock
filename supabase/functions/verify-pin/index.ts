import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employeeId, pin } = await req.json();
    console.log('PIN verification request for employee:', employeeId);

    if (!employeeId || !pin) {
      return new Response(
        JSON.stringify({ error: 'Missing employeeId or pin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get employee with pin_hash
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, pin_hash, is_active')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      console.error('Employee not found:', employeeError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Employee not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!employee.is_active) {
      console.log('Employee is not active');
      return new Response(
        JSON.stringify({ valid: false, error: 'Employee is not active' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!employee.pin_hash) {
      console.log('Employee has no PIN set');
      return new Response(
        JSON.stringify({ valid: false, error: 'No PIN configured for this employee' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN using bcrypt
    const isValid = await bcrypt.compare(pin, employee.pin_hash);
    console.log('PIN verification result:', isValid);

    return new Response(
      JSON.stringify({ valid: isValid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-pin function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
