'use client';

import React, { useState } from 'react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  planName: string;
  price: string;
}

const PLANS = {
  analyst: {
    name: 'Analyst Pro',
    price: '$29',
    priceValue: 29,
    tier: 'analyst',
    features: [
      'Unlimited forensic audits',
      'Narrative Radar access',
      'Full PDF report exports',
      'Social media card exports',
      'Priority analysis queue',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: '$99',
    priceValue: 99,
    tier: 'enterprise',
    features: [
      'Everything in Analyst Pro',
      'Team collaboration (5 seats)',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'White-label reports',
    ],
  },
};

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  planName,
  price,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'analyst' | 'enterprise'>('analyst');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleStripeCheckout = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedPlan,
          email: email || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const plan = PLANS[selectedPlan];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-8 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-black">Upgrade to Pro</h2>
          </div>
          <p className="text-indigo-100 text-sm">Unlock unlimited forensic intelligence</p>
        </div>

        <div className="p-6">
          {/* Plan Toggle */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setSelectedPlan('analyst')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                selectedPlan === 'analyst'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-left">
                <div className="font-bold text-slate-900">Analyst Pro</div>
                <div className="text-2xl font-black text-indigo-600">$29<span className="text-sm font-normal text-slate-500">/mo</span></div>
              </div>
            </button>
            <button
              onClick={() => setSelectedPlan('enterprise')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all relative ${
                selectedPlan === 'enterprise'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="absolute -top-2 right-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold uppercase rounded">Best Value</div>
              <div className="text-left">
                <div className="font-bold text-slate-900">Enterprise</div>
                <div className="text-2xl font-black text-indigo-600">$99<span className="text-sm font-normal text-slate-500">/mo</span></div>
              </div>
            </button>
          </div>

          {/* Features */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">What&apos;s Included</div>
            <ul className="space-y-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Email Input */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Email (for receipt)
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Checkout Button */}
          <button
            onClick={handleStripeCheckout}
            disabled={isProcessing}
            className="w-full py-4 bg-indigo-600 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Redirecting to Stripe...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                </svg>
                Continue to Checkout - {plan.price}/mo
              </>
            )}
          </button>

          {/* Security Note */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secure checkout powered by Stripe. Cancel anytime.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
