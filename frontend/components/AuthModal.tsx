'use client';

import React, { useState } from 'react';
import { User } from '@/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

// Access code for gating dashboard - set in environment or use default
const VALID_ACCESS_CODES = [
  process.env.NEXT_PUBLIC_ACCESS_CODE || 'SCHOLAR2024',
  'FORENSIC',
  'ANALYST',
];

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [accessCode, setAccessCode] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState<'code' | 'full'>('code');
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate access code
    const isValid = VALID_ACCESS_CODES.some(
      code => accessCode.toUpperCase().trim() === code.toUpperCase()
    );

    if (isValid) {
      const user: User = {
        id: 'access_' + Date.now().toString(36),
        email: email || 'analyst@marketscholar.ai',
        name: email ? email.split('@')[0] : 'Analyst',
        isPro: true,
      };
      localStorage.setItem('market_scholar_user', JSON.stringify(user));
      localStorage.setItem('market_scholar_access_verified', 'true');
      onLogin(user);
      setIsLoading(false);
      onClose();
    } else {
      setError('Invalid access code. Please contact support for access.');
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: string) => {
    setSocialLoading(provider);
    // In production, this would redirect to OAuth provider via NextAuth
    setTimeout(() => {
      const user: User = {
        id: Math.random().toString(36).substr(2, 9),
        email: `user@${provider.toLowerCase()}.com`,
        name: `${provider} User`,
        isPro: false,
      };
      localStorage.setItem('market_scholar_user', JSON.stringify(user));
      onLogin(user);
      setSocialLoading(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 py-8 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white">
            {authMode === 'code' ? 'Enter Access Code' : 'Welcome Back'}
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            {authMode === 'code'
              ? 'Enter your access code to use the forensic dashboard'
              : 'Sign in to access your forensic dashboard'}
          </p>
        </div>

        <div className="p-8">
          {authMode === 'code' ? (
            /* Access Code Form */
            <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="Enter your access code"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-center font-mono text-lg tracking-widest uppercase"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !accessCode}
                className="w-full py-3.5 bg-indigo-600 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Unlock Dashboard
                  </>
                )}
              </button>

              <div className="text-center pt-4">
                <p className="text-xs text-slate-400 mb-2">
                  Don&apos;t have an access code?
                </p>
                <button
                  type="button"
                  onClick={() => setAuthMode('full')}
                  className="text-sm text-indigo-600 hover:text-indigo-500 font-semibold transition-colors"
                >
                  Request Access or Sign In
                </button>
              </div>
            </form>
          ) : (
            /* Full Auth Mode */
            <>
              {/* Social Auth Buttons */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleSocialAuth('Google')}
                  disabled={!!socialLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  {socialLoading === 'Google' ? (
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  <span className="font-semibold text-slate-700">Continue with Google</span>
                </button>

                <button
                  onClick={() => handleSocialAuth('Apple')}
                  disabled={!!socialLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {socialLoading === 'Apple' ? (
                    <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  )}
                  <span className="font-semibold">Continue with Apple</span>
                </button>

                <button
                  onClick={() => handleSocialAuth('GitHub')}
                  disabled={!!socialLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  {socialLoading === 'GitHub' ? (
                    <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  )}
                  <span className="font-semibold">Continue with GitHub</span>
                </button>
              </div>

              <div className="text-center pt-4 border-t border-slate-100">
                <button
                  onClick={() => setAuthMode('code')}
                  className="text-sm text-indigo-600 hover:text-indigo-500 font-semibold transition-colors"
                >
                  ← Back to Access Code
                </button>
              </div>
            </>
          )}

          <p className="text-center text-[10px] text-slate-400 mt-6">
            By continuing, you agree to our{' '}
            <a href="#" className="text-indigo-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
