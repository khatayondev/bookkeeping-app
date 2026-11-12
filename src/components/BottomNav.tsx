// src/components/BottomNav.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/transactions", label: "Transactions" },
  { to: "/add", label: "Add", isAdd: true },
  { to: "/debts", label: "Debts" },
  { to: "/more", label: "More" },
];

export const BottomNav: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Main Navigation"
      className="flex justify-between items-center gap-1.5 px-3 pt-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-amber-100/80 dark:border-gray-800 shadow-lg max-w-md mx-auto w-full"
    >
      {navItems.map((item) =>
        item.isAdd ? (
          <Link
            key={item.to}
            to={item.to}
            aria-label="Add new entry"
            className="flex-1 mx-1 py-3 min-h-[48px] text-sm font-bold rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-center flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all shadow-md shadow-orange-500/25 active:scale-95"
          >
            ➕ {item.label}
          </Link>
        ) : (
          <Link
            key={item.to}
            to={item.to}
            aria-current={pathname === item.to ? "page" : undefined}
            className={`flex-1 text-center py-2.5 min-h-[48px] flex items-center justify-center text-xs font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              pathname === item.to
                ? "text-orange-800 dark:text-amber-300 font-bold bg-orange-100/90 dark:bg-amber-950/70 shadow-xs"
                : "text-gray-700 dark:text-gray-200 hover:text-orange-700 dark:hover:text-amber-300"
            }`}
          >
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
};

export default BottomNav;
