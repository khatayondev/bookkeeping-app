// src/components/Card.tsx
import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = "", children, ...rest }) => {
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 shadow-sm p-4 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

