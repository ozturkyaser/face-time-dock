import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, locationId } = await req.json();
    console.log('Face recognition request received');

    if (!imageData || !locationId) {
      return new Response(
        JSON.stringify({ error: 'Missing imageData or locationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get employees with face profiles for this location
    console.log('Fetching employees for location:', locationId);
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_number, face_profiles(id, image_url)')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .not('face_profiles', 'is', null);

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch employees' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!employees || employees.length === 0) {
      console.log('No employees with face profiles found');
      return new Response(
        JSON.stringify({ error: 'No registered employees found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${employees.length} employees with face profiles`);

    // Prepare prompt for Gemini Vision
    const employeeDescriptions = employees.map((emp, idx) => 
      `Person ${idx + 1}: ${emp.first_name} ${emp.last_name} (Employee #${emp.employee_number})`
    ).join('\n');

    const prompt = `You are a face recognition system for employee time tracking. 
    
You will see a current photo from a camera, followed by reference photos of registered employees.

Current photo: This is the person trying to check in/out.

Reference photos: These are the registered employees.
${employeeDescriptions}

Your task:
1. Compare the face in the current photo with ALL the reference photos
2. Identify which registered employee (if any) matches the current photo
3. ONLY return a match if you are VERY confident (>90% certainty) that it's the same person
4. Consider face shape, facial features, skin tone, and other distinguishing characteristics

IMPORTANT: If the face in the current photo is:
- Covered (by hand, mask, etc.)
- Not clearly visible
- Blurred or poor quality
- Does not match any reference photo with high confidence
Then respond with "NO_MATCH"

If you find a match, respond ONLY with the person number (e.g., "1", "2", "3", etc.)
If no confident match, respond ONLY with "NO_MATCH"

Do not include any explanation, just the result.`;

    // Build the content array with images
    const content: any[] = [
      { type: "text", text: prompt },
      { 
        type: "image_url", 
        image_url: { url: imageData }
      }
    ];

    // Add reference images
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const faceProfile = emp.face_profiles?.[0];
      if (faceProfile?.image_url) {
        // Convert Supabase storage URL to public URL if needed
        let imageUrl = faceProfile.image_url;
        if (!imageUrl.startsWith('http')) {
          imageUrl = `${supabaseUrl}/storage/v1/object/public/${imageUrl}`;
        }
        
        content.push({
          type: "image_url",
          image_url: { url: imageUrl }
        });
      }
    }

    console.log('Calling Gemini Vision API...');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact administrator.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const result = aiData.choices?.[0]?.message?.content?.trim();
    
    console.log('AI recognition result:', result);

    if (!result || result === 'NO_MATCH') {
      return new Response(
        JSON.stringify({ 
          matched: false,
          message: 'No matching employee found with sufficient confidence'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the person number
    const personNumber = parseInt(result);
    if (isNaN(personNumber) || personNumber < 1 || personNumber > employees.length) {
      console.error('Invalid person number from AI:', result);
      return new Response(
        JSON.stringify({ 
          matched: false,
          message: 'Recognition failed - invalid response'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const matchedEmployee = employees[personNumber - 1];
    console.log('Matched employee:', matchedEmployee.first_name, matchedEmployee.last_name);

    return new Response(
      JSON.stringify({
        matched: true,
        employee: {
          id: matchedEmployee.id,
          first_name: matchedEmployee.first_name,
          last_name: matchedEmployee.last_name,
          employee_number: matchedEmployee.employee_number
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in face-recognition function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
