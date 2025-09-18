import React from 'react';
import { ArrowRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface AdminPageLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  children,
  className = ''
}) => {
  return (
    <div className={`admin-page-layout ${className}`}>
      {/* رأس الصفحة */}
      <div className="admin-card mb-8 p-6 lg:p-8 rounded-xl shadow-sm border border-slate-200/60">
        {/* مسار التنقل */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-sm text-slate-600 mb-4" dir="rtl">
            <Link 
              to="/admin" 
              className="admin-interactive flex items-center gap-1 hover:text-primary-600 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>الرئيسية</span>
            </Link>
            
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                {item.href ? (
                  <Link 
                    to={item.href}
                    className="admin-interactive flex items-center gap-1 hover:text-primary-600 transition-colors"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 text-slate-800 font-medium">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* عنوان الصفحة والإجراءات */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="admin-text-gradient text-3xl lg:text-4xl font-bold mb-3">{title}</h1>
            {subtitle && (
              <p className="text-slate-600 text-lg lg:text-xl leading-relaxed">{subtitle}</p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* محتوى الصفحة */}
      <div className="admin-page-content">
        {children}
      </div>
    </div>
  );
};

export default AdminPageLayout;
