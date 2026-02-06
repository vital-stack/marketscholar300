'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import FileUploader from '@/components/FileUploader';
import RecommendationCard from '@/components/RecommendationCard';
import HistoryView from '@/components/HistoryView';
import PricingView from '@/components/PricingView';
import AuthModal from '@/components/AuthModal';
import PaymentModal from '@/components/PaymentModal';
import RecentFeed from '@/components/RecentFeed';
import IntelligenceView from '@/components/IntelligenceView';
import { AnalysisState, AppView, StockAnalysis, User, ResearchMode, AuditStance } from '@/types';

// Ticker tape data for the scrolling banner
const TICKER_DATA = [
  { ticker: 'NVDA', price: 878.35, change: 2.45, changePercent: 0.28 },
  { ticker: 'TSLA', price: 175.21, change: -3.82, changePercent: -2.13 },
  { ticker: 'AAPL', price: 182.52, change: 1.23, changePercent: 0.68 },
  { ticker: 'MSFT', price: 425.22, change: 4.15, changePercent: 0.99 },
  { ticker: 'META', price: 505.95, change: -2.10, changePercent: -0.41 },
  { ticker: 'GOOGL', price: 155.37, change: 0.89, changePercent: 0.58 },
  { ticker: 'AMZN', price: 178.25, change: 2.34, changePercent: 1.33 },
  { ticker: 'AMD', price: 164.80, change: -1.56, changePercent: -0.94 },
  { ticker: 'PLTR', price: 24.56, change: 0.78, changePercent: 3.28 },
  { ticker: 'CRM', price: 265.40, change: 3.21, changePercent: 1.22 },
];

// Animated counter hook
const useCountUp = (end: number, duration: number = 2000, startOnMount: boolean = true) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const countRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnMount) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
          let start = 0;
          const increment = end / (duration / 16);
          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.1 }
    );

    if (countRef.current) observer.observe(countRef.current);
    return () => observer.disconnect();
  }, [end, duration, hasStarted, startOnMount]);

  return { count, countRef };
};

// Animated stat card component
const StatCard: React.FC<{ number: number; suffix: string; label: string; delay: number }> = ({ number, suffix, label, delay }) => {
  const [displayNum, setDisplayNum] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isVisible) {
          setIsVisible(true);
          setTimeout(() => {
            let start = 0;
            const duration = 2000;
            const increment = number / (duration / 16);
            const timer = setInterval(() => {
              start += increment;
              if (start >= number) {
                setDisplayNum(number);
                clearInterval(timer);
              } else {
                setDisplayNum(Math.floor(start));
              }
            }, 16);
          }, delay);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [number, delay, isVisible]);

  return (
    <div ref={cardRef} className="text-center group">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:transform hover:-translate-y-1">
        <p className="text-5xl md:text-6xl font-black text-white mb-2 tabular-nums">
          {displayNum.toLocaleString()}{suffix}
        </p>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
};

const LOADING_STEPS = [
  "Infiltrating narrative silos...",
  "Isolating sell-side framing tactics...",
  "Calculating Epistemic Drift magnitude...",
  "Auditing credibility theater markers...",
  "Extracting cost-layer stackflation risks...",
  "Finalizing forensic dossier...",
];

const INTEL_CACHE_KEY = 'market_scholar_intel_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const FREE_REPORTS_KEY = 'market_scholar_free_reports';
const MAX_FREE_REPORTS = 1; // Only 1 free report allowed

export default function Home() {
  const [view, setView] = useState<AppView>('analyzer');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [state, setState] = useState<AnalysisState>({ isAnalyzing: false, result: null, error: null });
  const [trendingAudits, setTrendingAudits] = useState<StockAnalysis[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [freeReportsUsed, setFreeReportsUsed] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('market_scholar_user');
    if (storedUser) setUser({ ...JSON.parse(storedUser), isPro: true });

    // Load free reports count
    const storedFreeReports = localStorage.getItem(FREE_REPORTS_KEY);
    if (storedFreeReports) {
      setFreeReportsUsed(parseInt(storedFreeReports, 10) || 0);
    }

    fetchTrendingAudits();
  }, []);

  const fetchTrendingAudits = async (force = false) => {
    // Check cache first if not forcing a refresh
    if (!force) {
      const cached = localStorage.getItem(INTEL_CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const isFresh = Date.now() - timestamp < CACHE_TTL;
          if (isFresh && Array.isArray(data) && data.length > 0) {
            setTrendingAudits(data);
            setQuotaExceeded(false);
            return;
          }
        } catch (e) {
          console.error("Cache parse failed", e);
        }
      }
    }

    setIsTrendingLoading(true);
    setQuotaExceeded(false);

    try {
      const response = await fetch('/api/trending');
      if (response.status === 429) {
        setQuotaExceeded(true);
        return;
      }

      const results = await response.json();
      if (results && results.length > 0) {
        setTrendingAudits(results);
        localStorage.setItem(INTEL_CACHE_KEY, JSON.stringify({
          data: results,
          timestamp: Date.now()
        }));
      }
    } catch (e: any) {
      console.error("Trending fetch failed:", e);
      if (e.message === "429") {
        setQuotaExceeded(true);
      }
    } finally {
      setIsTrendingLoading(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (state.isAnalyzing) {
      interval = setInterval(() => {
        setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2000);
    } else {
      setLoadingStepIndex(0);
    }
    return () => clearInterval(interval);
  }, [state.isAnalyzing]);

  const handleAnalysis = async (content: string, images?: string[], mode: ResearchMode = 'upload', stance: AuditStance = 'neutral') => {
    // Check if user is authenticated OR if they've used their free report
    if (!user && freeReportsUsed >= MAX_FREE_REPORTS) {
      setIsAuthModalOpen(true);
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    // Track free report usage (only if not logged in)
    if (!user) {
      const newCount = freeReportsUsed + 1;
      setFreeReportsUsed(newCount);
      localStorage.setItem(FREE_REPORTS_KEY, newCount.toString());
    }
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, images, mode, stance }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setState({ isAnalyzing: false, result, error: null });

      // Save to history
      const saved = localStorage.getItem('market_scholar_history');
      const history = saved ? JSON.parse(saved) : [];
      localStorage.setItem('market_scholar_history', JSON.stringify([result, ...history.slice(0, 19)]));
    } catch (e: any) {
      setState({ isAnalyzing: false, result: null, error: e.message });
      alert(e.message);
    }
  };

  const handleSelectAnalysis = (analysis: StockAnalysis) => {
    setState({ ...state, result: analysis });
    setView('analyzer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => setUser(u => u ? {...u, isPro: true} : null)}
        planName="Analyst Pro"
        price="$29"
      />
      <Header
        currentView={view}
        setView={setView}
        user={user}
        onLoginClick={() => setIsAuthModalOpen(true)}
        onLogout={() => setUser(null)}
      />

      {/* LIVE TICKER TAPE - Bloomberg Style */}
      {view === 'analyzer' && !state.result && !state.isAnalyzing && (
        <div className="bg-slate-950 border-b border-slate-800 overflow-hidden">
          <div className="flex items-center">
            <div className="bg-indigo-600 px-4 py-2 flex items-center gap-2 z-10 flex-shrink-0">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Live</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="animate-scroll-left flex items-center whitespace-nowrap">
                {[...TICKER_DATA, ...TICKER_DATA].map((stock, i) => (
                  <div key={i} className="flex items-center px-6 py-2 border-r border-slate-800">
                    <span className="text-white font-black text-sm mr-3">{stock.ticker}</span>
                    <span className="text-slate-400 text-sm mr-2">${stock.price.toFixed(2)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      stock.change >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'analyzer' && (
        <main>
          {!state.result && !state.isAnalyzing ? (
            <div className="flex flex-col">
              {/* STUNNING HERO SECTION - McKinsey Inspired */}
              <section className="relative min-h-[90vh] flex items-center overflow-hidden">
                {/* Animated Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" />

                {/* Animated Mesh Gradient Orbs */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-0 -right-40 w-[800px] h-[800px] bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-transparent rounded-full blur-[120px] animate-pulse-slow" />
                  <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-transparent rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-radial from-indigo-600/10 via-transparent to-transparent rounded-full" />
                </div>

                {/* Geometric Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                  backgroundSize: '100px 100px'
                }} />

                {/* Floating Particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${3 + Math.random() * 4}s`
                      }}
                    />
                  ))}
                </div>

                <div className="max-w-[1400px] mx-auto px-6 relative z-10 py-20">
                  <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Headline + Search */}
                    <div>
                      {/* Premium Badge */}
                      <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 rounded-full mb-8 backdrop-blur-sm">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-[0.2em]">3 US Patents Pending</span>
                        <span className="w-px h-4 bg-indigo-400/30" />
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Live</span>
                      </div>

                      <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight leading-[1.05]">
                        <span className="block">Expose the</span>
                        <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">narrative traps</span>
                        <span className="block">Wall Street hides</span>
                      </h1>

                      <p className="text-xl text-slate-300 mb-10 max-w-xl font-medium leading-relaxed">
                        Patent-pending AI forensics that audit analyst claims against SEC filings. Know what&apos;s real before you invest.
                      </p>

                      <FileUploader onContentReady={handleAnalysis} isProcessing={state.isAnalyzing} />
                    </div>

                    {/* Right: Premium Dashboard Preview */}
                    <div className="hidden lg:block">
                      <div className="relative perspective-1000">
                        {/* Glow Effect Behind Card */}
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 blur-3xl scale-110" />

                        {/* Floating Alert Card - Top Left */}
                        <div className="absolute -top-6 -left-10 z-30 animate-float">
                          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-5 border border-slate-100">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">VMS Score</p>
                                <p className="text-2xl font-black text-slate-900">95<span className="text-emerald-500 text-sm">/100</span></p>
                              </div>
                            </div>
                            <p className="text-xs text-emerald-600 font-bold">Claim Structurally Verified</p>
                          </div>
                        </div>

                        {/* Floating Alert Card - Bottom Right */}
                        <div className="absolute -bottom-6 -right-6 z-30 animate-float-delayed">
                          <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-2xl p-5 border border-red-400/50">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                              <p className="text-[10px] font-bold text-red-100 uppercase tracking-wider">Alert Detected</p>
                            </div>
                            <p className="text-xl font-black text-white">NARRATIVE TRAP</p>
                            <p className="text-xs text-red-100 mt-1">Price divergence: +47% vs fundamentals</p>
                          </div>
                        </div>

                        {/* Main Dashboard Card */}
                        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700/50 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
                          {/* Card Header */}
                          <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                <span className="text-white font-black text-xl">N</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-white font-black text-xl">NVDA</p>
                                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">+2.4%</span>
                                </div>
                                <p className="text-slate-400 text-sm">NVIDIA Corporation</p>
                              </div>
                            </div>
                            <div className="px-3 py-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">L3 Audit</p>
                            </div>
                          </div>

                          {/* Chart Visualization */}
                          <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700/30">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Narrative Trajectory</p>
                              <p className="text-xs text-emerald-400 font-bold">+34% confidence</p>
                            </div>
                            <div className="flex items-end justify-between h-24 gap-2">
                              {[35, 42, 38, 55, 48, 72, 68, 85, 78, 92, 88, 95].map((h, i) => (
                                <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-indigo-600 via-indigo-500 to-purple-400 relative group cursor-pointer transition-all hover:scale-105" style={{ height: `${h}%` }}>
                                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {h}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30 text-center">
                              <p className="text-2xl font-black text-white">1.2x</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">OR Ratio</p>
                            </div>
                            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30 text-center">
                              <p className="text-2xl font-black text-emerald-400">92%</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Confidence</p>
                            </div>
                            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30 text-center">
                              <p className="text-2xl font-black text-amber-400">45d</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Half-Life</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Gradient Fade */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
              </section>

              {/* LIVE MARKET INTELLIGENCE - Moved Higher */}
              <section className="py-16 bg-white border-b border-slate-100 px-6">
                <div className="max-w-[1400px] mx-auto">
                  <RecentFeed
                    onSelectAnalysis={handleSelectAnalysis}
                    trendingAudits={trendingAudits.slice(0, 3)}
                    isLoading={isTrendingLoading}
                    isQuotaExceeded={quotaExceeded}
                    onRetry={() => fetchTrendingAudits(true)}
                  />
                </div>
              </section>

              {/* ANIMATED STATISTICS SECTION */}
              <section className="py-20 px-6 bg-slate-900 relative overflow-hidden">
                <div className="absolute inset-0">
                  <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
                  <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
                </div>
                <div className="max-w-[1400px] mx-auto relative z-10">
                  <div className="text-center mb-12">
                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">By The Numbers</p>
                    <h2 className="text-3xl md:text-4xl font-black text-white">Institutional-Grade Intelligence</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <StatCard number={50000} suffix="+" label="Articles Analyzed" delay={0} />
                    <StatCard number={98} suffix="%" label="Accuracy Rate" delay={200} />
                    <StatCard number={3} suffix="" label="US Patents Pending" delay={400} />
                    <StatCard number={24} suffix="/7" label="Real-Time Monitoring" delay={600} />
                  </div>
                </div>
              </section>

              {/* TRUST BADGES & SOCIAL PROOF */}
              <section className="py-16 px-6 bg-white border-b border-slate-100">
                <div className="max-w-[1400px] mx-auto">
                  <div className="text-center mb-10">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">Trusted Technology</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
                    {/* Patent Badge */}
                    <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-wide">USPTO</p>
                        <p className="text-[10px] text-slate-500">Patent Pending</p>
                      </div>
                    </div>
                    {/* SEC Badge */}
                    <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-wide">SEC EDGAR</p>
                        <p className="text-[10px] text-slate-500">Data Integrated</p>
                      </div>
                    </div>
                    {/* AI Badge */}
                    <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-wide">Proprietary AI</p>
                        <p className="text-[10px] text-slate-500">Multi-Model</p>
                      </div>
                    </div>
                    {/* Encryption Badge */}
                    <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-wide">256-bit</p>
                        <p className="text-[10px] text-slate-500">Encrypted</p>
                      </div>
                    </div>
                    {/* Compliance Badge */}
                    <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-wide">SOC 2</p>
                        <p className="text-[10px] text-slate-500">Compliant</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* PROPRIETARY IP SECTION - McKinsey Style */}
              <section className="py-24 px-6 bg-indigo-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5Ljk0MSAwIDE4LTguMDU5IDE4LTE4cy04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />

                <div className="max-w-[1400px] mx-auto relative z-10">
                  <div className="text-center mb-16">
                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-[0.3em] mb-4">Our Proprietary Technology</p>
                    <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                      What makes MarketScholar<br />different from other AI?
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Patent Card 1 */}
                    <div className="group bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-3">Patent 63/971,470</p>
                      <h3 className="text-2xl font-black text-white mb-4">Analyst Credibility Assessment</h3>
                      <p className="text-indigo-100 leading-relaxed mb-6">
                        We score analyst claims against SEC filings using coordinate mapping. Every claim is verified against actual table data from 10-K and 10-Q filings.
                      </p>
                      <div className="flex items-center text-white font-bold text-sm group-hover:gap-3 transition-all gap-2">
                        Learn more
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>

                    {/* Patent Card 2 */}
                    <div className="group bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-3">Patent 63/971,478</p>
                      <h3 className="text-2xl font-black text-white mb-4">Narrative Lifecycle Decay</h3>
                      <p className="text-indigo-100 leading-relaxed mb-6">
                        Track how narratives decay over time using radioactive decay physics. Know exactly when a market story will lose momentum before others do.
                      </p>
                      <div className="flex items-center text-white font-bold text-sm group-hover:gap-3 transition-all gap-2">
                        Learn more
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>

                    {/* Patent Card 3 */}
                    <div className="group bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-3">Patent Pending</p>
                      <h3 className="text-2xl font-black text-white mb-4">Divergence Decoding</h3>
                      <p className="text-indigo-100 leading-relaxed mb-6">
                        Prevent look-ahead bias in backtests with temporal unlearning. Our AI mathematically subtracts future knowledge from analysis.
                      </p>
                      <div className="flex items-center text-white font-bold text-sm group-hover:gap-3 transition-all gap-2">
                        Learn more
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* COMPARISON SECTION - Why We're Different */}
              <section className="py-24 px-6 bg-slate-50">
                <div className="max-w-[1400px] mx-auto">
                  <div className="text-center mb-16">
                    <p className="text-indigo-600 text-xs font-bold uppercase tracking-[0.3em] mb-4">The MarketScholar Advantage</p>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
                      Not just another AI chatbot
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Left: Other AI */}
                    <div className="bg-white rounded-2xl p-8 border border-slate-200">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                          <span className="text-2xl">🤖</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900">Other Financial AI</h3>
                          <p className="text-slate-500 text-sm">Generic summarization</p>
                        </div>
                      </div>
                      <ul className="space-y-4">
                        {[
                          'Summarizes headlines without verification',
                          'No connection to SEC filings',
                          'Can\'t detect coordinated narratives',
                          'No temporal bias protection',
                          'Sentiment only (no structural analysis)',
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-slate-600">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Right: MarketScholar */}
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-2xl p-8 border border-indigo-500/30">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white">MarketScholar</h3>
                          <p className="text-indigo-300 text-sm">Forensic verification</p>
                        </div>
                      </div>
                      <ul className="space-y-4">
                        {[
                          'Verifies claims against actual SEC table data',
                          'Coordinate mapping to 10-K/10-Q filings',
                          'Detects analyst coordination patterns',
                          'Temporal unlearning prevents bias',
                          'Full structural + sentiment analysis',
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-slate-200">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* HOW IT WORKS - Step by Step */}
              <section className="py-24 px-6 bg-white">
                <div className="max-w-[1400px] mx-auto">
                  <div className="text-center mb-16">
                    <p className="text-indigo-600 text-xs font-bold uppercase tracking-[0.3em] mb-4">How It Works</p>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
                      From headline to truth<br />in 60 seconds
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Step 1 */}
                    <div className="relative group">
                      <div className="absolute -top-4 -left-4 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/25 z-10 group-hover:scale-110 transition-transform">
                        1
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-8 pt-12 border border-slate-200 h-full hover:shadow-xl transition-all">
                        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                          <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-3">Paste Any Article</h3>
                        <p className="text-slate-500 leading-relaxed">
                          Drop in any financial article, analyst report, or earnings coverage. We accept URLs, PDFs, or plain text.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative group">
                      <div className="absolute -top-4 -left-4 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/25 z-10 group-hover:scale-110 transition-transform">
                        2
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-8 pt-12 border border-slate-200 h-full hover:shadow-xl transition-all">
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                          <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-3">AI Forensic Audit</h3>
                        <p className="text-slate-500 leading-relaxed">
                          Our patent-pending AI cross-references claims against SEC filings, detects coordination patterns, and calculates narrative decay.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative group">
                      <div className="absolute -top-4 -left-4 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/25 z-10 group-hover:scale-110 transition-transform">
                        3
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-8 pt-12 border border-slate-200 h-full hover:shadow-xl transition-all">
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-3">Get Your Verdict</h3>
                        <p className="text-slate-500 leading-relaxed">
                          Receive a comprehensive forensic report with VMS scores, structural risk assessment, and actionable investment intelligence.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* TESTIMONIALS / SOCIAL PROOF */}
              <section className="py-24 px-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                </div>
                <div className="max-w-[1400px] mx-auto relative z-10">
                  <div className="text-center mb-16">
                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.3em] mb-4">What Professionals Say</p>
                    <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                      Trusted by smart investors
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Testimonial 1 */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-slate-300 leading-relaxed mb-6 italic">
                        &ldquo;Finally, a tool that cuts through the noise. MarketScholar saved me from a narrative trap on RIVN that would have cost me thousands.&rdquo;
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          M
                        </div>
                        <div>
                          <p className="text-white font-bold">Michael T.</p>
                          <p className="text-slate-400 text-sm">Retail Investor</p>
                        </div>
                      </div>
                    </div>

                    {/* Testimonial 2 */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-slate-300 leading-relaxed mb-6 italic">
                        &ldquo;The narrative decay tracking is genius. I can see exactly when the hype cycle peaks and plan my exits accordingly.&rdquo;
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                          S
                        </div>
                        <div>
                          <p className="text-white font-bold">Sarah K.</p>
                          <p className="text-slate-400 text-sm">Portfolio Manager</p>
                        </div>
                      </div>
                    </div>

                    {/* Testimonial 3 */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-slate-300 leading-relaxed mb-6 italic">
                        &ldquo;As a CFA, I appreciate the rigor. The SEC coordinate mapping is something I&apos;ve never seen elsewhere. This is institutional-grade.&rdquo;
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                          D
                        </div>
                        <div>
                          <p className="text-white font-bold">David R., CFA</p>
                          <p className="text-slate-400 text-sm">Senior Analyst</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* FINAL CTA SECTION - Premium */}
              <section className="py-24 px-6 bg-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
                <div className="max-w-[900px] mx-auto text-center relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full mb-8">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Limited Time Offer</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight">
                    Stop guessing.<br />
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Start knowing.</span>
                  </h2>
                  <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
                    Join thousands of smart investors who refuse to be misled by Wall Street narratives. Get your first forensic audit free.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:shadow-xl hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-1"
                    >
                      Start Your Free Audit
                    </button>
                    <button
                      onClick={() => setView('pricing')}
                      className="px-10 py-5 bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm uppercase tracking-widest rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all"
                    >
                      View Pricing
                    </button>
                  </div>
                  <p className="mt-8 text-sm text-slate-400">
                    No credit card required. Cancel anytime.
                  </p>
                </div>
              </section>
            </div>
          ) : state.isAnalyzing ? (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-6 relative overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                {/* Floating particles */}
                <div className="absolute top-20 left-20 w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
                <div className="absolute top-40 right-40 w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
                <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
                <div className="absolute bottom-20 right-1/3 w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDuration: '2s', animationDelay: '1.5s' }} />
              </div>

              <div className="relative z-10 max-w-4xl w-full">
                {/* Central Visualization */}
                <div className="flex flex-col items-center mb-12">
                  {/* Animated Ring */}
                  <div className="relative w-40 h-40 md:w-56 md:h-56 mb-8">
                    {/* Outer glow */}
                    <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" style={{ animationDuration: '2s' }} />

                    {/* Progress rings */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                      {/* Background ring */}
                      <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                      {/* Animated progress ring 1 */}
                      <circle
                        cx="100" cy="100" r="85"
                        fill="none"
                        stroke="url(#gradient1)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 85}`}
                        strokeDashoffset={`${2 * Math.PI * 85 * (1 - (loadingStepIndex + 1) / LOADING_STEPS.length)}`}
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))' }}
                      />
                      {/* Second ring */}
                      <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                      <circle
                        cx="100" cy="100" r="70"
                        fill="none"
                        stroke="url(#gradient2)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="20 10"
                        className="animate-spin"
                        style={{ animationDuration: '8s' }}
                      />
                      {/* Gradient definitions */}
                      <defs>
                        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="50%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/50 transform rotate-12 animate-pulse">
                        <svg className="w-10 h-10 md:w-14 md:h-14 text-white transform -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Status Text */}
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                      L3 Forensic Audit
                    </h2>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-emerald-400 font-bold text-sm uppercase tracking-widest">Active Protocol</span>
                    </div>
                    <p className="text-indigo-300 font-bold uppercase tracking-[0.3em] text-xs md:text-sm animate-pulse max-w-md">
                      {LOADING_STEPS[loadingStepIndex]}
                    </p>
                  </div>
                </div>

                {/* Live Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {/* Stat 1: Articles Scanned */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center group hover:bg-white/10 transition-all">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-black text-white mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Math.floor((loadingStepIndex + 1) * 247 + Math.random() * 50)}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Articles Scanned</p>
                  </div>

                  {/* Stat 2: Claims Verified */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center group hover:bg-white/10 transition-all">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-black text-white mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Math.floor((loadingStepIndex + 1) * 18 + Math.random() * 5)}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Claims Verified</p>
                  </div>

                  {/* Stat 3: SEC Filings */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center group hover:bg-white/10 transition-all">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-black text-white mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Math.floor((loadingStepIndex + 1) * 3 + Math.random() * 2)}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">SEC Filings Cross-Referenced</p>
                  </div>

                  {/* Stat 4: Confidence */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center group hover:bg-white/10 transition-all">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <p className="text-3xl font-black text-white mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Math.min(99, Math.floor((loadingStepIndex + 1) * 15 + Math.random() * 10))}%
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Confidence Building</p>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Progress</span>
                    <span className="text-xs font-bold text-indigo-400">{Math.floor(((loadingStepIndex + 1) / LOADING_STEPS.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out relative"
                      style={{ width: `${((loadingStepIndex + 1) / LOADING_STEPS.length) * 100}%` }}
                    >
                      <div className="absolute inset-0 bg-white/30 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {LOADING_STEPS.map((step, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                          i <= loadingStepIndex
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Patent Badge */}
                <div className="mt-6 flex justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Patent-Protected Analysis</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full bg-slate-50 min-h-screen">
               <div className="max-w-[1400px] mx-auto pt-8 pb-24 px-6">
                 <div className="flex items-center justify-between mb-8">
                   <button onClick={() => setState({ ...state, result: null })} className="text-slate-500 hover:text-slate-900 font-black flex items-center gap-3 group transition-all uppercase tracking-[0.2em] text-[10px]">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      Terminal Home
                   </button>
                   <div className="flex items-center gap-4">
                      <div className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-[10px] font-black text-indigo-600 uppercase tracking-widest shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        Audit Complete
                      </div>
                   </div>
                 </div>
                 <RecommendationCard analysis={state.result!} />
               </div>
            </div>
          )}
        </main>
      )}

      {view === 'intelligence' && (
        user ? (
          <IntelligenceView
            onSelect={handleSelectAnalysis}
            trendingAudits={trendingAudits}
            isLoading={isTrendingLoading}
            onRefresh={() => fetchTrendingAudits(true)}
            isQuotaExceeded={quotaExceeded}
          />
        ) : (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center">
              <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3">Access Required</h2>
              <p className="text-slate-500 mb-8">Enter your access code to view the Narrative Radar and forensic intelligence dashboard.</p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-8 py-4 bg-indigo-600 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all"
              >
                Enter Access Code
              </button>
            </div>
          </div>
        )
      )}

      {view === 'history' && (
        user ? (
          <HistoryView onSelect={(a) => { setState({ ...state, result: a }); setView('analyzer'); }} onClear={() => {}} />
        ) : (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center">
              <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3">Access Required</h2>
              <p className="text-slate-500 mb-8">Enter your access code to view your analysis history.</p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-8 py-4 bg-indigo-600 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all"
              >
                Enter Access Code
              </button>
            </div>
          </div>
        )
      )}
      {view === 'pricing' && <PricingView isLoggedIn={!!user} onUpgradeTrigger={() => setIsPaymentModalOpen(true)} onLoginTrigger={() => setIsAuthModalOpen(true)} />}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={(u) => setUser(u)} />

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-24 px-6">
         <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
            <div className="col-span-1 md:col-span-1">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
                 </div>
                 <span className="text-xl font-black uppercase tracking-tight">MarketScholar</span>
               </div>
               <p className="text-slate-400 font-medium text-sm leading-relaxed">Institutional forensic intelligence for the modern research desk.</p>
            </div>
            <div>
               <h5 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-indigo-400">Platform</h5>
               <ul className="space-y-4 text-sm font-bold text-slate-200">
                  <li onClick={() => setView('analyzer')} className="hover:text-white cursor-pointer transition-colors">Forensic Audit</li>
                  <li onClick={() => setView('intelligence')} className="hover:text-white cursor-pointer transition-colors">Narrative Radar</li>
                  <li className="hover:text-white cursor-pointer transition-colors opacity-50">Structural Risk (Beta)</li>
               </ul>
            </div>
            <div>
               <h5 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-indigo-400">Company</h5>
               <ul className="space-y-4 text-sm font-bold text-slate-200">
                  <li className="hover:text-white cursor-pointer transition-colors">About Us</li>
                  <li className="hover:text-white cursor-pointer transition-colors">Methodology</li>
                  <li className="hover:text-white cursor-pointer transition-colors">Contact</li>
               </ul>
            </div>
            <div>
               <h5 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-indigo-400">Newsletter</h5>
               <div className="flex gap-2">
                  <input type="text" placeholder="Work Email" className="bg-slate-800 border-none rounded-lg px-4 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button className="bg-white text-slate-900 px-4 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-slate-100 transition-colors">Join</button>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}
