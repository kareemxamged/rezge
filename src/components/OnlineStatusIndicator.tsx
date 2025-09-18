import React from 'react';
import './OnlineStatusIndicator.css';

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * مكون النقطة الخضراء التي تدل على أن المستخدم نشط حالياً
 * Online Status Indicator Component - Green dot for active users
 */
const OnlineStatusIndicator: React.FC<OnlineStatusIndicatorProps> = ({
  isOnline,
  size = 'md',
  className = ''
}) => {
  if (!isOnline) return null;

  return (
    <div className={`online-indicator online-indicator-${size} ${className}`}>
      <div className="online-indicator-inner"></div>
    </div>
  );
};

export default OnlineStatusIndicator;
