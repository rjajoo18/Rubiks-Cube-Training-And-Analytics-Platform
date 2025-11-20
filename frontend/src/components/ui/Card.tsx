import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  ...props
}) => {
  return (
    <div
      className={`glass rounded-2xl p-6 ${
        hover ? 'glass-hover' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
