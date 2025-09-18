import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Shield,
  BarChart3,
  Settings,
  Bell,
  UserCog,
  AlertTriangle,
  Database,
  Globe,
  Lock,
  Activity,
  ChevronDown
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  permission?: string;
  badge?: number;
  children?: MenuItem[];
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose, isMobile = false }) => {
  const location = useLocation();
  const { hasPermission, adminUser } = useAdmin();
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['dashboard']);

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: LayoutDashboard,
      path: '/admin',
      permission: undefined // متاح للجميع
    },
    {
      id: 'users',
      label: 'إدارة المستخدمين',
      icon: Users,
      path: '/admin/users',
      permission: 'view_users'
    },
    {
      id: 'content',
      label: 'إدارة المحتوى',
      icon: FileText,
      path: '/admin/content',
      permission: 'view_content',
      children: [
        {
          id: 'content-articles',
          label: 'المقالات',
          icon: FileText,
          path: '/admin/content/articles',
          permission: 'view_content'
        },
        {
          id: 'content-categories',
          label: 'التصنيفات',
          icon: Database,
          path: '/admin/content/categories',
          permission: 'manage_categories'
        }
      ]
    },
    {
      id: 'messages',
      label: 'مراقبة الرسائل',
      icon: MessageSquare,
      path: '/admin/messages',
      permission: 'view_messages',
      badge: 12
    },
    {
      id: 'security',
      label: 'الأمان والمراقبة',
      icon: Shield,
      path: '/admin/security',
      permission: 'view_security',
      children: [
        {
          id: 'security-logs',
          label: 'سجلات الأمان',
          icon: Activity,
          path: '/admin/security/logs',
          permission: 'view_logs'
        },
        {
          id: 'security-events',
          label: 'الأحداث الأمنية',
          icon: AlertTriangle,
          path: '/admin/security/events',
          permission: 'view_security'
        }
      ]
    },
    {
      id: 'reports',
      label: 'التقارير والإحصائيات',
      icon: BarChart3,
      path: '/admin/reports',
      permission: 'view_reports'
    },
    {
      id: 'settings',
      label: 'إعدادات النظام',
      icon: Settings,
      path: '/admin/settings',
      permission: 'view_settings',
      children: [
        {
          id: 'settings-general',
          label: 'الإعدادات العامة',
          icon: Settings,
          path: '/admin/settings/general',
          permission: 'manage_settings'
        },
        {
          id: 'settings-texts',
          label: 'إدارة النصوص',
          icon: Globe,
          path: '/admin/settings/texts',
          permission: 'manage_settings'
        }
      ]
    },
    {
      id: 'notifications',
      label: 'الإشعارات',
      icon: Bell,
      path: '/admin/notifications',
      permission: 'manage_notifications'
    }
  ];

  // إضافة قسم إدارة المشرفين للمشرف العام فقط
  if (adminUser?.is_super_admin || hasPermission('manage_admins')) {
    menuItems.push({
      id: 'admins',
      label: 'إدارة المشرفين',
      icon: UserCog,
      path: '/admin/admins',
      permission: 'manage_admins',
      children: [
        {
          id: 'admins-list',
          label: 'قائمة المشرفين',
          icon: UserCog,
          path: '/admin/admins',
          permission: 'manage_admins'
        },
        {
          id: 'admins-roles',
          label: 'الأدوار والصلاحيات',
          icon: Lock,
          path: '/admin/admins/roles',
          permission: 'manage_roles'
        }
      ]
    });
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const isExpanded = (itemId: string) => expandedItems.includes(itemId);

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    // التحقق من الصلاحيات
    if (item.permission && !hasPermission(item.permission) && !adminUser?.is_super_admin) {
      return null;
    }

    const hasChildren = item.children && item.children.length > 0;
    const expanded = isExpanded(item.id);
    const active = isActive(item.path);

    return (
      <div key={item.id}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.id)}
            className={`
              w-full flex items-center justify-between px-4 py-3 text-right rounded-lg transition-all duration-200
              ${level > 0 ? 'mr-4' : ''}
              ${active 
                ? 'bg-primary-100 text-primary-700 border-r-4 border-primary-600' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <item.icon className={`w-5 h-5 ${active ? 'text-primary-600' : ''}`} />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} 
            />
          </button>
        ) : (
          <NavLink
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
              ${level > 0 ? 'mr-4' : ''}
              ${isActive 
                ? 'bg-primary-100 text-primary-700 border-r-4 border-primary-600' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }
            `}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full mr-auto">
                {item.badge}
              </span>
            )}
          </NavLink>
        )}

        {/* العناصر الفرعية */}
        {hasChildren && expanded && (
          <div className="mt-2 space-y-1">
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* خلفية للجوال - z-index عالي جداً */}
      {isMobile && isOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={onClose}
        />
      )}

      {/* الشريط الجانبي */}
      <aside
        className={`
          admin-sidebar admin-transition admin-scrollbar
          ${isMobile
            ? `admin-sidebar-mobile ${isOpen ? 'admin-slide-in-right' : 'closed'} fixed top-0 right-0 h-full w-70 bg-white border-l border-slate-200 shadow-xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
            : 'fixed top-0 right-0 h-full w-64 bg-white border-l border-slate-200 shadow-lg'
          }
        `}
        dir="rtl"
      >
        {/* الهيدر */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">رزقي</h2>
              <p className="text-sm text-slate-500">لوحة التحكم</p>
            </div>
          </div>
        </div>

        {/* القائمة */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-120px)]">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        {/* معلومات المستخدم */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <UserCog className="w-4 h-4 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {adminUser?.user_profile?.first_name && adminUser?.user_profile?.last_name
                  ? `${adminUser.user_profile.first_name} ${adminUser.user_profile.last_name}`
                  : 'المشرف'
                }
              </p>
              <p className="text-xs text-slate-500 truncate">
                {adminUser?.role?.display_name}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
