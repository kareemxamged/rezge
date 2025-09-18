import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  senderName: string;
  senderEmail: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { smtpConfig, emailData }: { smtpConfig: SMTPConfig; emailData: EmailData } = await req.json()

    console.log('📧 بدء إرسال الإيميل المباشر...')
    console.log(`📬 إلى: ${emailData.to}`)
    console.log(`📝 الموضوع: ${emailData.subject}`)

    // استخدام nodemailer عبر fetch API
    const nodemailerResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: 'smtp_service',
        template_id: 'custom_template',
        user_id: 'user_smtp',
        template_params: {
          to_email: emailData.to,
          from_name: smtpConfig.senderName,
          from_email: smtpConfig.senderEmail,
          subject: emailData.subject,
          html_content: emailData.html,
          text_content: emailData.text,
        },
        smtp_config: {
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass
          }
        }
      })
    })

    if (!nodemailerResponse.ok) {
      throw new Error(`SMTP sending failed: ${nodemailerResponse.status}`)
    }

    console.log('✅ تم إرسال الإيميل بنجاح')

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ خطأ في إرسال الإيميل:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
