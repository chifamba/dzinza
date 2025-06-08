import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';

interface AlertProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant,
  message,
  title,
  onClose,
  className = ''
}) => {
  const variants = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-400'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: AlertCircle,
      iconColor: 'text-red-400'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertTriangle,
      iconColor: 'text-yellow-400'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: Info,
      iconColor: 'text-blue-400'
    }
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`rounded-lg border p-4 ${config.bg} ${config.border} ${className}`}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
          <div className="ml-3 flex-1">
            {title && (
              <h3 className={`text-sm font-medium ${config.text} mb-1`}>
                {title}
              </h3>
            )}
            <div className={`text-sm ${config.text}`}>
              {message}
            </div>
          </div>
          {onClose && (
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  className={`inline-flex rounded-md p-1.5 ${config.text} hover:${config.bg} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${config.bg} transition-colors`}
                  onClick={onClose}
                >
                  <span className="sr-only">Dismiss</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
