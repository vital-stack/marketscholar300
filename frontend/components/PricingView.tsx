'use client';

import React from 'react';

interface PricingViewProps {
  isLoggedIn: boolean;
  onUpgradeTrigger: () => void;
  onLoginTrigger: () => void;
}

const PricingView: React.FC<PricingViewProps> = ({ isLoggedIn, onUpgradeTrigger, onLoginTrigger }) => {
  const plans = [
    {
      name: 'Free Trial',
      price: '$0',
      period: '10 days',
      features: [
        '5 forensic audits per day',
        'Basic sentiment analysis',
        'Trending intelligence feed',
        'Standard support',
      ],
      cta: 'Start Free Trial',
      highlighted: false,
    },
    {
      name: 'Analyst Pro',
      price: '$29',
      period: 'per month',
      features: [
        'Unlimited forensic audits',
        'Advanced VMS calculations',
        'Epistemic drift analysis',
        'Press audit trail',
        'Priority API access',
        'Export to PDF',
        'Premium support',
      ],
      cta: 'Upgrade Now',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact us',
      features: [
        'Everything in Pro',
        'Team collaboration',
        'Custom integrations',
        'API access',
        'Dedicated support',
        'SLA guarantees',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
            Institutional-Grade Intelligence
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            Choose the plan that fits your research needs. Upgrade anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl p-8 ${
                plan.highlighted
                  ? 'border-2 border-indigo-600 shadow-xl'
                  : 'border border-slate-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-full">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-slate-500 text-sm">/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-600">
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    onLoginTrigger();
                  } else if (plan.highlighted) {
                    onUpgradeTrigger();
                  }
                }}
                className={`w-full py-3 font-bold uppercase tracking-widest rounded-lg transition-all ${
                  plan.highlighted
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                q: 'What is a forensic audit?',
                a: 'Our forensic audit analyzes research papers, news articles, and market narratives to detect bias, manipulation, and structural risks.',
              },
              {
                q: 'How accurate is the VMS score?',
                a: 'The Verified Match Score (VMS) compares narrative claims against structural data with 85%+ historical accuracy.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes, you can cancel your subscription at any time. Your access continues until the end of the billing period.',
              },
              {
                q: 'Do you offer refunds?',
                a: 'We offer a 14-day money-back guarantee if you are not satisfied with the Pro plan.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6">
                <h4 className="font-bold text-slate-900 mb-2">{faq.q}</h4>
                <p className="text-sm text-slate-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default PricingView;
