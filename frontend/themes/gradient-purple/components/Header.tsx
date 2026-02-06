'use client';

import React from 'react';
import { AppView, User } from '@/types';

interface HeaderProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  user: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView, user, onLoginClick, onLogout }) => {
  // Only show Narrative Radar and History if user is logged in
  const navItems: { view: AppView; label: string; requiresAuth?: boolean }[] = [
    { view: 'analyzer', label: 'Forensic Audit' },
    { view: 'intelligence', label: 'Narrative Radar', requiresAuth: true },
    { view: 'history', label: 'History', requiresAuth: true },
    { view: 'pricing', label: 'Pricing' },
  ];

  const handleNavClick = (view: AppView, requiresAuth?: boolean) => {
    if (requiresAuth && !user) {
      onLoginClick();
    } else {
      setView(view);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setView('analyzer')}
          >
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-xl font-black uppercase tracking-tight text-slate-900">
              MarketScholar
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ view, label, requiresAuth }) => (
              <button
                key={view}
                onClick={() => handleNavClick(view, requiresAuth)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg flex items-center gap-1.5 ${
                  currentView === view
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {requiresAuth && !user && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                {label}
              </button>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {user.isPro && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                    Pro
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={onLogout}
                    className="text-xs text-slate-500 hover:text-slate-900 font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
