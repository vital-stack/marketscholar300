import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { fetchLunarCrushPhysicsData } from '@/lib/lunarcrush';

// Create Supabase client lazily
function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Use OpenAI for trending analysis
async function getTrendingFromOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = `Generate 4 current market-moving stock narratives for today. Focus on major tech, AI, and market movers.

Return a JSON array with exactly 4 entries:
[
  {
    "articleTitle": "headline about the stock",
    "publicationName": "source name",
    "publicationCredibility": 85,
    "publicationAuthorityRank": "A",
    "ticker": "STOCK_SYMBOL",
    "companyName": "Company Name",
    "sector": "Technology|Healthcare|Finance|Energy|Consumer",
    "currentPrice": null,
    "storyCount": 5,
    "auditVerdict": "STRUCTURALLY_SUPPORTED"|"MIXED_INCOMPLETE"|"NARRATIVE_TRAP",
    "confidenceScore": 75,
    "riskRating": "LOW"|"MODERATE"|"HIGH",
    "manipulationRisk": "LOW",
    "summary": "2-3 sentence summary of the narrative",
    "primaryNarrative": "main market thesis",
    "narrativeType": "EARNINGS|AI_GROWTH|MACRO|SECTOR_ROTATION"
  }
]

Include real major stocks like NVDA, AAPL, MSFT, TSLA, META, GOOGL, AMZN.
Return ONLY the JSON array.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a market analyst. Return only valid JSON array.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse the response - it might be wrapped in an object
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : parsed.narratives || parsed.stocks || [parsed];
}

async function getTrendingFromGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = `Generate 4 current market-moving stock narratives for today focused on major equities.

Return valid JSON ONLY with this structure:
{
  "narratives": [
    {
      "articleTitle": "headline",
      "publicationName": "source",
      "publicationCredibility": 85,
      "publicationAuthorityRank": "A",
      "ticker": "NVDA",
      "companyName": "NVIDIA Corporation",
      "sector": "Technology",
      "storyCount": 5,
      "auditVerdict": "STRUCTURALLY_SUPPORTED|MIXED_INCOMPLETE|NARRATIVE_TRAP",
      "confidenceScore": 75,
      "riskRating": "LOW|MODERATE|HIGH",
      "manipulationRisk": "LOW|MODERATE|HIGH",
      "summary": "2 sentence summary",
      "primaryNarrative": "main thesis",
      "narrativeType": "EARNINGS|AI_GROWTH|MACRO|SECTOR_ROTATION|MARKET_SENTIMENT"
    }
  ]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.5,
          responseMimeType: 'application/json',
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    return null;
  }

  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : parsed.narratives || [];
}

async function enrichWithLunarCrush(data: any[]): Promise<any[]> {
  const apiKey = process.env.LUNARCRUSH_API_KEY || process.env.NEXT_PUBLIC_LUNARCRUSH_API_KEY;
  if (!apiKey || data.length === 0) {
    return data;
  }

  const enriched = await Promise.all(
    data.map(async (item) => {
      const social = await fetchLunarCrushPhysicsData(item.ticker, apiKey);
      if (!social) return item;

      return {
        ...item,
        socialMomentum: {
          score: Math.round(social.socialNpi),
          trend: social.socialNpiTrend.toUpperCase(),
          crowdBias: Math.round(social.sentiment),
          expertBias: Math.round((social.galaxyScore - 50) * 1.5),
        },
        narrativeInsights: {
          ...(item.narrativeInsights || {}),
          volumeBehavior: `LunarCrush social volume 24h: ${social.socialVolume24h.toLocaleString()} with ${social.contributors.toLocaleString()} contributors.`,
          narrativeConsistency: `Social trend is ${social.socialNpiTrend}; sentiment ${social.sentiment >= 0 ? '+' : ''}${social.sentiment}.`,
        },
      };
    })
  );

  return enriched;
}

// Cache for trending data
let trendingCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    if (trendingCache && Date.now() - trendingCache.timestamp < CACHE_TTL) {
      return NextResponse.json(trendingCache.data);
    }

    // Try Supabase first
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: trendingData } = await supabase
          .from('trending_tickers')
          .select('*')
          .order('discovered_at', { ascending: false })
          .limit(10);

        if (trendingData && trendingData.length > 0) {
          const results = transformSupabaseData(trendingData);
          if (results.length > 0) {
            trendingCache = { data: results, timestamp: Date.now() };
            return NextResponse.json(results);
          }
        }
      } catch (e) {
        console.log('Supabase fetch failed, trying OpenAI');
      }
    }

    // Use OpenAI first, then Gemini fallback
    let generatedData: any[] | null = null;
    try {
      generatedData = await getTrendingFromOpenAI();
    } catch (e) {
      console.log('OpenAI trending generation failed, attempting Gemini');
    }

    if (!generatedData || generatedData.length === 0) {
      try {
        generatedData = await getTrendingFromGemini();
      } catch (e) {
        console.log('Gemini trending generation failed');
      }
    }

    if (generatedData && generatedData.length > 0) {
      const merged = generatedData.slice(0, 4).map((item: any) => ({
        ...getDefaultStructure(),
        ...item,
        timestamp: Date.now()
      }));

      const results = await enrichWithLunarCrush(merged);
      trendingCache = { data: results, timestamp: Date.now() };
      return NextResponse.json(results);
    }

    // Return fallback
    return NextResponse.json(getFallbackData());

  } catch (error: any) {
    console.error('Trending API error:', error);
    return NextResponse.json(getFallbackData());
  }
}

function getDefaultStructure() {
  return {
    forensicCalculation: {
      vms: { score: 70, verdict: 'PENDING', narrative: '', anchor: '' },
      unlearning: { verdict: 'STABLE', status: 'Active' },
      overreaction: { ratio: 1, priceVelocity: 0, fundamentalVelocity: 0, verdict: 'NORMAL' },
      narrativeEnergy: { verdict: 'ACTIVE', description: 'Narrative in progress' },
      halfLife: { days: 7, description: 'Standard decay' },
      premium: { percentage: 0, fairValue: 0, impliedPrice: 0, verdict: 'FAIR' },
      coordination: { score: 30, verdict: 'LOW' },
      hypeDiscipline: { score: 5, level: 'MODERATE', description: 'Normal levels' }
    },
    epistemicDrift: { magnitude: 25, verdict: 'ALIGNED', narrativeProjection: '', structuralReality: '' },
    timingVector: { daysRemaining: 30, totalHorizon: 90, description: '', eventDate: '' },
    analystAudit: { name: '', firm: '', pastAccuracy: 0, expertise: [], grade: '', credibilityScore: 50, focus: '', coverageHistory: [] },
    primaryThesis: { statement: '', explanation: '' },
    sourceQualityMatrix: { trackRecord: 80, institutionalWeight: 70, conflictRisk: 20 },
    structuralRiskAudit: { classification: 'MODERATE', description: '' },
    causalityAudit: { contractIntegrity: '', marketContext: '', behavioralData: '' },
    priceTargets: { median: 0, current: 0 },
    socialMomentum: { score: 50, trend: 'STABLE', crowdBias: 0, expertBias: 0 },
    sentimentDynamics: [],
    pressAudits: [],
    forensicLedger: [],
    keywordAnalysis: [],
    institutionalClaim: { analyst_name: '', institution_bank: '', source_type: '', medium: '', timestamp: '', stock_ticker: '', claim_text: '', numeric_anchor: '', claim_direction: 'NEUTRAL', assumptions: [], evidence: [], precedent: '', incentive_context: '', amplification_score: 0, outcome_tracking: '', credibility_score: 70 },
    narrativeInsights: { preEarnings: '', volumeBehavior: '', narrativeConsistency: '', newsAccuracyAnalysis: '' }
  };
}

function getFallbackData(): any[] {
  return [
    {
      ...getDefaultStructure(),
      articleTitle: 'NVIDIA Surges on AI Chip Demand: Why Analysts Remain Bullish',
      publicationName: 'MarketWatch',
      publicationCredibility: 88,
      publicationAuthorityRank: 'A',
      ticker: 'NVDA',
      companyName: 'NVIDIA Corporation',
      sector: 'Technology',
      currentPrice: null,
      storyCount: 12,
      auditVerdict: 'STRUCTURALLY_SUPPORTED',
      confidenceScore: 92,
      riskRating: 'LOW',
      manipulationRisk: 'LOW',
      summary: 'NVIDIA continues to dominate the AI chip market with strong data center revenue growth. The structural thesis remains intact as hyperscaler spending accelerates.',
      primaryNarrative: 'AI infrastructure demand driving growth',
      narrativeType: 'AI_GROWTH',
      socialMomentum: { score: 85, trend: 'RISING', crowdBias: 45, expertBias: 60 },
      analystAudit: { name: 'C.J. Muse', firm: 'Cantor Fitzgerald', pastAccuracy: 78, expertise: ['Semiconductors', 'AI'], grade: 'A', credibilityScore: 82, focus: 'Technology', coverageHistory: ['NVDA', 'AMD', 'INTC'] },
      timestamp: Date.now()
    },
    {
      ...getDefaultStructure(),
      articleTitle: 'Tesla Faces Headwinds: Price Cuts Signal Demand Concerns',
      publicationName: 'Bloomberg',
      publicationCredibility: 90,
      publicationAuthorityRank: 'A',
      ticker: 'TSLA',
      companyName: 'Tesla Inc',
      sector: 'Automotive',
      currentPrice: null,
      storyCount: 8,
      auditVerdict: 'NARRATIVE_TRAP',
      confidenceScore: 78,
      riskRating: 'HIGH',
      manipulationRisk: 'MEDIUM',
      summary: 'Tesla\'s aggressive price cuts may indicate softening demand rather than strategic market share gains. Margin compression risks remain elevated.',
      primaryNarrative: 'EV demand uncertainty',
      narrativeType: 'MARKET_SENTIMENT',
      socialMomentum: { score: 65, trend: 'DECAYING', crowdBias: -25, expertBias: -15 },
      analystAudit: { name: 'Adam Jonas', firm: 'Morgan Stanley', pastAccuracy: 68, expertise: ['EV', 'Automotive'], grade: 'B', credibilityScore: 71, focus: 'Automotive', coverageHistory: ['TSLA', 'GM', 'F'] },
      timestamp: Date.now()
    },
    {
      ...getDefaultStructure(),
      articleTitle: 'Apple Services Revenue Hits Record: iPhone Concerns Overblown?',
      publicationName: 'Reuters',
      publicationCredibility: 92,
      publicationAuthorityRank: 'A',
      ticker: 'AAPL',
      companyName: 'Apple Inc',
      sector: 'Technology',
      currentPrice: null,
      storyCount: 6,
      auditVerdict: 'MIXED_INCOMPLETE',
      confidenceScore: 85,
      riskRating: 'MODERATE',
      manipulationRisk: 'LOW',
      summary: 'Apple\'s services segment continues to outperform, offsetting iPhone cycle concerns. The narrative shift toward services-driven growth requires further validation.',
      primaryNarrative: 'Services growth offsetting hardware',
      narrativeType: 'EARNINGS',
      socialMomentum: { score: 70, trend: 'STABLE', crowdBias: 15, expertBias: 20 },
      analystAudit: { name: 'Samik Chatterjee', firm: 'JPMorgan', pastAccuracy: 72, expertise: ['Consumer Tech'], grade: 'A', credibilityScore: 76, focus: 'Hardware', coverageHistory: ['AAPL', 'DELL', 'HPQ'] },
      timestamp: Date.now()
    }
  ];
}

function transformSupabaseData(trending: any[]): any[] {
  return trending.slice(0, 4).map(ticker => ({
    ...getDefaultStructure(),
    articleTitle: ticker.catalyst || `${ticker.ticker} Market Analysis`,
    publicationName: 'MarketScholar Intelligence',
    publicationCredibility: 85,
    publicationAuthorityRank: 'A',
    ticker: ticker.ticker,
    companyName: ticker.company_name || ticker.ticker,
    sector: 'Technology',
    currentPrice: null,
    storyCount: ticker.headline_count || 1,
    auditVerdict: ticker.verdict === 'VALID_CATALYST' ? 'STRUCTURALLY_SUPPORTED' :
                  ticker.verdict === 'NARRATIVE_TRAP' ? 'NARRATIVE_TRAP' : 'MIXED_INCOMPLETE',
    confidenceScore: Math.min(95, Math.max(50, 100 - (ticker.epistemic_drift || 30))),
    riskRating: ticker.epistemic_drift > 50 ? 'HIGH' : ticker.epistemic_drift > 25 ? 'MODERATE' : 'LOW',
    manipulationRisk: ticker.verdict === 'NARRATIVE_TRAP' ? 'HIGH' : 'LOW',
    summary: ticker.reasoning || `${ticker.ticker} showing market activity.`,
    primaryNarrative: ticker.catalyst || 'Market movement',
    narrativeType: ticker.verdict || 'UNKNOWN',
    timestamp: new Date(ticker.discovered_at).getTime()
  }));
}
