import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface PasswordStrengthIndicatorProps {
  strength: number; // 0-5
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  strength,
  className = ''
}) => {
  const { t } = useTranslation('auth');

  const getStrengthLabel = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return t('password.veryWeak');
      case 2:
        return t('password.weak');
      case 3:
        return t('password.fair');
      case 4:
        return t('password.good');
      case 5:
        return t('password.strong');
      default:
        return t('password.veryWeak');
    }
  };

  const getStrengthColor = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-blue-500';
      case 5:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getTextColor = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return 'text-red-600';
      case 2:
        return 'text-orange-600';
      case 3:
        return 'text-yellow-600';
      case 4:
        return 'text-blue-600';
      case 5:
        return 'text-green-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`mt-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <motion.div
            className={`h-2 rounded-full ${getStrengthColor(strength)}`}
            initial={{ width: 0 }}
            animate={{ width: `${(strength / 5) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className={`text-xs font-medium ${getTextColor(strength)}`}>
          {getStrengthLabel(strength)}
        </span>
      </div>
      
      {strength < 4 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2"
        >
          <ul className="text-xs text-gray-600 space-y-1">
            {strength < 1 && <li>• {t('password.requirements.minLength')}</li>}
            {strength < 2 && <li>• {t('password.requirements.lowercase')}</li>}
            {strength < 3 && <li>• {t('password.requirements.uppercase')}</li>}
            {strength < 4 && <li>• {t('password.requirements.number')}</li>}
            {strength < 5 && <li>• {t('password.requirements.special')}</li>}
          </ul>
        </motion.div>
      )}
    </div>
  );
};
