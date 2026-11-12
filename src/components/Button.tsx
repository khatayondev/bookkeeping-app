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
    primary: "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 shadow-sm active:scale-[0.99] focus:ring-black dark:focus:ring-white",
    secondary: "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:ring-black dark:focus:ring-white",
    ghost: "bg-transparent text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-black dark:focus:ring-white",
  };
  return (
    <button
      className={`${base} ${styles[variant]} ${className}`}
      {...props}
    />
  );
};

