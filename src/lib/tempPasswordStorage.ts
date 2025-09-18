/**
 * نظام تخزين مؤقت لكلمات المرور المؤقتة في localStorage
 * هذا حل مؤقت حتى يتم إصلاح مشكلة قاعدة البيانات
 */

interface TempPasswordData {
  email: string;
  password: string;
  expiresAt: string;
  createdAt: string;
}

const STORAGE_KEY = 'temp_passwords_storage';

export class TempPasswordStorage {
  
  /**
   * حفظ كلمة مرور مؤقتة
   */
  static save(email: string, password: string, expiresAt: string): void {
    try {
      const data: TempPasswordData = {
        email: email.toLowerCase(),
        password,
        expiresAt,
        createdAt: new Date().toISOString()
      };
      
      // الحصول على البيانات الموجودة
      const existing = this.getAll();
      
      // إزالة أي كلمات مرور قديمة لنفس البريد الإلكتروني
      const filtered = existing.filter(item => item.email !== email.toLowerCase());
      
      // إضافة كلمة المرور الجديدة
      filtered.push(data);
      
      // حفظ في localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      
      console.log('💾 تم حفظ كلمة المرور المؤقتة في localStorage:', {
        email: email.toLowerCase(),
        password,
        expiresAt
      });
      
    } catch (error) {
      console.error('❌ فشل في حفظ كلمة المرور المؤقتة:', error);
    }
  }
  
  /**
   * البحث عن كلمة مرور مؤقتة
   */
  static find(email: string, password: string): TempPasswordData | null {
    try {
      const all = this.getAll();
      const now = new Date();
      
      // البحث عن كلمة مرور مطابقة وغير منتهية الصلاحية
      const found = all.find(item => 
        item.email === email.toLowerCase() && 
        item.password === password &&
        new Date(item.expiresAt) > now
      );
      
      console.log('🔍 البحث عن كلمة مرور مؤقتة:', {
        email: email.toLowerCase(),
        password,
        found: !!found,
        totalRecords: all.length
      });
      
      return found || null;
      
    } catch (error) {
      console.error('❌ فشل في البحث عن كلمة المرور المؤقتة:', error);
      return null;
    }
  }
  
  /**
   * حذف كلمة مرور مؤقتة بعد الاستخدام
   */
  static remove(email: string, password: string): void {
    try {
      const existing = this.getAll();
      const filtered = existing.filter(item => 
        !(item.email === email.toLowerCase() && item.password === password)
      );
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      
      console.log('🗑️ تم حذف كلمة المرور المؤقتة من localStorage:', {
        email: email.toLowerCase(),
        password
      });
      
    } catch (error) {
      console.error('❌ فشل في حذف كلمة المرور المؤقتة:', error);
    }
  }
  
  /**
   * الحصول على جميع كلمات المرور المؤقتة
   */
  static getAll(): TempPasswordData[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ فشل في قراءة كلمات المرور المؤقتة:', error);
      return [];
    }
  }
  
  /**
   * تنظيف كلمات المرور المنتهية الصلاحية
   */
  static cleanup(): void {
    try {
      const all = this.getAll();
      const now = new Date();
      
      const valid = all.filter(item => new Date(item.expiresAt) > now);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      
      const removed = all.length - valid.length;
      if (removed > 0) {
        console.log(`🧹 تم تنظيف ${removed} كلمة مرور منتهية الصلاحية`);
      }
      
    } catch (error) {
      console.error('❌ فشل في تنظيف كلمات المرور المؤقتة:', error);
    }
  }
  
  /**
   * حذف جميع كلمات المرور المؤقتة
   */
  static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ تم حذف جميع كلمات المرور المؤقتة من localStorage');
    } catch (error) {
      console.error('❌ فشل في حذف كلمات المرور المؤقتة:', error);
    }
  }
}
