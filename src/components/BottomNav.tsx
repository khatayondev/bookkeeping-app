// src/components/BottomNav.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  {
    to: "/",
    label: "Home",
    icon: () => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: "/transactions",
    label: "Ledger",
    icon: () => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  { to: "/add", label: "Add", isAdd: true },
  {
    to: "/calculator",
    label: "Calc",
    icon: () => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="2" width="16" height="20" rx="3" />
        <line x1="8" y1="6" x2="16" y2="6" strokeLinecap="round" />
        <circle cx="8" cy="11" r="1" fill="currentColor" />
        <circle cx="12" cy="11" r="1" fill="currentColor" />
        <circle cx="16" cy="11" r="1" fill="currentColor" />
        <circle cx="8" cy="15" r="1" fill="currentColor" />
        <circle cx="12" cy="15" r="1" fill="currentColor" />
        <circle cx="16" cy="15" r="1" fill="currentColor" />
        <circle cx="8" cy="19" r="1" fill="currentColor" />
        <circle cx="12" cy="19" r="1" fill="currentColor" />
        <circle cx="16" cy="19" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: "/more",
    label: "More",
    icon: () => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
];

export const BottomNav: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 flex justify-center px-3 sm:px-4 pointer-events-none">
      <nav
        aria-label="Main Navigation"
        className="pointer-events-auto w-full max-w-sm bg-black dark:bg-[#141414] text-white rounded-full p-1.5 shadow-2xl border border-neutral-800 flex items-center justify-between transition-all backdrop-blur-lg"
      >
        {navItems.map((item) => {
          if (item.isAdd) {
            const isAddActive = pathname.startsWith("/add");
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label="Add new transaction"
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-2xl transition-transform active:scale-95 shrink-0 mx-0.5 shadow-md focus:outline-none focus:ring-2 focus:ring-[#FF6B00] ${
                  isAddActive
                    ? "bg-[#FF6B00] text-white ring-2 ring-white"
                    : "bg-[#FF6B00] text-white hover:bg-[#E05E00]"
                }`}
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
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full min-h-[44px] transition-all focus:outline-none focus:ring-2 focus:ring-[#FF6B00] ${
                isActive
                  ? "bg-[#FF6B00] text-white font-bold shadow-md"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span className="shrink-0">{item.icon ? item.icon() : null}</span>
              {isActive && (
                <span className="text-[11px] font-bold tracking-tight text-white">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;

