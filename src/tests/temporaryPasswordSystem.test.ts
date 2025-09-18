import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  createTemporaryPassword,
  verifyTemporaryPassword,
  sendTemporaryPasswordViaSupabase,
  updatePasswordWithTempPassword,
  checkIfTemporaryPassword,
  cleanupExpiredBlocks
} from '../lib/temporaryPasswordService';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          gt: vi.fn(() => ({
            order: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        })),
        lt: vi.fn(() => ({
          select: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
        lt: vi.fn()
      }))
    })),
    auth: {
      resetPasswordForEmail: vi.fn()
    },
    rpc: vi.fn()
  }
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(() => Promise.resolve('hashed_password')),
    compare: vi.fn(() => Promise.resolve(true))
  }
}));

describe('نظام كلمات المرور المؤقتة', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createTemporaryPassword', () => {
    it('يجب أن ينشئ كلمة مرور مؤقتة للمستخدم الموجود', async () => {
      // Mock user exists
      const mockUser = { id: 'user-123', first_name: 'أحمد', email: 'test@example.com' };
      const { supabase } = await import('../lib/supabase');
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockUser, error: null }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
          }))
        }))
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

      const result = await createTemporaryPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.recipientName).toBe('أحمد');
    });

    it('يجب أن يعيد رسالة نجاح وهمية للبريد غير المسجل', async () => {
      const { supabase } = await import('../lib/supabase');
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { code: 'PGRST116' } 
            }))
          }))
        }))
      } as any);

      const result = await createTemporaryPassword('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(result.isEmailNotRegistered).toBe(true);
      expect(result.temporaryPassword).toBe('dummy_password');
    });

    it('يجب أن يتعامل مع أخطاء قاعدة البيانات', async () => {
      const { supabase } = await import('../lib/supabase');
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Database error' } 
            }))
          }))
        }))
      } as any);

      const result = await createTemporaryPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('auth.forgotPassword.messages.createPasswordError');
    });
  });

  describe('verifyTemporaryPassword', () => {
    it('يجب أن يتحقق من كلمة المرور المؤقتة الصحيحة', async () => {
      const mockTempPassword = {
        id: 'temp-123',
        temp_password_hash: 'hashed_password',
        is_first_use: true
      };

      const { supabase } = await import('../lib/supabase');
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gt: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ 
                  data: [mockTempPassword], 
                  error: null 
                }))
              }))
            }))
          }))
        }))
      } as any);

      const result = await verifyTemporaryPassword('test@example.com', 'temp_password');

      expect(result.isValid).toBe(true);
      expect(result.isTemporary).toBe(true);
      expect(result.tempPasswordId).toBe('temp-123');
      expect(result.isFirstUse).toBe(true);
    });

    it('يجب أن يرفض كلمة المرور المؤقتة غير الصحيحة', async () => {
      const { supabase } = await import('../lib/supabase');
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gt: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ 
                  data: [], 
                  error: null 
                }))
              }))
            }))
          }))
        }))
      } as any);

      const result = await verifyTemporaryPassword('test@example.com', 'wrong_password');

      expect(result.isValid).toBe(false);
    });
  });

  describe('sendTemporaryPasswordViaSupabase', () => {
    it('يجب أن يرسل كلمة المرور المؤقتة بنجاح', async () => {
      const { supabase } = await import('../lib/supabase');
      
      // Mock createTemporaryPassword success
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { id: 'user-123', first_name: 'أحمد' }, 
              error: null 
            }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
          }))
        }))
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ 
        data: {}, 
        error: null 
      });

      const result = await sendTemporaryPasswordViaSupabase('test@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toBe('تم إرسال كلمة المرور المؤقتة إلى بريدك الإلكتروني');
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('temporary-password-login')
        })
      );
    });

    it('يجب أن يتعامل مع أخطاء إرسال البريد الإلكتروني', async () => {
      const { supabase } = await import('../lib/supabase');
      
      // Mock createTemporaryPassword success
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { id: 'user-123', first_name: 'أحمد' }, 
              error: null 
            }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
          }))
        }))
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ 
        data: null, 
        error: { message: 'Email sending failed' } 
      });

      const result = await sendTemporaryPasswordViaSupabase('test@example.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('فشل في إرسال الإيميل');
      expect(result.error).toBe('Email sending failed');
    });
  });

  describe('updatePasswordWithTempPassword', () => {
    it('يجب أن يحدث كلمة المرور بنجاح', async () => {
      const { supabase } = await import('../lib/supabase');
      
      vi.mocked(supabase.rpc).mockResolvedValue({ 
        data: { success: true }, 
        error: null 
      });

      const result = await updatePasswordWithTempPassword(
        'test@example.com',
        'temp_password',
        'new_password'
      );

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('update_password_with_temp', {
        user_email: 'test@example.com',
        temp_password: 'temp_password',
        new_password: 'new_password'
      });
    });

    it('يجب أن يتعامل مع فشل تحديث كلمة المرور', async () => {
      const { supabase } = await import('../lib/supabase');
      
      vi.mocked(supabase.rpc).mockResolvedValue({ 
        data: { success: false, error: 'كلمة المرور المؤقتة غير صحيحة' }, 
        error: null 
      });

      const result = await updatePasswordWithTempPassword(
        'test@example.com',
        'wrong_temp_password',
        'new_password'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('كلمة المرور المؤقتة غير صحيحة');
    });
  });

  describe('checkIfTemporaryPassword', () => {
    it('يجب أن يتحقق من كون كلمة المرور مؤقتة', async () => {
      const mockTempPassword = {
        id: 'temp-123',
        temp_password_hash: 'hashed_password',
        is_first_use: true
      };

      const { supabase } = await import('../lib/supabase');
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gt: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ 
                  data: [mockTempPassword], 
                  error: null 
                }))
              }))
            }))
          }))
        }))
      } as any);

      const result = await checkIfTemporaryPassword('test@example.com', 'temp_password');

      expect(result.isTemporary).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.tempPasswordId).toBe('temp-123');
    });
  });

  describe('cleanupExpiredBlocks', () => {
    it('يجب أن ينظف الحسابات المحظورة منتهية الصلاحية', async () => {
      const { supabase } = await import('../lib/supabase');
      
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn(() => ({
          lt: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({ 
              data: [{ id: '1' }, { id: '2' }], 
              error: null 
            }))
          }))
        }))
      } as any);

      const result = await cleanupExpiredBlocks();

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(2);
    });
  });
});

// اختبارات التكامل
describe('اختبارات التكامل - نظام كلمات المرور المؤقتة', () => {
  it('يجب أن يعمل التدفق الكامل: إنشاء -> إرسال -> تحقق -> تحديث', async () => {
    // هذا اختبار تكامل يتطلب قاعدة بيانات حقيقية
    // يمكن تشغيله في بيئة الاختبار مع قاعدة بيانات منفصلة
    
    const email = 'integration.test@example.com';
    
    // 1. إنشاء كلمة مرور مؤقتة
    const createResult = await createTemporaryPassword(email);
    expect(createResult.success).toBe(true);
    
    if (createResult.success && createResult.temporaryPassword) {
      // 2. التحقق من كلمة المرور المؤقتة
      const verifyResult = await verifyTemporaryPassword(email, createResult.temporaryPassword);
      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.isTemporary).toBe(true);
      
      // 3. تحديث كلمة المرور
      const updateResult = await updatePasswordWithTempPassword(
        email,
        createResult.temporaryPassword,
        'new_secure_password_123!'
      );
      expect(updateResult.success).toBe(true);
      
      // 4. التأكد من أن كلمة المرور المؤقتة لم تعد صالحة
      const verifyAfterUse = await verifyTemporaryPassword(email, createResult.temporaryPassword);
      expect(verifyAfterUse.isValid).toBe(false);
    }
  });
});
