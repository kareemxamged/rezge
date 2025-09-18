import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 بدء Edge Function: update-user-password')
    
    const { userId, newPassword } = await req.json()
    
    if (!userId || !newPassword) {
      console.log('❌ معاملات مفقودة:', { userId: !!userId, newPassword: !!newPassword })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'معاملات مفقودة: userId أو newPassword' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log('📧 تحديث كلمة المرور للمستخدم:', userId)

    // إنشاء عميل Supabase مع service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // تحديث كلمة المرور باستخدام Admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (error) {
      console.error('❌ خطأ في تحديث كلمة المرور:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'فشل في تحديث كلمة المرور: ' + error.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('✅ تم تحديث كلمة المرور بنجاح للمستخدم:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم تحديث كلمة المرور بنجاح' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('💥 خطأ غير متوقع:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'حدث خطأ غير متوقع: ' + error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
