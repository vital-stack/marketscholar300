import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Lazy initialization of Stripe client
let stripeClient: Stripe | null = null;

function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// Pricing tiers
const PRICING_TIERS = {
  analyst: {
    name: 'Analyst Pro',
    price: 2900, // $29.00 in cents
    features: [
      'Unlimited forensic audits',
      'Narrative Radar access',
      'Full report exports',
      'Priority analysis queue',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 9900, // $99.00 in cents
    features: [
      'Everything in Analyst Pro',
      'Team collaboration',
      'API access',
      'Custom integrations',
      'Dedicated support',
    ],
  },
};

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { tier = 'analyst', email, successUrl, cancelUrl } = body;

    const selectedTier = PRICING_TIERS[tier as keyof typeof PRICING_TIERS];
    if (!selectedTier) {
      return NextResponse.json(
        { error: 'Invalid pricing tier' },
        { status: 400 }
      );
    }

    // Get the origin for redirect URLs
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedTier.name,
              description: `MarketScholar ${selectedTier.name} subscription`,
            },
            unit_amount: selectedTier.price,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: email || undefined,
      success_url: successUrl || `${origin}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${origin}/?canceled=true`,
      metadata: {
        tier,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Verify a checkout session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      status: session.status,
      customerEmail: session.customer_email,
      tier: session.metadata?.tier,
    });
  } catch (error: any) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify session' },
      { status: 500 }
    );
  }
}
