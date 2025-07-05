import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const baseClasses = [
    'block w-full rounded-xl transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ];

  const variantClasses = {
    default: [
      'border border-gray-300 dark:border-gray-600',
      'bg-white dark:bg-gray-700',
      'text-gray-900 dark:text-white',
      'placeholder-gray-500 dark:placeholder-gray-400',
    ],
    filled: [
      'border-0 bg-gray-100 dark:bg-gray-800',
      'text-gray-900 dark:text-white',
      'placeholder-gray-500 dark:placeholder-gray-400',
    ],
    outlined: [
      'border-2 border-gray-300 dark:border-gray-600',
      'bg-transparent',
      'text-gray-900 dark:text-white',
      'placeholder-gray-500 dark:placeholder-gray-400',
    ],
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg',
  };

  const errorClasses = error ? [
    'border-red-300 dark:border-red-600',
    'focus:ring-red-500 focus:border-red-500',
  ] : [];

  const iconPadding = {
    left: leftIcon ? (size === 'sm' ? 'pl-10' : size === 'lg' ? 'pl-14' : 'pl-12') : '',
    right: rightIcon ? (size === 'sm' ? 'pr-10' : size === 'lg' ? 'pr-14' : 'pr-12') : '',
  };

  const inputClasses = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    errorClasses,
    iconPadding.left,
    iconPadding.right,
    fullWidth ? 'w-full' : '',
    className
  );

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconPositionClasses = {
    left: {
      sm: 'left-3',
      md: 'left-4',
      lg: 'left-5',
    },
    right: {
      sm: 'right-3',
      md: 'right-4',
      lg: 'right-5',
    },
  };

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className={clsx(
            'absolute top-1/2 transform -translate-y-1/2',
            iconPositionClasses.left[size],
            'text-gray-500 dark:text-gray-400'
          )}>
            <span className={iconSizeClasses[size]}>{leftIcon}</span>
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          {...props}
        />
        
        {rightIcon && (
          <div className={clsx(
            'absolute top-1/2 transform -translate-y-1/2',
            iconPositionClasses.right[size],
            'text-gray-500 dark:text-gray-400'
          )}>
            <span className={iconSizeClasses[size]}>{rightIcon}</span>
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className="mt-2">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
          {helperText && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
