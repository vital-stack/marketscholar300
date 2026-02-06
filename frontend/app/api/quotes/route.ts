import { NextResponse } from 'next/server';

// Base prices (approximate Feb 2026 levels)
const BASE_PRICES: Record<string, { price: number; name: string }> = {
  NVDA: { price: 142.50, name: 'NVIDIA' },
  TSLA: { price: 378.20, name: 'Tesla' },
  AAPL: { price: 245.80, name: 'Apple' },
  MSFT: { price: 468.35, name: 'Microsoft' },
  META: { price: 635.40, name: 'Meta' },
  GOOGL: { price: 198.75, name: 'Alphabet' },
  AMZN: { price: 228.60, name: 'Amazon' },
  AMD: { price: 178.90, name: 'AMD' },
  PLTR: { price: 98.45, name: 'Palantir' },
  CRM: { price: 342.10, name: 'Salesforce' },
  AVGO: { price: 198.50, name: 'Broadcom' },
  SMCI: { price: 42.30, name: 'Super Micro' },
};

// In-memory price state with session-persistent drift
let priceState: Record<string, { price: number; prevClose: number; lastUpdate: number }> | null = null;

function initPriceState() {
  if (priceState) return;
  priceState = {};
  for (const [ticker, data] of Object.entries(BASE_PRICES)) {
    // Add a small random offset so prices vary per server start
    const drift = (Math.random() - 0.5) * data.price * 0.02;
    const price = data.price + drift;
    priceState[ticker] = {
      price,
      prevClose: price - (Math.random() - 0.45) * price * 0.015,
      lastUpdate: Date.now(),
    };
  }
}

function tickPrices() {
  if (!priceState) initPriceState();
  const now = Date.now();

  for (const ticker of Object.keys(priceState!)) {
    const state = priceState![ticker];
    const elapsed = (now - state.lastUpdate) / 1000;

    // Simulate micro price movements every call (~1-5 seconds)
    if (elapsed >= 1) {
      const volatility = ticker === 'TSLA' || ticker === 'SMCI' ? 0.003 : 0.0015;
      const drift = (Math.random() - 0.48) * state.price * volatility;
      state.price = Math.max(state.price * 0.95, state.price + drift);
      state.lastUpdate = now;
    }
  }
}

export async function GET() {
  initPriceState();
  tickPrices();

  const quotes = Object.entries(BASE_PRICES).map(([ticker, data]) => {
    const state = priceState![ticker];
    const change = state.price - state.prevClose;
    const changePercent = (change / state.prevClose) * 100;

    return {
      ticker,
      name: data.name,
      price: parseFloat(state.price.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
    };
  });

  return NextResponse.json(quotes, {
    headers: {
      'Cache-Control': 'no-cache, no-store',
    },
  });
}
