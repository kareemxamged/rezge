import React from 'react';

interface AdminDashboardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const AdminDashboardGrid: React.FC<AdminDashboardGridProps> = ({
  children,
  columns = 4,
  gap = 'lg',
  className = ''
}) => {
  const getGridClasses = () => {
    const baseClasses = 'admin-grid grid';
    
    // تحديد عدد الأعمدة
    const columnClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    };

    // تحديد المساحات
    const gapClasses = {
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-6 lg:gap-8',
      xl: 'gap-8 lg:gap-10'
    };

    return `${baseClasses} ${columnClasses[columns]} ${gapClasses[gap]} ${className}`;
  };

  return (
    <div className={getGridClasses()}>
      {children}
    </div>
  );
};

export default AdminDashboardGrid;
