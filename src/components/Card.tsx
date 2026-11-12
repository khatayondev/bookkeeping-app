// src/components/Card.tsx
import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = "", children, ...rest }) => {
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-gray-850 border border-amber-100/70 dark:border-gray-800 shadow-sm p-4 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

