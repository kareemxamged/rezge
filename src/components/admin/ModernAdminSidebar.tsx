import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  BarChart3,
  Users,
  FileText,
  MessageSquare,
  Shield,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,

  UserCheck,

  Activity,
  Database,
  Mail,
  Lock,
  Palette,
  Globe,
  Zap,
  CreditCard,
  Crown,
  TrendingUp
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { useSeparateAdmin } from './SeparateAdminProvider';

interface ModernAdminSidebarProps {
  collapsed: boolean;
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  permission?: string;
  children?: MenuItem[];
  badge?: string | number;
  color?: string;
}

const ModernAdminSidebar: React.FC<ModernAdminSidebarProps> = ({
  collapsed,
  isOpen,
  isMobile,
  onClose
}) => {
  const location = useLocation();
  const { hasPermission: oldHasPermission } = useAdmin();

  // محاولة استخدام النظام الجديد أولاً
  let hasPermission: (permission: string) => boolean;
  try {
    const { hasPermission: newHasPermission } = useSeparateAdmin();
    hasPermission = newHasPermission;
    console.log('✅ Using new admin system for permissions');
  } catch (error) {
    // fallback للنظام القديم
    hasPermission = oldHasPermission;
    console.log('⚠️ Falling back to old admin system for permissions');
  }

  const [expandedItems, setExpandedItems] = useState<string[]>(['dashboard']);

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/admin',
      color: 'text-blue-600'
    },
    {
      id: 'users',
      label: 'إدارة المستخدمين',
      icon: <Users className="w-5 h-5" />,
      path: '/admin/users',
      permission: 'view_users',
      color: 'text-green-600'
    },
    {
      id: 'content',
      label: 'إدارة المحتوى',
      icon: <FileText className="w-5 h-5" />,
      permission: 'view_articles',
      color: 'text-purple-600',
      children: [
        {
          id: 'articles',
          label: 'المقالات',
          icon: <FileText className="w-4 h-4" />,
          path: '/admin/articles',
          permission: 'view_articles'
        },
        {
          id: 'categories',
          label: 'التصنيفات',
          icon: <Palette className="w-4 h-4" />,
          path: '/admin/categories',
          permission: 'manage_categories'
        }
      ]
    },
    {
      id: 'messages',
      label: 'الرسائل والمحادثات',
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/admin/messages',
      permission: 'view_messages',
      color: 'text-amber-600',
      badge: 12
    },
    {
      id: 'subscriptions',
      label: 'إدارة الاشتراكات',
      icon: <CreditCard className="w-5 h-5" />,
      path: '/admin/subscriptions',
      permission: 'view_subscriptions',
      color: 'text-emerald-600'
    },
    {
      id: 'security',
      label: 'الأمان والمراقبة',
      icon: <Shield className="w-5 h-5" />,
      permission: 'view_security',
      color: 'text-red-600',
      children: [
        {
          id: 'security-overview',
          label: 'نظرة عامة',
          icon: <Shield className="w-4 h-4" />,
          path: '/admin/security',
          permission: 'view_security'
        },
        {
          id: 'activity-logs',
          label: 'سجل الأنشطة',
          icon: <Activity className="w-4 h-4" />,
          path: '/admin/security/logs',
          permission: 'view_logs'
        },
        {
          id: 'blocked-users',
          label: 'المستخدمون المحظورون',
          icon: <Lock className="w-4 h-4" />,
          path: '/admin/security/blocked',
          permission: 'manage_blocks'
        }
      ]
    },
    {
      id: 'system',
      label: 'إدارة النظام',
      icon: <Settings className="w-5 h-5" />,
      permission: 'manage_settings',
      color: 'text-slate-600',
      children: [
        {
          id: 'general-settings',
          label: 'الإعدادات العامة',
          icon: <Settings className="w-4 h-4" />,
          path: '/admin/settings',
          permission: 'manage_settings'
        },
        {
          id: 'email-settings',
          label: 'إعدادات البريد',
          icon: <Mail className="w-4 h-4" />,
          path: '/admin/settings/email',
          permission: 'manage_settings'
        },
        {
          id: 'database',
          label: 'قاعدة البيانات',
          icon: <Database className="w-4 h-4" />,
          path: '/admin/database',
          permission: 'manage_settings'
        }
      ]
    },
    {
      id: 'admins',
      label: 'إدارة المشرفين',
      icon: <UserCheck className="w-5 h-5" />,
      path: '/admin/admins',
      permission: 'view_admins',
      color: 'text-indigo-600'
    }
  ];

  const toggleExpanded = (itemId: string) => {
    if (collapsed && !isMobile) return;
    
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;

    // للصفحة الرئيسية للإدارة، تحقق من المطابقة الدقيقة فقط
    if (path === '/admin') {
      return location.pathname === '/admin';
    }

    // للصفحات الأخرى، تحقق من المطابقة الدقيقة أو البداية
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isParentActive = (children?: MenuItem[]) => {
    if (!children) return false;
    return children.some(child => isActive(child.path));
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const itemIsActive = isActive(item.path) || isParentActive(item.children);
    const isSubItem = level > 0;

    const handleClick = () => {
      if (hasChildren) {
        toggleExpanded(item.id);
      } else if (isMobile) {
        onClose();
      }
    };

    const content = (
      <>
        <div className={`menu-item-content ${isSubItem ? 'sub-item' : ''}`}>
          <div className="menu-item-icon">
            {item.icon}
          </div>
          {(!collapsed || isMobile) && (
            <>
              <span className="menu-item-label">{item.label}</span>
              {item.badge && (
                <span className="menu-item-badge">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <div className="menu-item-arrow">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </>
    );

    return (
      <div key={item.id} className="menu-item-wrapper">
        {item.path ? (
          <Link
            to={item.path}
            className={`menu-item ${itemIsActive ? 'active' : ''} ${isSubItem ? 'sub-item' : ''}`}
            onClick={handleClick}
          >
            {content}
          </Link>
        ) : (
          <button
            className={`menu-item ${itemIsActive ? 'active' : ''} ${isSubItem ? 'sub-item' : ''}`}
            onClick={handleClick}
          >
            {content}
          </button>
        )}

        {hasChildren && isExpanded && (!collapsed || isMobile) && (
          <div className="submenu">
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <aside className={`modern-admin-sidebar ${
        isMobile 
          ? `mobile ${isOpen ? 'open' : 'closed'}` 
          : collapsed 
            ? 'collapsed' 
            : 'expanded'
      }`}>
        {/* رأس الشريط الجانبي */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <Zap className="w-6 h-6" />
            </div>
            {(!collapsed || isMobile) && (
              <div className="logo-text">
                <h2>رزقي</h2>
                <span>لوحة التحكم</span>
              </div>
            )}
          </div>
        </div>

        {/* قائمة التنقل */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            {(!collapsed || isMobile) && (
              <div className="section-title">القائمة الرئيسية</div>
            )}
            <div className="menu-items">
              {menuItems.map(item => renderMenuItem(item))}
            </div>
          </div>

          {/* قسم المساعدة */}
          <div className="nav-section">
            {(!collapsed || isMobile) && (
              <div className="section-title">المساعدة</div>
            )}
            <div className="menu-items">
              <Link to="/admin/help" className="menu-item">
                <div className="menu-item-content">
                  <div className="menu-item-icon">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  {(!collapsed || isMobile) && (
                    <span className="menu-item-label">المساعدة والدعم</span>
                  )}
                </div>
              </Link>
              <Link to="/" className="menu-item" target="_blank">
                <div className="menu-item-content">
                  <div className="menu-item-icon">
                    <Globe className="w-5 h-5" />
                  </div>
                  {(!collapsed || isMobile) && (
                    <span className="menu-item-label">زيارة الموقع</span>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </nav>

        {/* تذييل الشريط الجانبي */}
        <div className="sidebar-footer">
          {(!collapsed || isMobile) && (
            <div className="footer-content">
              <div className="version-info">
                <span>الإصدار 2.1.0</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default ModernAdminSidebar;
