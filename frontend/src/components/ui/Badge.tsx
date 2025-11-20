import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-green-900/30 text-green-400 border-green-800',
    warning: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
    info: 'bg-blue-900/30 text-blue-400 border-blue-800',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
