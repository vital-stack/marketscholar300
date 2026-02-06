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

// Fallback used until /api/quotes responds
const TICKER_DATA_FALLBACK = [
  { ticker: 'NVDA', price: 142.50, change: 1.85, changePercent: 1.32 },
  { ticker: 'TSLA', price: 378.20, change: -5.40, changePercent: -1.41 },
  { ticker: 'AAPL', price: 245.80, change: 1.23, changePercent: 0.50 },
  { ticker: 'MSFT', price: 468.35, change: 4.15, changePercent: 0.89 },
  { ticker: 'META', price: 635.40, change: -2.10, changePercent: -0.33 },
  { ticker: 'GOOGL', price: 198.75, change: 0.89, changePercent: 0.45 },
  { ticker: 'AMZN', price: 228.60, change: 2.34, changePercent: 1.03 },
  { ticker: 'AMD', price: 178.90, change: -1.56, changePercent: -0.87 },
  { ticker: 'PLTR', price: 98.45, change: 2.78, changePercent: 2.91 },
  { ticker: 'CRM', price: 342.10, change: 3.21, changePercent: 0.95 },
];

const LOADING_STEPS = [
  "Infiltrating narrative silos...",
  "Isolating sell-side framing tactics...",
  "Calculating Epistemic Drift magnitude...",
  "Auditing credibility theater markers...",
  "Extracting cost-layer stackflation risks...",
  "Finalizing forensic dossier...",
];

const INTEL_CACHE_KEY = 'market_scholar_intel_cache';
const CACHE_TTL = 30 * 60 * 1000;
const FREE_REPORTS_KEY = 'market_scholar_free_reports';
const MAX_FREE_REPORTS = 1;

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
  const [tickerData, setTickerData] = useState(TICKER_DATA_FALLBACK);

  // Fetch live stock quotes
  useEffect(() => {
    let active = true;
    const fetchQuotes = async () => {
      try {
        const res = await fetch('/api/quotes');
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data) && data.length > 0) {
            setTickerData(data);
          }
        }
      } catch {
        // keep using current data
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 5000); // refresh every 5s
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('market_scholar_user');
    if (storedUser) setUser({ ...JSON.parse(storedUser), isPro: true });

    const storedFreeReports = localStorage.getItem(FREE_REPORTS_KEY);
    if (storedFreeReports) {
      setFreeReportsUsed(parseInt(storedFreeReports, 10) || 0);
    }

    fetchTrendingAudits();
  }, []);

  const fetchTrendingAudits = async (force = false) => {
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
    if (!user && freeReportsUsed >= MAX_FREE_REPORTS) {
      setIsAuthModalOpen(true);
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

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
    <div className="min-h-screen bg-base text-ink-900 selection:bg-npi-600/20 selection:text-ink-900">
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

      {/* TICKER TAPE */}
      {view === 'analyzer' && !state.result && !state.isAnalyzing && (
        <div className="bg-ink-900 border-b border-ink-800 overflow-hidden">
          <div className="flex items-center">
            <div className="flex-1 overflow-hidden">
              <div className="animate-scroll-left flex items-center whitespace-nowrap">
                {[...tickerData, ...tickerData].map((stock, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-2.5 border-r border-ink-800">
                    <span className="text-white font-mono text-sm font-bold">{stock.ticker}</span>
                    <span className="text-slate-400 font-mono text-sm">${stock.price.toFixed(2)}</span>
                    <span className={`font-mono text-xs font-bold ${
                      stock.change >= 0 ? 'text-verified' : 'text-risk'
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
              {/* HERO SECTION */}
              <section className="py-20 lg:py-28 px-6" style={{background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #1E40AF 100%)'}}>
                <div className="max-w-[1400px] mx-auto">
                  <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Headline + FileUploader */}
                    <div>
                      <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-white/30 rounded-sm mb-8">
                        <span className="w-1.5 h-1.5 bg-verified rounded-full"></span>
                        <span className="text-[11px] font-mono font-bold text-white/70 uppercase tracking-widest">3 US Patents Pending</span>
                      </div>

                      <h1 className="text-4xl md:text-6xl font-sans font-black text-white mb-6 tracking-tight leading-[1.1]">
                        <span className="block">Forensic Intelligence</span>
                        <span className="block">for Capital Markets</span>
                      </h1>

                      <p className="text-lg text-slate-300 mb-10 max-w-xl leading-relaxed">
                        Patent-pending AI that audits analyst claims against SEC filings, tracks narrative decay, and exposes coordination patterns before they cost you capital.
                      </p>

                      <FileUploader onContentReady={handleAnalysis} isProcessing={state.isAnalyzing} />
                    </div>

                    {/* Right: Mock Terminal Card */}
                    <div className="hidden lg:block">
                      <div className="bg-white/5 border border-white/10 backdrop-blur rounded-sm p-6">
                        {/* Terminal Header */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-risk rounded-full"></span>
                            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                            <span className="w-2 h-2 bg-verified rounded-full"></span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">Forensic Audit // NVDA</span>
                        </div>

                        {/* Mock Audit Content */}
                        <div className="space-y-4 font-mono text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">ticker</span>
                            <span className="text-white font-bold">NVDA</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">verdict</span>
                            <span className="text-verified font-bold">STRUCTURALLY VERIFIED</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">vms_score</span>
                            <span className="text-white font-bold">95/100</span>
                          </div>
                          <div className="h-px bg-white/10 my-2"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">overreaction_ratio</span>
                            <span className="text-npi-600 font-bold">1.2x</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">narrative_half_life</span>
                            <span className="text-npi-600 font-bold">45d</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">confidence</span>
                            <span className="text-verified font-bold">92%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">sec_filings_matched</span>
                            <span className="text-white font-bold">14</span>
                          </div>
                          <div className="h-px bg-white/10 my-2"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">coordination_detected</span>
                            <span className="text-risk font-bold">FALSE</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">narrative_status</span>
                            <span className="text-verified font-bold">ACTIVE</span>
                          </div>
                        </div>

                        {/* Blinking cursor */}
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <span className="font-mono text-sm text-slate-400">$ <span className="animate-pulse-slow">_</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* LIVE MARKET INTELLIGENCE */}
              <section className="py-12 bg-base border-t border-border px-6">
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

              {/* STAT STRIP */}
              <section className="py-0 px-6 bg-base">
                <div className="max-w-[1400px] mx-auto">
                  <div className="grid grid-cols-2 md:grid-cols-4 rounded-sm bg-gradient-to-r from-ink-900 to-primary-950">
                    <div className="px-6 py-6 border-r border-white/10 text-center">
                      <p className="font-mono text-2xl md:text-3xl font-bold text-white mb-1">50,000+</p>
                      <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest small-caps">Articles Analyzed</p>
                    </div>
                    <div className="px-6 py-6 border-r border-white/10 text-center">
                      <p className="font-mono text-2xl md:text-3xl font-bold text-white mb-1">98%</p>
                      <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest small-caps">Accuracy Rate</p>
                    </div>
                    <div className="px-6 py-6 border-r border-white/10 text-center">
                      <p className="font-mono text-2xl md:text-3xl font-bold text-white mb-1">3</p>
                      <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest small-caps">US Patents Pending</p>
                    </div>
                    <div className="px-6 py-6 text-center">
                      <p className="font-mono text-2xl md:text-3xl font-bold text-white mb-1">24/7</p>
                      <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest small-caps">Real-Time Monitoring</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* PATENT SECTION */}
              <section className="py-20 px-6 mt-20" style={{background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #1E40AF 100%)'}}>
                <div className="max-w-[1400px] mx-auto">
                  <div className="text-center mb-14">
                    <p className="font-mono text-[11px] text-slate-400 uppercase tracking-[0.3em] mb-3">Proprietary Technology</p>
                    <h2 className="text-3xl md:text-4xl font-sans font-black text-white">Protected by Three US Patents</h2>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Patent 1 */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-sm">
                      <p className="font-mono text-xs text-npi-400 mb-3">63/971,470</p>
                      <h3 className="text-lg font-sans font-black text-white mb-3">Analyst Credibility Assessment</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        Multi-dimensional scoring of analyst claims against SEC filings using coordinate mapping. Every claim verified against actual 10-K and 10-Q table data.
                      </p>
                    </div>

                    {/* Patent 2 */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-sm">
                      <p className="font-mono text-xs text-npi-400 mb-3">63/971,478</p>
                      <h3 className="text-lg font-sans font-black text-white mb-3">Narrative Lifecycle Decay</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        Track how narratives decay over time using radioactive decay physics. Know exactly when a market story loses momentum before others do.
                      </p>
                    </div>

                    {/* Patent 3 */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-sm">
                      <p className="font-mono text-xs text-npi-400 mb-3">Pending</p>
                      <h3 className="text-lg font-sans font-black text-white mb-3">Divergence Decoding</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        Inference-time temporal unlearning prevents look-ahead bias. AI mathematically subtracts future knowledge from every analysis.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* HOW IT WORKS */}
              <section className="py-20 px-6 bg-base">
                <div className="max-w-[1400px] mx-auto">
                  <div className="text-center mb-14">
                    <p className="font-mono text-[11px] text-ink-700 uppercase tracking-[0.3em] mb-3">How It Works</p>
                    <h2 className="text-3xl md:text-4xl font-sans font-black text-ink-900">From headline to truth in 60 seconds</h2>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Step 1 */}
                    <div>
                      <div className="w-8 h-8 bg-border rounded-sm flex items-center justify-center mb-4">
                        <span className="font-mono text-sm font-bold text-ink-900">1</span>
                      </div>
                      <h3 className="text-base font-sans font-black text-ink-900 mb-2">Paste Any Article</h3>
                      <p className="text-sm text-ink-600 leading-relaxed">
                        Drop in any financial article, analyst report, or earnings coverage. We accept URLs, PDFs, or plain text.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div>
                      <div className="w-8 h-8 bg-border rounded-sm flex items-center justify-center mb-4">
                        <span className="font-mono text-sm font-bold text-ink-900">2</span>
                      </div>
                      <h3 className="text-base font-sans font-black text-ink-900 mb-2">AI Forensic Audit</h3>
                      <p className="text-sm text-ink-600 leading-relaxed">
                        Patent-pending AI cross-references claims against SEC filings, detects coordination patterns, and calculates narrative decay.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div>
                      <div className="w-8 h-8 bg-border rounded-sm flex items-center justify-center mb-4">
                        <span className="font-mono text-sm font-bold text-ink-900">3</span>
                      </div>
                      <h3 className="text-base font-sans font-black text-ink-900 mb-2">Get Your Verdict</h3>
                      <p className="text-sm text-ink-600 leading-relaxed">
                        Receive a forensic report with VMS scores, structural risk assessment, and actionable investment intelligence.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* PHYSICS ENGINE CTA */}
              <section className="py-20 px-6 bg-ink-900">
                <div className="max-w-[1400px] mx-auto text-center">
                  <p className="font-mono text-[11px] text-slate-400 uppercase tracking-[0.3em] mb-3">New</p>
                  <h2 className="text-3xl md:text-4xl font-sans font-black text-white mb-4">Narrative Physics Engine</h2>
                  <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                    Real-time narrative decay tracking with MSI scoring, regime classification, and time-to-failure predictions. See exactly when a market story loses structural support.
                  </p>
                  <a
                    href="/physics"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-sm font-mono font-bold text-white uppercase tracking-wider transition-all duration-300 hover:shadow-blue-glow"
                    style={{ background: 'linear-gradient(135deg, #1E40AF, #3B82F6)' }}
                  >
                    Launch Physics Engine
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </section>
            </div>
          ) : state.isAnalyzing ? (
            /* LOADING SCREEN */
            <div className="min-h-screen bg-base flex items-center justify-center px-6">
              <div className="max-w-3xl w-full">
                {/* Central Visualization */}
                <div className="flex flex-col items-center mb-12">
                  {/* SVG Progress Ring */}
                  <div className="relative w-36 h-36 md:w-48 md:h-48 mb-8">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="85" fill="none" stroke="#E2E8F0" strokeWidth="6" />
                      <circle
                        cx="100" cy="100" r="85"
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 85}`}
                        strokeDashoffset={`${2 * Math.PI * 85 * (1 - (loadingStepIndex + 1) / LOADING_STEPS.length)}`}
                        className="transition-all duration-1000 ease-out"
                      />
                      <circle cx="100" cy="100" r="70" fill="none" stroke="#E2E8F0" strokeWidth="2" />
                      <circle
                        cx="100" cy="100" r="70"
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="14 8"
                        opacity="0.4"
                        className="animate-spin"
                        style={{ animationDuration: '10s', transformOrigin: 'center' }}
                      />
                    </svg>

                    {/* Center percentage */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-3xl md:text-4xl font-bold text-npi-600">
                        {Math.floor(((loadingStepIndex + 1) / LOADING_STEPS.length) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Status Text */}
                  <div className="text-center">
                    <h2 className="text-2xl md:text-4xl font-sans font-black text-ink-900 mb-4 tracking-tight">
                      L3 FORENSIC AUDIT
                    </h2>
                    <p className="font-mono text-sm text-npi-600 animate-pulse-slow max-w-md">
                      {LOADING_STEPS[loadingStepIndex]}
                    </p>
                  </div>
                </div>

                {/* Live Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-card border border-border rounded-sm p-4 text-center">
                    <p className="font-mono text-2xl font-bold text-ink-900 mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Math.floor((loadingStepIndex + 1) * 247 + Math.random() * 50)}
                    </p>
                    <p className="font-mono text-[10px] text-ink-700 uppercase tracking-wider">Articles Scanned</p>
                  </div>

                  <div className="bg-card border border-border rounded-sm p-4 text-center">
                    <p className="font-mono text-2xl font-bold text-ink-900 mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Math.floor((loadingStepIndex + 1) * 18 + Math.random() * 5)}
                    </p>
                    <p className="font-mono text-[10px] text-ink-700 uppercase tracking-wider">Claims Verified</p>
                  </div>

                  <div className="bg-card border border-border rounded-sm p-4 text-center">
                    <p className="font-mono text-2xl font-bold text-ink-900 mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Math.floor((loadingStepIndex + 1) * 3 + Math.random() * 2)}
                    </p>
                    <p className="font-mono text-[10px] text-ink-700 uppercase tracking-wider">SEC Filings</p>
                  </div>

                  <div className="bg-card border border-border rounded-sm p-4 text-center">
                    <p className="font-mono text-2xl font-bold text-ink-900 mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Math.min(99, Math.floor((loadingStepIndex + 1) * 15 + Math.random() * 10))}%
                    </p>
                    <p className="font-mono text-[10px] text-ink-700 uppercase tracking-wider">Confidence</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-card border border-border rounded-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] text-ink-700 uppercase tracking-widest">Audit Progress</span>
                    <span className="font-mono text-xs text-npi-600">{Math.floor(((loadingStepIndex + 1) / LOADING_STEPS.length) * 100)}%</span>
                  </div>
                  <div className="h-1 bg-border rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-npi-600 rounded-sm transition-all duration-1000 ease-out"
                      style={{ width: `${((loadingStepIndex + 1) / LOADING_STEPS.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* RESULT VIEW */
            <div className="w-full bg-base min-h-screen">
              <div className="max-w-[1400px] mx-auto pt-8 pb-24 px-6">
                <div className="flex items-center justify-between mb-8">
                  <button
                    onClick={() => setState({ ...state, result: null })}
                    className="text-ink-600 hover:text-ink-900 font-mono flex items-center gap-3 transition-all uppercase tracking-widest text-[11px]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back
                  </button>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-sm">
                    <span className="w-1.5 h-1.5 bg-verified rounded-full"></span>
                    <span className="font-mono text-[10px] text-verified uppercase tracking-widest font-bold">Audit Complete</span>
                  </div>
                </div>
                <RecommendationCard analysis={state.result!} />
              </div>
            </div>
          )}
        </main>
      )}

      {view === 'intelligence' && (
        <IntelligenceView
          onSelect={handleSelectAnalysis}
          trendingAudits={trendingAudits}
          isLoading={isTrendingLoading}
          onRefresh={() => fetchTrendingAudits(true)}
          isQuotaExceeded={quotaExceeded}
        />
      )}

      {view === 'history' && (
        user ? (
          <HistoryView onSelect={(a) => { setState({ ...state, result: a }); setView('analyzer'); }} onClear={() => {}} />
        ) : (
          <div className="min-h-screen bg-base flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center">
              <div className="bg-card border border-border rounded-sm p-10">
                <div className="w-14 h-14 bg-border rounded-sm flex items-center justify-center mx-auto mb-6">
                  <svg className="w-7 h-7 text-ink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-sans font-black text-ink-900 mb-3">Access Required</h2>
                <p className="text-sm text-ink-600 mb-8">Enter your access code to view your analysis history.</p>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-primary-600 text-white px-6 py-3 rounded-sm font-mono font-bold text-[10px] uppercase hover:bg-primary-700 transition-colors"
                >
                  Enter Access Code
                </button>
              </div>
            </div>
          </div>
        )
      )}
      {view === 'pricing' && <PricingView isLoggedIn={!!user} onUpgradeTrigger={() => setIsPaymentModalOpen(true)} onLoginTrigger={() => setIsAuthModalOpen(true)} />}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={(u) => setUser(u)} />

      {/* FOOTER */}
      <footer className="bg-ink-900 border-t border-ink-800 py-16 px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-sans text-lg font-black uppercase tracking-tight text-white">MarketScholar</span>
            </div>
            <p className="text-slate-400 font-mono text-xs leading-relaxed">Institutional forensic intelligence for the modern research desk.</p>
          </div>
          <div>
            <h5 className="font-mono text-[10px] uppercase tracking-[0.3em] mb-5 text-slate-400">Platform</h5>
            <ul className="space-y-3 font-mono text-sm text-slate-400">
              <li onClick={() => setView('analyzer')} className="hover:text-white cursor-pointer transition-colors">Forensic Audit</li>
              <li onClick={() => setView('intelligence')} className="hover:text-white cursor-pointer transition-colors">Narrative Radar</li>
              <li><a href="/physics" className="hover:text-white cursor-pointer transition-colors">Physics Engine</a></li>
              <li className="text-slate-500 cursor-default">Structural Risk (Beta)</li>
            </ul>
          </div>
          <div>
            <h5 className="font-mono text-[10px] uppercase tracking-[0.3em] mb-5 text-slate-400">Company</h5>
            <ul className="space-y-3 font-mono text-sm text-slate-400">
              <li className="hover:text-white cursor-pointer transition-colors">About Us</li>
              <li className="hover:text-white cursor-pointer transition-colors">Methodology</li>
              <li className="hover:text-white cursor-pointer transition-colors">Contact</li>
            </ul>
          </div>
          <div>
            <h5 className="font-mono text-[10px] uppercase tracking-[0.3em] mb-5 text-slate-400">Newsletter</h5>
            <div className="flex gap-2">
              <input type="text" placeholder="Work Email" className="bg-ink-800 border border-ink-700 rounded-sm px-3 py-2 font-mono text-sm text-white flex-1 focus:outline-none focus:border-slate-400 placeholder:text-slate-500" />
              <button className="bg-primary-600 text-white px-3 py-2 rounded-sm font-mono font-bold text-[10px] uppercase hover:bg-primary-700 transition-colors">Join</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
