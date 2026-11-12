// src/components/BottomNav.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  {
    to: "/",
    label: "Home",
    icon: () => (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
  },
  {
    to: "/transactions",
    label: "Ledger",
    icon: () => (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814L12 15.228l-2.419 1.586a1 1 0 01-1.162 0L6 15.228l-2.419 1.586A1 1 0 012 16V4a2 2 0 012-2zm2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
  },
  { to: "/add", label: "Add", isAdd: true },
  {
    to: "/debts",
    label: "Debts",
    icon: () => (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
  },
  {
    to: "/more",
    label: "More",
    icon: () => (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export const BottomNav: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto w-full px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 shadow-2xl md:border-x md:rounded-t-2xl transition-all"
    >
      <div className="flex justify-between items-center">
        {navItems.map((item) => {
          if (item.isAdd) {
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label="Add new transaction"
                className="w-12 h-12 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 flex items-center justify-center font-bold text-2xl shadow-lg transition-transform active:scale-95 shrink-0 mx-1 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              >
                +
              </Link>
            );
          }

          const isActive =
            item.to === "/"
              ? pathname === "/"
              : pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 min-h-[48px] rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white ${
                isActive
                  ? "text-black dark:text-white font-bold"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <span className="mb-0.5">{item.icon ? item.icon() : null}</span>
              <span className="text-[11px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

