/**
 * مدير الاتصال مع Supabase
 * يتعامل مع أخطاء الشبكة وإعادة المحاولة التلقائية
 */

import React from 'react';
import { supabase, retrySupabaseRequest, handleSupabaseError } from '../lib/supabase';

export interface ConnectionStatus {
  isOnline: boolean;
  isSupabaseReachable: boolean;
  lastChecked: Date;
  errorCount: number;
  isRecovering: boolean;
  autoRetryEnabled: boolean;
  lastSuccessfulConnection: Date;
}

class ConnectionManager {
  private status: ConnectionStatus = {
    isOnline: navigator.onLine,
    isSupabaseReachable: true,
    lastChecked: new Date(),
    errorCount: 0,
    isRecovering: false,
    autoRetryEnabled: true,
    lastSuccessfulConnection: new Date()
  };

  private listeners: ((status: ConnectionStatus) => void)[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;
  private retryAttempts = 0;
  private maxRetryAttempts = 10; // زيادة عدد المحاولات
  private silentMode = true; // تفعيل الوضع الصامت افتراضياً

  constructor() {
    this.setupEventListeners();
    this.startPeriodicCheck();
  }

  /**
   * إعداد مستمعي الأحداث
   */
  private setupEventListeners() {
    // مراقبة حالة الإنترنت
    window.addEventListener('online', () => {
      this.updateStatus({ isOnline: true });
      this.checkSupabaseConnection();
    });

    window.addEventListener('offline', () => {
      this.updateStatus({ isOnline: false, isSupabaseReachable: false });
    });

    // مراقبة أخطاء Supabase
    window.addEventListener('supabase-connection-error', (event: any) => {
      this.handleConnectionError(event.detail);
    });
  }

  /**
   * بدء الفحص الدوري للاتصال
   */
  private startPeriodicCheck() {
    this.checkInterval = setInterval(() => {
      if (this.status.isOnline) {
        this.checkSupabaseConnection();
      }
    }, 30000); // فحص كل 30 ثانية
  }

  /**
   * فحص الاتصال مع Supabase
   */
  private async checkSupabaseConnection(): Promise<boolean> {
    try {
      // محاولة طلب بسيط للتحقق من الاتصال مع timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });

      const connectionPromise = supabase
        .from('users')
        .select('id')
        .limit(1);

      const { error } = await Promise.race([connectionPromise, timeoutPromise]) as any;

      const isReachable = !error || !this.isConnectionError(error);

      if (isReachable) {
        this.resetRetryState();
        this.updateStatus({
          isSupabaseReachable: true,
          lastChecked: new Date(),
          errorCount: 0,
          lastSuccessfulConnection: new Date()
        });
      } else {
        this.updateStatus({
          isSupabaseReachable: false,
          lastChecked: new Date(),
          errorCount: this.status.errorCount + 1
        });
      }

      return isReachable;
    } catch (error) {
      this.updateStatus({
        isSupabaseReachable: false,
        lastChecked: new Date(),
        errorCount: this.status.errorCount + 1
      });

      return false;
    }
  }

  /**
   * معالجة أخطاء الاتصال
   */
  private handleConnectionError(detail: { error: any; context?: string }) {
    const { error, context } = detail;

    this.updateStatus({
      isSupabaseReachable: false,
      errorCount: this.status.errorCount + 1
    });

    // بدء إعادة المحاولة التلقائية
    this.startAutoRetry();

    handleSupabaseError(error, context);
  }

  /**
   * بدء إعادة المحاولة التلقائية (بصمت)
   */
  private startAutoRetry() {
    if (!this.status.autoRetryEnabled || this.status.isRecovering) {
      return;
    }

    if (this.retryAttempts >= this.maxRetryAttempts) {
      // في الوضع الصامت، نستمر في المحاولة بفترات أطول
      if (this.silentMode) {
        this.startLongTermRetry();
        return;
      }
      console.warn('🔄 تم الوصول للحد الأقصى من محاولات إعادة الاتصال');
      this.suggestSolutions();
      return;
    }

    this.updateStatus({ isRecovering: true });
    this.retryAttempts++;

    // حساب التأخير مع Exponential Backoff (أسرع في البداية)
    const delay = Math.min(500 * Math.pow(1.5, this.retryAttempts - 1), 10000); // حد أقصى 10 ثواني

    if (!this.silentMode) {
      console.log(`🔄 محاولة إعادة الاتصال ${this.retryAttempts}/${this.maxRetryAttempts} خلال ${delay}ms`);
    }

    this.retryTimeout = setTimeout(async () => {
      try {
        const isConnected = await this.checkSupabaseConnection();
        if (isConnected) {
          console.log('✅ تم استعادة الاتصال بنجاح');
          this.resetRetryState();
          this.updateStatus({
            lastSuccessfulConnection: new Date(),
            isRecovering: false
          });
        } else {
          // إعادة المحاولة مرة أخرى
          this.updateStatus({ isRecovering: false });
          this.startAutoRetry();
        }
      } catch (error) {
        console.error('فشل في إعادة المحاولة:', error);
        this.updateStatus({ isRecovering: false });
        this.startAutoRetry();
      }
    }, delay);
  }

  /**
   * بدء محاولات طويلة المدى (كل دقيقة)
   */
  private startLongTermRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(async () => {
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        this.startLongTermRetry(); // استمرار المحاولة
      }
    }, 60000); // محاولة كل دقيقة
  }

  /**
   * إعادة تعيين حالة إعادة المحاولة
   */
  private resetRetryState() {
    this.retryAttempts = 0;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  /**
   * اقتراح حلول للمستخدم (فقط في الوضع غير الصامت)
   */
  private suggestSolutions() {
    // في الوضع الصامت، لا نعرض أي رسائل للمستخدم
    if (this.silentMode) {
      console.log('🔄 الاتصال منقطع، سيتم المحاولة تلقائياً في الخلفية');
      this.startLongTermRetry();
      return;
    }

    const solutions = [
      'تحقق من اتصال الإنترنت',
      'أعد تحميل الصفحة',
      'امسح ذاكرة التخزين المؤقت',
      'جرب متصفح آخر'
    ];

    console.warn('🔧 اقتراحات لحل مشكلة الاتصال:', solutions);

    // إرسال إشعار للواجهة (فقط في الوضع غير الصامت)
    const event = new CustomEvent('connection-solutions', {
      detail: { solutions, errorCount: this.status.errorCount, autoRetryFailed: true }
    });
    window.dispatchEvent(event);
  }

  /**
   * تحديث حالة الاتصال
   */
  private updateStatus(updates: Partial<ConnectionStatus>) {
    this.status = { ...this.status, ...updates };
    this.notifyListeners();
  }

  /**
   * إشعار المستمعين بتغيير الحالة
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.status));
  }

  /**
   * فحص ما إذا كان الخطأ متعلق بالاتصال
   */
  private isConnectionError(error: any): boolean {
    const errorMessage = error?.message || '';
    return errorMessage.includes('Failed to fetch') ||
           errorMessage.includes('ERR_CONNECTION_CLOSED') ||
           errorMessage.includes('NetworkError') ||
           error?.name === 'AbortError';
  }

  /**
   * إضافة مستمع لتغييرات حالة الاتصال
   */
  public addStatusListener(listener: (status: ConnectionStatus) => void) {
    this.listeners.push(listener);
    // إرسال الحالة الحالية فوراً
    listener(this.status);
  }

  /**
   * إزالة مستمع
   */
  public removeStatusListener(listener: (status: ConnectionStatus) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * تفعيل/إلغاء الوضع الصامت
   */
  public setSilentMode(silent: boolean) {
    this.silentMode = silent;
    console.log(`🔇 الوضع الصامت: ${silent ? 'مفعل' : 'معطل'}`);
  }

  /**
   * الحصول على حالة الوضع الصامت
   */
  public isSilentMode(): boolean {
    return this.silentMode;
  }

  /**
   * الحصول على حالة الاتصال الحالية
   */
  public getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * فحص الاتصال يدوياً
   */
  public async checkConnection(): Promise<boolean> {
    return this.checkSupabaseConnection();
  }

  /**
   * إعادة تعيين عداد الأخطاء
   */
  public resetErrorCount() {
    this.updateStatus({ errorCount: 0 });
  }

  /**
   * تنظيف الموارد
   */
  public cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.listeners = [];
  }
}

// إنشاء مثيل واحد من مدير الاتصال
export const connectionManager = new ConnectionManager();

/**
 * Hook لاستخدام حالة الاتصال في React
 */
export const useConnectionStatus = () => {
  const [status, setStatus] = React.useState<ConnectionStatus>(
    connectionManager.getStatus()
  );

  React.useEffect(() => {
    connectionManager.addStatusListener(setStatus);
    
    return () => {
      connectionManager.removeStatusListener(setStatus);
    };
  }, []);

  return status;
};

/**
 * دالة مساعدة لتنفيذ طلبات Supabase مع معالجة الأخطاء
 */
export const executeSupabaseRequest = async <T>(
  requestFn: () => Promise<T>,
  context?: string,
  maxRetries = 3
): Promise<T> => {
  try {
    return await retrySupabaseRequest(requestFn, maxRetries);
  } catch (error) {
    handleSupabaseError(error, context);
    throw error;
  }
};

/**
 * دالة للتحقق من صحة الاتصال قبل تنفيذ طلب مهم
 */
export const ensureConnection = async (): Promise<boolean> => {
  const status = connectionManager.getStatus();
  
  if (!status.isOnline) {
    throw new Error('لا يوجد اتصال بالإنترنت');
  }
  
  if (!status.isSupabaseReachable) {
    const isReachable = await connectionManager.checkConnection();
    if (!isReachable) {
      throw new Error('لا يمكن الوصول إلى خادم البيانات');
    }
  }
  
  return true;
};

export default connectionManager;
