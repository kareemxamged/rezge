import { supabase } from './supabase';
import { adminAuthService } from './adminAuthService';
import type { AdminUser, AdminRole, AdminPermission } from './adminAuthService';

export interface CreateAdminUserData {
  email: string;
  password: string;
  role_id: string;
  is_super_admin?: boolean;
}

export interface UpdateAdminUserData {
  role_id?: string;
  is_active?: boolean;
  is_super_admin?: boolean;
}

export interface AdminUserWithDetails extends AdminUser {
  total_logins?: number;
  last_activity?: string;
  permissions_count?: number;
}

class AdminManagementService {
  // الحصول على جميع المشرفين
  async getAllAdminUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    roleFilter?: string,
    statusFilter?: string
  ): Promise<{
    data: AdminUserWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      // استعلام أساسي للحصول على المشرفين مع الأدوار
      let query = supabase
        .from('admin_users')
        .select(`
          *,
          role:admin_roles(*)
        `, { count: 'exact' });

      // تطبيق الفلاتر
      if (search) {
        // البحث في معرف المستخدم أو معرف الدور
        query = query.or(`user_id.ilike.%${search}%,role_id.ilike.%${search}%`);
      }

      if (roleFilter) {
        query = query.eq('role_id', roleFilter);
      }

      if (statusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false);
      }

      // تطبيق الترقيم
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin users:', error);
        throw error;
      }

      // جلب بيانات المستخدمين منفصلة
      const enrichedData = await Promise.all((data || []).map(async (adminUser) => {
        const { data: userData } = await supabase
          .from('users')
          .select('email, first_name, last_name, profile_image_url')
          .eq('id', adminUser.user_id)
          .single();

        return {
          ...adminUser,
          user_profile: userData
        };
      }));

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        data: enrichedData,
        total: count || 0,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error('Error in getAllAdminUsers:', error);
      throw error;
    }
  }

  // إنشاء مشرف جديد
  async createAdminUser(adminData: CreateAdminUserData): Promise<AdminUser> {
    try {
      // التحقق من الصلاحيات
      const hasPermission = await adminAuthService.hasPermission('manage_admins');
      if (!hasPermission) {
        throw new Error('ليس لديك صلاحية لإنشاء مشرفين جدد');
      }

      // إنشاء المستخدم في auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: adminData.email,
        password: adminData.password,
        email_confirm: true
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw authError;
      }

      if (!authUser.user) {
        throw new Error('فشل في إنشاء المستخدم');
      }

      // إنشاء المستخدم في جدول users
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: adminData.email,
          first_name: adminData.email.split('@')[0],
          last_name: 'مشرف',
          created_at: new Date().toISOString()
        });

      if (userError) {
        console.error('Error creating user profile:', userError);
        // حذف المستخدم من auth إذا فشل إنشاء الملف الشخصي
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw userError;
      }

      // إنشاء المشرف في جدول admin_users
      const currentAdmin = await adminAuthService.getCurrentAdminUser();
      
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .insert({
          user_id: authUser.user.id,
          role_id: adminData.role_id,
          is_super_admin: adminData.is_super_admin || false,
          created_by: currentAdmin?.id
        })
        .select(`
          *,
          role:admin_roles(*)
        `)
        .single();

      if (adminError) {
        console.error('Error creating admin user:', adminError);
        // حذف المستخدم من auth و users إذا فشل إنشاء المشرف
        await supabase.auth.admin.deleteUser(authUser.user.id);
        await supabase.from('users').delete().eq('id', authUser.user.id);
        throw adminError;
      }

      // جلب بيانات المستخدم منفصلة
      const { data: userData } = await supabase
        .from('users')
        .select('email, first_name, last_name, profile_image_url')
        .eq('id', authUser.user.id)
        .single();

      // تسجيل النشاط
      await adminAuthService.logActivity(
        'create_admin_user',
        'admin_user',
        adminUser.id,
        { email: adminData.email, role_id: adminData.role_id }
      );

      return {
        ...adminUser,
        user_profile: userData
      };
    } catch (error) {
      console.error('Error in createAdminUser:', error);
      throw error;
    }
  }

  // تحديث بيانات المشرف
  async updateAdminUser(adminUserId: string, updateData: UpdateAdminUserData): Promise<AdminUser> {
    try {
      // التحقق من الصلاحيات
      const hasPermission = await adminAuthService.hasPermission('manage_admins');
      if (!hasPermission) {
        throw new Error('ليس لديك صلاحية لتحديث بيانات المشرفين');
      }

      const { data, error } = await supabase
        .from('admin_users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminUserId)
        .select(`
          *,
          role:admin_roles(*)
        `)
        .single();

      if (error) {
        console.error('Error updating admin user:', error);
        throw error;
      }

      // جلب بيانات المستخدم منفصلة
      const { data: userData } = await supabase
        .from('users')
        .select('email, first_name, last_name, profile_image_url')
        .eq('id', data.user_id)
        .single();

      // تسجيل النشاط
      await adminAuthService.logActivity(
        'update_admin_user',
        'admin_user',
        adminUserId,
        updateData
      );

      return {
        ...data,
        user_profile: userData
      };
    } catch (error) {
      console.error('Error in updateAdminUser:', error);
      throw error;
    }
  }

  // حذف المشرف
  async deleteAdminUser(adminUserId: string): Promise<void> {
    try {
      // التحقق من الصلاحيات
      const hasPermission = await adminAuthService.hasPermission('manage_admins');
      if (!hasPermission) {
        throw new Error('ليس لديك صلاحية لحذف المشرفين');
      }

      // الحصول على بيانات المشرف
      const { data: adminUser, error: fetchError } = await supabase
        .from('admin_users')
        .select('user_id, user_profile:users(email, first_name, last_name)')
        .eq('id', adminUserId)
        .single();

      if (fetchError || !adminUser) {
        throw new Error('المشرف غير موجود');
      }

      // حذف المشرف من admin_users
      const { error: deleteAdminError } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminUserId);

      if (deleteAdminError) {
        console.error('Error deleting admin user:', deleteAdminError);
        throw deleteAdminError;
      }

      // حذف المستخدم من auth.users
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(adminUser.user_id);
      if (deleteAuthError) {
        console.error('Error deleting auth user:', deleteAuthError);
      }

      // تسجيل النشاط
      await adminAuthService.logActivity(
        'delete_admin_user',
        'admin_user',
        adminUserId,
        { email: (adminUser.user_profile as any)?.email }
      );
    } catch (error) {
      console.error('Error in deleteAdminUser:', error);
      throw error;
    }
  }

  // الحصول على جميع الأدوار
  async getAllRoles(): Promise<AdminRole[]> {
    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching roles:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllRoles:', error);
      throw error;
    }
  }

  // الحصول على جميع الصلاحيات
  async getAllPermissions(): Promise<AdminPermission[]> {
    try {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('is_active', true)
        .order('category, name');

      if (error) {
        console.error('Error fetching permissions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllPermissions:', error);
      throw error;
    }
  }

  // الحصول على صلاحيات دور معين
  async getRolePermissions(roleId: string): Promise<AdminPermission[]> {
    try {
      const { data, error } = await supabase
        .from('admin_role_permissions')
        .select(`
          permission:admin_permissions(*)
        `)
        .eq('role_id', roleId);

      if (error) {
        console.error('Error fetching role permissions:', error);
        throw error;
      }

      return (data.map(item => item.permission).filter(Boolean) as unknown) as AdminPermission[] || [];
    } catch (error) {
      console.error('Error in getRolePermissions:', error);
      throw error;
    }
  }

  // تحديث صلاحيات دور
  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    try {
      // التحقق من الصلاحيات
      const hasPermission = await adminAuthService.hasPermission('manage_roles');
      if (!hasPermission) {
        throw new Error('ليس لديك صلاحية لتحديث صلاحيات الأدوار');
      }

      // حذف الصلاحيات الحالية
      const { error: deleteError } = await supabase
        .from('admin_role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (deleteError) {
        console.error('Error deleting role permissions:', deleteError);
        throw deleteError;
      }

      // إضافة الصلاحيات الجديدة
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId
        }));

        const { error: insertError } = await supabase
          .from('admin_role_permissions')
          .insert(rolePermissions);

        if (insertError) {
          console.error('Error inserting role permissions:', insertError);
          throw insertError;
        }
      }

      // تسجيل النشاط
      await adminAuthService.logActivity(
        'update_role_permissions',
        'admin_role',
        roleId,
        { permission_ids: permissionIds }
      );
    } catch (error) {
      console.error('Error in updateRolePermissions:', error);
      throw error;
    }
  }

  // الحصول على إحصائيات المشرفين
  async getAdminStats(): Promise<{
    total_admins: number;
    active_admins: number;
    super_admins: number;
    recent_logins: number;
    total_roles: number;
    total_permissions: number;
  }> {
    try {
      const [
        { count: totalAdmins },
        { count: activeAdmins },
        { count: superAdmins },
        { count: recentLogins },
        { count: totalRoles },
        { count: totalPermissions }
      ] = await Promise.all([
        supabase.from('admin_users').select('*', { count: 'exact', head: true }),
        supabase.from('admin_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('admin_users').select('*', { count: 'exact', head: true }).eq('is_super_admin', true),
        supabase.from('admin_users').select('*', { count: 'exact', head: true })
          .gte('last_login_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('admin_roles').select('*', { count: 'exact', head: true }),
        supabase.from('admin_permissions').select('*', { count: 'exact', head: true })
      ]);

      return {
        total_admins: totalAdmins || 0,
        active_admins: activeAdmins || 0,
        super_admins: superAdmins || 0,
        recent_logins: recentLogins || 0,
        total_roles: totalRoles || 0,
        total_permissions: totalPermissions || 0
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      return {
        total_admins: 0,
        active_admins: 0,
        super_admins: 0,
        recent_logins: 0,
        total_roles: 0,
        total_permissions: 0
      };
    }
  }
}

export const adminManagementService = new AdminManagementService();
