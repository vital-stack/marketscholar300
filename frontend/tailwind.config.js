/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ============================================
        // LUMINOUS INTELLIGENCE - Enterprise Light Theme
        // Psychology: Blue = trust/intelligence, White = clarity
        // ============================================
        base: '#F8FAFC',
        'base-alt': '#F1F5F9',
        card: '#FFFFFF',
        'card-hover': '#F8FAFC',
        border: '#E2E8F0',
        'border-light': '#F1F5F9',
        'border-focus': '#93C5FD',

        // Primary: Trust Blue (institutional, stable)
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },

        // NPI Purple: Proprietary, unique signal
        npi: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },

        // Semantic
        verified: '#059669',
        'verified-light': '#D1FAE5',
        risk: '#DC2626',
        'risk-light': '#FEE2E2',
        caution: '#D97706',
        'caution-light': '#FEF3C7',

        // Legacy aliases (keep old components working)
        math: '#7C3AED',
        'math-dim': '#6D28D9',
        anchor: '#059669',
        exhaustion: '#DC2626',
        momentum: '#059669',
        inertia: '#D97706',
        gravity: '#DC2626',
        reversion: '#4F46E5',
        catalyst: '#7C3AED',

        // Slate scale for text
        ink: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        xs: '4px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.12)',
        'card-hover': '0 10px 25px rgba(0,0,0,0.10), 0 4px 10px rgba(0,0,0,0.08)',
        'card-lg': '0 20px 40px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)',
        'blue-glow': '0 0 20px rgba(59, 130, 246, 0.25), 0 0 40px rgba(59, 130, 246, 0.10)',
        'npi-glow': '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.12)',
        'verified-glow': '0 0 12px rgba(5, 150, 105, 0.2)',
        'risk-glow': '0 0 16px rgba(220, 38, 38, 0.2)',
        'inner-light': 'inset 0 1px 0 rgba(255,255,255,0.8)',
        'float': '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
        'dark-card': '0 4px 16px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #1E40AF 100%)',
        'hero-gradient-subtle': 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 50%, #EFF6FF 100%)',
        'npi-gradient': 'linear-gradient(135deg, #8B5CF6, #6366F1)',
        'card-gradient': 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
        'blue-radial': 'radial-gradient(ellipse at top, rgba(59,130,246,0.08), transparent 70%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        'dark-blue': 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        'dark-blue-rich': 'linear-gradient(135deg, #0F172A 0%, #172554 50%, #1E3A8A 100%)',
        'dark-navy': 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
      },
      transitionDuration: {
        '1500': '1500ms',
        '2000': '2000ms',
      },
      animation: {
        'slideUp': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slideDown': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slideInRight': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
        'scaleIn': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'spin-slow': 'spin 12s linear infinite',
        'reverse-spin': 'spin 8s linear infinite reverse',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'ping-slow': 'ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'gradient-x': 'gradientX 8s ease infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'counter': 'countUp 0.6s ease-out forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'progress-fill': 'progressFill 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'orbit': 'orbit 20s linear infinite',
        'dash': 'dash 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'ping-slow': {
          '0%': { transform: 'scale(1)', opacity: '0.4' },
          '50%': { transform: 'scale(1.2)', opacity: '0.1' },
          '100%': { transform: 'scale(1)', opacity: '0.4' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59,130,246,0.2)' },
          '50%': { boxShadow: '0 0 0 8px rgba(59,130,246,0)' },
        },
        progressFill: {
          from: { width: '0%' },
          to: { width: 'var(--progress-width, 100%)' },
        },
        orbit: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        dash: {
          '0%': { strokeDashoffset: '100' },
          '50%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-100' },
        },
      },
    },
  },
  plugins: [],
}
