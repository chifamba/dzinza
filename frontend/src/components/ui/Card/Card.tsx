import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  title,
  footer,
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`
        bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-700 rounded-lg overflow-hidden transition-colors duration-200
        ${className}
      `}
      {...props}
    >
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white transition-colors duration-200">
            {title}
          </h3>
        </div>
      )}
      <div className="p-4">{children}</div>
      {footer && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
