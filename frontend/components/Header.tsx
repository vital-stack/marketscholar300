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
  const navItems: { view: AppView; label: string; requiresAuth?: boolean }[] = [
    { view: 'analyzer', label: 'Forensic Audit' },
    { view: 'intelligence', label: 'Narrative Radar' },
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
    <header className="sticky top-0 z-50 border-b border-white/10" style={{
      background: 'linear-gradient(135deg, #0F172A, #1E293B)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    }}>
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setView('analyzer')}
          >
            <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-sm flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-sm font-bold uppercase tracking-[0.15em] text-slate-300 group-hover:text-white transition-colors">
              MarketScholar
            </span>
            <span className="hidden md:inline px-2 py-0.5 text-[9px] font-mono font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-sm uppercase tracking-wider">
              Forensic
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map(({ view, label, requiresAuth }) => (
              <button
                key={view}
                onClick={() => handleNavClick(view, requiresAuth)}
                className={`px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-all rounded-sm flex items-center gap-1.5 ${
                  currentView === view
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {requiresAuth && !user && (
                  <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                {label}
              </button>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {user.isPro && (
                  <span className="px-2 py-0.5 bg-verified/10 text-verified text-[9px] font-mono font-bold uppercase tracking-wider rounded-sm border border-verified/20">
                    Pro
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white/10 border border-white/20 rounded-sm flex items-center justify-center text-[10px] font-mono font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={onLogout}
                    className="text-[10px] font-mono text-slate-400 hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-white rounded-sm transition-all hover:shadow-blue-glow"
                style={{ background: 'linear-gradient(135deg, #1E40AF, #3B82F6)' }}
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
