/**
 * Dark Mode Utility Classes
 *
 * This file contains pre-defined dark mode class combinations for common UI patterns.
 * Use these to ensure consistency across the application.
 */

export const darkModeClasses = {
  // Page containers
  page: "bg-white dark:bg-gray-900 transition-colors duration-200",
  pageMinHeight:
    "min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200",

  // Content containers
  container: "bg-white dark:bg-gray-800 transition-colors duration-200",
  panel:
    "bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700 transition-colors duration-200",
  card: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-gray-700 transition-colors duration-200",

  // Typography
  heading: "text-gray-900 dark:text-white transition-colors duration-200",
  subheading: "text-gray-800 dark:text-gray-200 transition-colors duration-200",
  text: "text-gray-600 dark:text-gray-300 transition-colors duration-200",
  muted: "text-gray-500 dark:text-gray-400 transition-colors duration-200",

  // Interactive elements
  link: "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200",
  linkMuted:
    "text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors duration-200",

  // Borders
  border: "border-gray-200 dark:border-gray-700 transition-colors duration-200",
  borderTop:
    "border-t border-gray-200 dark:border-gray-700 transition-colors duration-200",
  borderBottom:
    "border-b border-gray-200 dark:border-gray-700 transition-colors duration-200",

  // Backgrounds
  bgPrimary: "bg-gray-50 dark:bg-gray-900 transition-colors duration-200",
  bgSecondary: "bg-gray-100 dark:bg-gray-800 transition-colors duration-200",
  bgAccent: "bg-blue-50 dark:bg-blue-900/20 transition-colors duration-200",

  // Form elements
  input:
    "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors duration-200",
  label: "text-gray-700 dark:text-gray-300 transition-colors duration-200",

  // Status colors
  success: "text-green-600 dark:text-green-400 transition-colors duration-200",
  successBg:
    "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 transition-colors duration-200",
  error: "text-red-600 dark:text-red-400 transition-colors duration-200",
  errorBg:
    "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 transition-colors duration-200",
  warning:
    "text-yellow-600 dark:text-yellow-400 transition-colors duration-200",
  warningBg:
    "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 transition-colors duration-200",
};

/**
 * Utility function to combine multiple dark mode classes
 */
export const combineDarkModeClasses = (...classes: string[]): string => {
  return classes.join(" ");
};

/**
 * Common page layouts with dark mode support
 */
export const pageLayouts = {
  fullPage: combineDarkModeClasses(
    "flex flex-col min-h-screen",
    darkModeClasses.page
  ),

  centeredContent: combineDarkModeClasses(
    "flex flex-col min-h-screen",
    darkModeClasses.page
  ),

  mainContent: combineDarkModeClasses(
    "flex-grow container mx-auto px-4 py-8",
    darkModeClasses.bgPrimary
  ),

  contentPanel: combineDarkModeClasses(
    "max-w-4xl mx-auto p-8",
    darkModeClasses.panel
  ),
};
