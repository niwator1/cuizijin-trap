import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'red' | 'purple';
  loading?: boolean;
  id?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  color = 'blue',
  loading = false,
  id,
}) => {
  const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;

  const sizeConfig = {
    sm: {
      track: 'w-8 h-5',
      thumb: 'w-3 h-3',
      translateValue: 12, // 3 * 4px (translate-x-3)
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-4 h-4',
      translateValue: 20, // 5 * 4px (translate-x-5)
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-5 h-5',
      translateValue: 28, // 7 * 4px (translate-x-7)
    },
  };

  const colorConfig = {
    blue: {
      on: 'bg-blue-600',
      off: 'bg-gray-200 dark:bg-gray-700',
    },
    green: {
      on: 'bg-green-600',
      off: 'bg-gray-200 dark:bg-gray-700',
    },
    red: {
      on: 'bg-red-600',
      off: 'bg-gray-200 dark:bg-gray-700',
    },
    purple: {
      on: 'bg-purple-600',
      off: 'bg-gray-200 dark:bg-gray-700',
    },
  };

  const config = sizeConfig[size];
  const colors = colorConfig[color];

  const trackClasses = clsx(
    'relative inline-flex items-center rounded-full transition-all duration-300 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
    'cursor-pointer transform hover:scale-105 active:scale-95',
    config.track,
    checked ? colors.on : colors.off,
    disabled && 'opacity-50 cursor-not-allowed hover:scale-100 active:scale-100'
  );

  const thumbClasses = clsx(
    'inline-block rounded-full bg-white shadow-lg ring-0 transition-shadow duration-200',
    'hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
    config.thumb
  );

  const handleClick = () => {
    if (!disabled && !loading) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="flex items-start space-x-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? `${switchId}-label` : undefined}
        aria-describedby={description ? `${switchId}-description` : undefined}
        className={trackClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
      >
        <motion.span
          className={thumbClasses}
          animate={{
            x: checked ? config.translateValue : 4, // 4px for translate-x-1
            scale: loading ? 0.9 : 1
          }}
          whileHover={{ scale: loading ? 0.9 : 1.05 }}
          whileTap={{ scale: loading ? 0.9 : 0.95 }}
          transition={{
            type: 'spring',
            stiffness: 800,
            damping: 35,
            mass: 0.8
          }}
        >
          {loading && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </motion.div>
          )}
        </motion.span>
      </button>

      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label
              id={`${switchId}-label`}
              htmlFor={switchId}
              className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              onClick={handleClick}
            >
              {label}
            </label>
          )}
          {description && (
            <p
              id={`${switchId}-description`}
              className="text-sm text-gray-500 dark:text-gray-400 mt-1"
            >
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Switch;
