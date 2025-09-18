import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, text, type }: EmailRequest = await req.json()

    // Validate input
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Resend API key from environment or use the provided key
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || 're_YrvygStJ_EWyFv3jnpzR9BbZP78iA1ZXm'

    console.log('🚀 محاولة إرسال إيميل فعلي عبر Supabase Edge Function...')

    // Send email using Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>',
        to: [to],
        subject: subject,
        html: html,
        text: text,
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Email sent successfully via Resend:', { to, subject, type })
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          method: 'Resend API',
          messageId: result.id 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      const errorText = await response.text()
      console.error('❌ Resend API error:', errorText)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Resend API error: ${response.status} - ${errorText}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('❌ Function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Function error: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* To deploy this function:
1. Make sure you have Supabase CLI installed
2. Run: supabase functions deploy send-email
3. Set the RESEND_API_KEY secret: supabase secrets set RESEND_API_KEY=your_resend_api_key
4. Test the function in your application
*/
