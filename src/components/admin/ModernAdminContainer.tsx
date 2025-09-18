import React from 'react';

interface ModernAdminContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const ModernAdminContainer: React.FC<ModernAdminContainerProps> = ({
  children,
  className = '',
  maxWidth = 'xl',
  padding = 'md'
}) => {
  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'sm': return 'max-w-3xl';
      case 'md': return 'max-w-5xl';
      case 'lg': return 'max-w-6xl';
      case 'xl': return 'max-w-7xl';
      case '2xl': return 'max-w-8xl';
      case 'full': return 'max-w-full';
      default: return 'max-w-7xl';
    }
  };

  const getPaddingClass = () => {
    switch (padding) {
      case 'none': return 'p-0';
      case 'sm': return 'p-4';
      case 'md': return 'p-6';
      case 'lg': return 'p-8';
      case 'xl': return 'p-10';
      default: return 'p-6';
    }
  };

  return (
    <div className={`
      modern-admin-container
      ${getMaxWidthClass()}
      ${getPaddingClass()}
      mx-auto
      w-full
      ${className}
    `}>
      {children}
    </div>
  );
};

export default ModernAdminContainer;
