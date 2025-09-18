import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// مفتاح Resend API
const RESEND_API_KEY = 're_Eeyyz27p_A9UUaYMYoj5Q2xKqRygMJCQU'

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  type?: string
}

serve(async (req) => {
  // معالجة CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  }

  try {
    const emailData: EmailRequest = await req.json()
    
    console.log(`📧 محاولة إرسال إيميل إلى: ${emailData.to}`)
    console.log(`📝 الموضوع: ${emailData.subject}`)

    // التحقق من البيانات المطلوبة
    if (!emailData.to || !emailData.subject || !emailData.html) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, subject, html' 
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }

    // إرسال عبر Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'رزجة <manage@kareemamged.com>',
        to: [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || 'نسخة نصية من الإيميل'
      })
    })
    
    if (resendResponse.ok) {
      const resendResult = await resendResponse.json()
      console.log('✅ تم إرسال الإيميل بنجاح عبر Resend API')
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          method: 'Resend API via Edge Function',
          messageId: resendResult.id,
          message: 'Email sent successfully'
        }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    } else {
      const resendError = await resendResponse.text()
      console.log('❌ فشل Resend API:', resendError)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Resend API failed',
          details: resendError
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }
    
  } catch (error) {
    console.error('❌ خطأ عام في Edge Function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  }
})
