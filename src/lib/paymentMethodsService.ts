import { supabase } from './supabase';

export interface PaymentMethodConfig {
  id: string;
  name: string;
  name_en: string;
  enabled: boolean;
  fees: number;
  min_amount: number;
  max_amount: number;
  countries: string[];
  currency: string;
  processing_time: string;
  description: string;
  api_settings?: {
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

export class PaymentMethodsService {
  /**
   * الحصول على جميع إعدادات طرق الدفع
   */
  static async getAllPaymentMethods(): Promise<PaymentMethodConfig[]> {
    try {
      const { data, error } = await supabase
        .from('payment_methods_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment methods:', error);
        return this.getDefaultPaymentMethods();
      }

      return data || this.getDefaultPaymentMethods();
    } catch (error) {
      console.error('Error in getAllPaymentMethods:', error);
      return this.getDefaultPaymentMethods();
    }
  }

  /**
   * الحصول على إعدادات طريقة دفع محددة
   */
  static async getPaymentMethod(methodId: string): Promise<PaymentMethodConfig | null> {
    try {
      const { data, error } = await supabase
        .from('payment_methods_config')
        .select('*')
        .eq('id', methodId)
        .single();

      if (error) {
        console.error('Error fetching payment method:', error);
        return this.getDefaultPaymentMethod(methodId);
      }

      return data;
    } catch (error) {
      console.error('Error in getPaymentMethod:', error);
      return this.getDefaultPaymentMethod(methodId);
    }
  }

  /**
   * حفظ أو تحديث إعدادات طريقة دفع
   */
  static async savePaymentMethod(config: PaymentMethodConfig): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_methods_config')
        .upsert({
          id: config.id,
          name: config.name,
          name_en: config.name_en,
          enabled: config.enabled,
          fees: config.fees,
          min_amount: config.min_amount,
          max_amount: config.max_amount,
          countries: config.countries,
          currency: config.currency,
          processing_time: config.processing_time,
          description: config.description,
          api_settings: config.api_settings || {},
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
      throw error;
    }
  }

  /**
   * حذف طريقة دفع
   */
  static async deletePaymentMethod(methodId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_methods_config')
        .delete()
        .eq('id', methodId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  /**
   * تفعيل أو إلغاء تفعيل طريقة دفع
   */
  static async togglePaymentMethod(methodId: string, enabled: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_methods_config')
        .update({ 
          enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', methodId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error toggling payment method:', error);
      throw error;
    }
  }

  /**
   * الحصول على طرق الدفع الافتراضية
   */
  static getDefaultPaymentMethods(): PaymentMethodConfig[] {
    return [
      {
        id: 'creditcard',
        name: 'البطاقات الائتمانية',
        name_en: 'Credit Cards',
        enabled: true,
        fees: 2.75,
        min_amount: 10,
        max_amount: 50000,
        countries: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO'],
        currency: 'SAR',
        processing_time: 'instant',
        description: 'فيزا، ماستركارد - عبر PayTabs',
        api_settings: {
          paytabs_enabled: true,
          supported_cards: ['visa', 'mastercard']
        }
      },
      {
        id: 'mada',
        name: 'مدى',
        name_en: 'Mada',
        enabled: true,
        fees: 2.0,
        min_amount: 10,
        max_amount: 30000,
        countries: ['SA'],
        currency: 'SAR',
        processing_time: 'instant',
        description: 'بطاقة مدى السعودية - عبر PayTabs',
        api_settings: {
          paytabs_enabled: true,
          mada_specific: true
        }
      },
      {
        id: 'stcpay',
        name: 'STC Pay',
        name_en: 'STC Pay',
        enabled: true,
        fees: 1.5,
        min_amount: 5,
        max_amount: 10000,
        countries: ['SA'],
        currency: 'SAR',
        processing_time: 'instant',
        description: 'محفظة STC Pay الرقمية - عبر PayTabs',
        api_settings: {
          paytabs_enabled: true,
          stc_integration: true
        }
      },
      {
        id: 'applepay',
        name: 'Apple Pay',
        name_en: 'Apple Pay',
        enabled: true,
        fees: 2.75,
        min_amount: 10,
        max_amount: 25000,
        countries: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'],
        currency: 'SAR',
        processing_time: 'instant',
        description: 'الدفع عبر Apple Pay - عبر PayTabs',
        api_settings: {
          paytabs_enabled: true,
          apple_merchant_id: 'merchant.com.yourapp'
        }
      },
      {
        id: 'banktransfer',
        name: 'التحويل البنكي',
        name_en: 'Bank Transfer',
        enabled: true,
        fees: 0,
        min_amount: 50,
        max_amount: 100000,
        countries: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'],
        currency: 'SAR',
        processing_time: '1-24_hours',
        description: 'تحويل مباشر إلى الحساب البنكي',
        api_settings: {
          manual_verification: true,
          bank_details_required: true
        }
      }
    ];
  }

  /**
   * الحصول على طريقة دفع افتراضية محددة
   */
  static getDefaultPaymentMethod(methodId: string): PaymentMethodConfig | null {
    const defaultMethods = this.getDefaultPaymentMethods();
    return defaultMethods.find(method => method.id === methodId) || null;
  }

  /**
   * التحقق من صحة إعدادات طريقة الدفع
   */
  static validatePaymentMethodConfig(config: PaymentMethodConfig): string[] {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('اسم طريقة الدفع مطلوب');
    }

    if (config.fees < 0 || config.fees > 10) {
      errors.push('نسبة الرسوم يجب أن تكون بين 0% و 10%');
    }

    if (config.min_amount < 0) {
      errors.push('الحد الأدنى للمبلغ يجب أن يكون أكبر من 0');
    }

    if (config.max_amount <= config.min_amount) {
      errors.push('الحد الأقصى للمبلغ يجب أن يكون أكبر من الحد الأدنى');
    }

    if (!config.countries || config.countries.length === 0) {
      errors.push('يجب اختيار دولة واحدة على الأقل');
    }

    if (!config.currency || config.currency.trim().length === 0) {
      errors.push('العملة مطلوبة');
    }

    return errors;
  }

  /**
   * الحصول على طرق الدفع المفعلة فقط
   */
  static async getEnabledPaymentMethods(): Promise<PaymentMethodConfig[]> {
    try {
      const allMethods = await this.getAllPaymentMethods();
      return allMethods.filter(method => method.enabled);
    } catch (error) {
      console.error('Error getting enabled payment methods:', error);
      return this.getDefaultPaymentMethods().filter(method => method.enabled);
    }
  }

  /**
   * الحصول على طرق الدفع المتاحة لدولة محددة
   */
  static async getPaymentMethodsForCountry(countryCode: string): Promise<PaymentMethodConfig[]> {
    try {
      const allMethods = await this.getEnabledPaymentMethods();
      return allMethods.filter(method => method.countries.includes(countryCode));
    } catch (error) {
      console.error('Error getting payment methods for country:', error);
      return [];
    }
  }

  /**
   * حساب الرسوم لطريقة دفع ومبلغ محدد
   */
  static calculateFees(amount: number, methodConfig: PaymentMethodConfig): number {
    return (amount * methodConfig.fees) / 100;
  }

  /**
   * التحقق من أن المبلغ ضمن الحدود المسموحة
   */
  static isAmountValid(amount: number, methodConfig: PaymentMethodConfig): boolean {
    return amount >= methodConfig.min_amount && amount <= methodConfig.max_amount;
  }
}
