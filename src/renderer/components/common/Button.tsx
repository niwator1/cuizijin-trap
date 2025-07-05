import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = [
    'inline-flex items-center justify-center font-medium rounded-xl',
    'transition-all duration-200 transform',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'active:scale-95 disabled:scale-100',
  ];

  const variantClasses = {
    primary: [
      'bg-gradient-to-r from-blue-600 to-indigo-600',
      'hover:from-blue-700 hover:to-indigo-700',
      'text-white shadow-lg hover:shadow-xl',
      'focus:ring-blue-500',
    ],
    secondary: [
      'bg-gray-100 dark:bg-gray-700',
      'hover:bg-gray-200 dark:hover:bg-gray-600',
      'text-gray-900 dark:text-white',
      'border border-gray-300 dark:border-gray-600',
      'focus:ring-gray-500',
    ],
    danger: [
      'bg-gradient-to-r from-red-600 to-pink-600',
      'hover:from-red-700 hover:to-pink-700',
      'text-white shadow-lg hover:shadow-xl',
      'focus:ring-red-500',
    ],
    ghost: [
      'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
      'text-gray-700 dark:text-gray-300',
      'focus:ring-gray-500',
    ],
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const widthClasses = fullWidth ? 'w-full' : '';

  const classes = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    widthClasses,
    className
  );

  const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
  );

  const renderIcon = () => {
    if (loading) {
      return <LoadingSpinner />;
    }
    if (icon) {
      return (
        <span className={clsx(
          'flex items-center',
          iconPosition === 'left' ? 'mr-2' : 'ml-2'
        )}>
          {icon}
        </span>
      );
    }
    return null;
  };

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {iconPosition === 'left' && renderIcon()}
      {children}
      {iconPosition === 'right' && renderIcon()}
    </button>
  );
};

export default Button;
