// src/components/Button.tsx
import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  className = "",
  ...props
}) => {
  const base = "rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all";
  const styles: Record<string, string> = {
    primary: "bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20 active:scale-[0.99] focus:ring-orange-500",
    secondary: "bg-amber-50/70 dark:bg-gray-850 text-gray-800 dark:text-gray-100 hover:bg-amber-100/80 dark:hover:bg-gray-800 border border-amber-200/60 dark:border-gray-700 focus:ring-orange-500",
    ghost: "bg-transparent text-orange-700 dark:text-amber-400 hover:bg-orange-50 dark:hover:bg-gray-800 focus:ring-orange-500",
  };
  return (
    <button
      className={`${base} ${styles[variant]} ${className}`}
      {...props}
    />
  );
};

