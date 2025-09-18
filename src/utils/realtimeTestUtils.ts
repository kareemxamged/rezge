// أدوات اختبار نظام التحديث التلقائي
import { supabase } from '../lib/supabase';

export class RealtimeTestUtils {
  private static isRunning = false;
  private static lastRunTime = 0;
  private static readonly MIN_INTERVAL = 30000; // 30 ثانية على الأقل بين الاختبارات
  // اختبار الاتصال بـ Supabase Realtime
  static async testRealtimeConnection(): Promise<boolean> {
    try {
      const channel = supabase.channel('test_connection');
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          supabase.removeChannel(channel);
          resolve(false);
        }, 5000);

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            supabase.removeChannel(channel);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('❌ Realtime connection test failed:', error);
      return false;
    }
  }

  // اختبار جلب البيانات
  static async testDataFetching(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        console.error('❌ Data fetching test failed:', error);
        return false;
      }

      console.log('✅ Data fetching test passed');
      return true;
    } catch (error) {
      console.error('❌ Data fetching test failed:', error);
      return false;
    }
  }

  // اختبار شامل للنظام
  static async runSystemTests(): Promise<{
    realtimeConnection: boolean;
    dataFetching: boolean;
    overall: boolean;
  }> {
    // منع التشغيل المتكرر
    const now = Date.now();
    if (this.isRunning || (now - this.lastRunTime) < this.MIN_INTERVAL) {
      console.log('⏭️ Skipping realtime tests - too frequent or already running');
      return {
        realtimeConnection: true,
        dataFetching: true,
        overall: true
      };
    }

    this.isRunning = true;
    this.lastRunTime = now;

    try {
      console.log('🧪 Running realtime system tests...');

      const realtimeConnection = await this.testRealtimeConnection();
      const dataFetching = await this.testDataFetching();
      const overall = realtimeConnection && dataFetching;

      const results = {
        realtimeConnection,
        dataFetching,
        overall
      };

      console.log('📊 Test Results:', results);

      if (overall) {
        console.log('✅ All tests passed! Realtime system is working correctly.');
      } else {
        console.log('❌ Some tests failed. Please check the configuration.');
      }

      return results;
    } finally {
      this.isRunning = false;
    }
  }

  // تسجيل معلومات النظام
  static logSystemInfo() {
    console.log('📋 Realtime System Info:');
    // استخدام القيم الافتراضية من supabase.ts
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://sbtzngewizgeqzfbhfjy.supabase.co';
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

    console.log('- Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('- Supabase Anon Key:', supabaseKey ? '✅ Set' : '❌ Missing');
    console.log('- Browser WebSocket Support:', 'WebSocket' in window ? '✅ Supported' : '❌ Not Supported');
    console.log('- Current Time:', new Date().toISOString());
  }
}

// دالة مساعدة لتشغيل الاختبارات في وضع التطوير
export const runRealtimeTests = async () => {
  if (process.env.NODE_ENV === 'development') {
    // فحص إضافي لمنع التشغيل المتكرر
    const now = Date.now();
    if (RealtimeTestUtils['isRunning'] || (now - RealtimeTestUtils['lastRunTime']) < RealtimeTestUtils['MIN_INTERVAL']) {
      console.log('⏭️ Skipping realtime tests - called too frequently');
      return;
    }

    RealtimeTestUtils.logSystemInfo();
    await RealtimeTestUtils.runSystemTests();
  }
};

export default RealtimeTestUtils;
