import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting auto-checkout process at', new Date().toISOString())

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get current time in Berlin timezone (UTC+1/UTC+2)
    const now = new Date()
    const berlinTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
    const currentHour = berlinTime.getHours()
    
    console.log('Current Berlin time:', berlinTime.toISOString(), 'Hour:', currentHour)

    // Only run auto-checkout at 20:00 (8 PM)
    if (currentHour !== 20) {
      console.log('Not time for auto-checkout yet. Current hour:', currentHour)
      return new Response(
        JSON.stringify({ message: 'Not time for auto-checkout', hour: currentHour }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find all open time entries
    const { data: openEntries, error: fetchError } = await supabase
      .from('time_entries')
      .select('id, employee_id, check_in, notes, employees!inner(default_break_minutes)')
      .is('check_out', null)

    if (fetchError) {
      console.error('Error fetching open entries:', fetchError)
      throw fetchError
    }

    console.log('Found', openEntries?.length || 0, 'open time entries')

    if (!openEntries || openEntries.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No open entries to checkout', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Auto-checkout all open entries at 20:00
    const checkoutTime = new Date(berlinTime)
    checkoutTime.setHours(20, 0, 0, 0) // Set to exactly 20:00:00

    const updates = []
    for (const entry of openEntries) {
      const employeeData = entry.employees as any
      const defaultBreak = employeeData?.default_break_minutes || 45
      
      const { error: updateError } = await supabase
        .from('time_entries')
        .update({
          check_out: checkoutTime.toISOString(),
          break_duration_minutes: defaultBreak,
          notes: entry.notes 
            ? `${entry.notes} (Automatische System-Abmeldung um 20:00 Uhr)` 
            : 'Automatische System-Abmeldung um 20:00 Uhr'
        })
        .eq('id', entry.id)

      if (updateError) {
        console.error('Error updating entry', entry.id, updateError)
        updates.push({ id: entry.id, success: false, error: updateError.message })
      } else {
        console.log('Successfully checked out entry', entry.id)
        updates.push({ id: entry.id, success: true })
      }
    }

    const successCount = updates.filter(u => u.success).length
    const failCount = updates.filter(u => !u.success).length

    console.log(`Auto-checkout completed: ${successCount} successful, ${failCount} failed`)

    return new Response(
      JSON.stringify({ 
        message: 'Auto-checkout completed',
        success: successCount,
        failed: failCount,
        updates 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in auto-checkout function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
