/**
 * Cultural formatting utilities for different locales
 */

export interface DateFormatOptions {
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  weekday?: 'long' | 'short' | 'narrow';
}

export interface NumberFormatOptions {
  style?: 'decimal' | 'currency' | 'percent';
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format date according to locale and cultural preferences
 */
export const formatDate = (
  date: Date | string | number,
  locale: string,
  options: DateFormatOptions = {}
): string => {
  try {
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    // Default options for different locales
    const defaultOptions: DateFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };

    // Cultural adjustments for specific locales
    if (locale === 'sn' || locale === 'nd') {
      // For Shona and Ndebele, prefer full month names and traditional format
      return new Intl.DateTimeFormat('en-ZW', defaultOptions).format(dateObj);
    }

    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return new Date(date).toLocaleDateString();
  }
};

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export const formatRelativeTime = (
  date: Date | string | number,
  locale: string
): string => {
  try {
    const dateObj = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    // Use Intl.RelativeTimeFormat for supported locales
    if (Intl.RelativeTimeFormat && ['en', 'en-US', 'en-GB'].includes(locale)) {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      
      if (Math.abs(diffInSeconds) < 60) {
        return rtf.format(-diffInSeconds, 'second');
      } else if (Math.abs(diffInSeconds) < 3600) {
        return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
      } else if (Math.abs(diffInSeconds) < 86400) {
        return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
      } else {
        return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
      }
    }

    // Fallback for Shona and Ndebele
    const absDiff = Math.abs(diffInSeconds);
    const isPast = diffInSeconds > 0;
    
    if (absDiff < 60) {
      return locale === 'sn' ? 'izvozvi' : 'manje';
    } else if (absDiff < 3600) {
      const minutes = Math.floor(absDiff / 60);
      if (locale === 'sn') {
        return isPast ? `mamineti ${minutes} apfuura` : `mumamineti ${minutes}`;
      } else {
        return isPast ? `imizuzu ${minutes} edlule` : `emizuzwini ${minutes}`;
      }
    } else if (absDiff < 86400) {
      const hours = Math.floor(absDiff / 3600);
      if (locale === 'sn') {
        return isPast ? `maawa ${hours} apfuura` : `mumaawa ${hours}`;
      } else {
        return isPast ? `amahola ${hours} edlule` : `emaholeni ${hours}`;
      }
    } else {
      const days = Math.floor(absDiff / 86400);
      if (locale === 'sn') {
        return isPast ? `mazuva ${days} apfuura` : `mumazuva ${days}`;
      } else {
        return isPast ? `izinsuku ${days} ezedlule` : `ezinsukwini ${days}`;
      }
    }
  } catch (error) {
    console.warn('Relative time formatting error:', error);
    return formatDate(date, locale);
  }
};

/**
 * Format numbers according to locale
 */
export const formatNumber = (
  number: number,
  locale: string,
  options: NumberFormatOptions = {}
): string => {
  try {
    // For Zimbabwean locales, use US dollar as default currency
    const defaultOptions: NumberFormatOptions = {
      style: 'decimal',
      ...options
    };

    if (options.style === 'currency' && !options.currency) {
      defaultOptions.currency = 'USD'; // Zimbabwe primarily uses USD
    }

    // Use appropriate locale for formatting
    const formatLocale = locale === 'sn' || locale === 'nd' ? 'en-ZW' : locale;
    
    return new Intl.NumberFormat(formatLocale, defaultOptions).format(number);
  } catch (error) {
    console.warn('Number formatting error:', error);
    return number.toString();
  }
};

/**
 * Format currency with cultural context
 */
export const formatCurrency = (
  amount: number,
  locale: string,
  currency: string = 'USD'
): string => {
  return formatNumber(amount, locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Format names according to cultural conventions
 */
export const formatName = (
  firstName: string,
  lastName: string,
  locale: string,
  options: { includeTitle?: boolean; title?: string } = {}
): string => {
  const { includeTitle = false, title = '' } = options;
  
  let formattedName = '';
  
  if (includeTitle && title) {
    formattedName += `${title} `;
  }
  
  // In Zimbabwean culture, first name typically comes before surname
  if (locale === 'sn' || locale === 'nd') {
    formattedName += `${firstName} ${lastName}`;
  } else {
    // Standard Western format
    formattedName += `${firstName} ${lastName}`;
  }
  
  return formattedName.trim();
};

/**
 * Format phone numbers for Zimbabwe
 */
export const formatPhoneNumber = (
  phoneNumber: string,
  locale: string
): string => {
  try {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Zimbabwe phone number formats
    if (cleaned.startsWith('263')) {
      // International format: +263 XX XXX XXXX
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    } else if (cleaned.startsWith('0')) {
      // Local format: 0XX XXX XXXX
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    
    return phoneNumber; // Return original if format not recognized
  } catch (error) {
    console.warn('Phone number formatting error:', error);
    return phoneNumber;
  }
};

/**
 * Get appropriate greeting based on time and culture
 */
export const getTimeBasedGreeting = (locale: string): string => {
  const hour = new Date().getHours();
  
  if (locale === 'sn') {
    if (hour < 12) return 'Mangwanani'; // Good morning
    if (hour < 17) return 'Masikati'; // Good afternoon
    return 'Manheru'; // Good evening
  } else if (locale === 'nd') {
    if (hour < 12) return 'Sawubona ekuseni'; // Good morning
    if (hour < 17) return 'Sawubona emini'; // Good afternoon
    return 'Sawubona kusihlwa'; // Good evening
  } else {
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
};
