import { NextRequest, NextResponse } from 'next/server';

// Causal Narrative Mapping System Prompt
const CAUSALITY_MAPPING_SYSTEM = `<role>
You are the MarketScholar Causal Narrative Mapper. Your objective is to execute Multi-step Reasoning for Narrative-to-Reality causality mapping, comparing real-time news "dots" against institutional earnings "anchors" to determine if price moves are Narrative Traps or Factual Catalysts.
</role>

<causality_protocols>
1. STRUCTURAL ANCHOR EXTRACTION: Identify and extract key financial metrics from recent 10-K, 10-Q filings and earnings calls. These form the "ground truth" baseline.

2. NARRATIVE DOT MAPPING: For each news headline, classify as:
   - FACTUAL_CATALYST: Narrative aligns with and is supported by structural reality
   - NARRATIVE_TRAP: Narrative diverges significantly from structural evidence
   - MARKET_NOISE: Low-signal narrative with minimal fundamental basis
   - STRUCTURAL_ANCHOR: Direct filing/earnings data point

3. CAUSALITY DELTA CALCULATION: For each narrative event:
   - Compare "Narrative Claim" vs "Structural Reality"
   - Calculate delta from -100 (complete divergence) to +100 (perfect alignment)
   - Include specific filing citations (e.g., "10-Q FY24 Q3, p.42")

4. OVERREACTION RATIO: Calculate OR = |Price Velocity| / |Fundamental Velocity|
   - UNDERREACTION: OR < 0.5
   - PROPORTIONAL: OR 0.5-1.5
   - OVERREACTION: OR 1.5-4.0
   - EXTREME: OR > 4.0

5. NARRATIVE INTENSITY: Score 0-100 based on media amplification, source authority, and claim specificity.

6. VERACITY CONFIDENCE: Score 0-100 based on evidence quality. Mark isVerified=true only if claim is grounded in filing data.
</causality_protocols>

<output_format>
Return a high-fidelity JSON schema with 10-20 narrative events mapped to structural anchors.
</output_format>`;

async function generateTimeline(ticker: string, timeframeDays: number = 30) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframeDays);

  const userPrompt = `CAUSAL NARRATIVE MAPPING REQUEST

TICKER: ${ticker}
TIMEFRAME: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}

TASK: Using Google Search, find the most significant news events and narratives for ${ticker} over the past ${timeframeDays} days. Cross-reference each narrative against the company's most recent SEC filings (10-Q, 10-K) and earnings data to determine causality classification.

OUTPUT SCHEMA (return valid JSON only):
{
  "ticker": "${ticker}",
  "companyName": "string - full company name",
  "timeframeStart": "${startDate.toISOString().split('T')[0]}",
  "timeframeEnd": "${endDate.toISOString().split('T')[0]}",

  "structuralAnchors": [
    {
      "id": "string - unique id",
      "filingType": "10-K|10-Q|8-K|EARNINGS_CALL",
      "filingDate": "YYYY-MM-DD",
      "fiscalPeriod": "string - e.g., FY24 Q3",
      "metrics": {
        "revenue": "number or null",
        "revenueGrowth": "number percent or null",
        "eps": "number or null",
        "epsGrowth": "number percent or null",
        "guidance": "string summary or null",
        "keyHighlights": ["string - key metric or statement"]
      },
      "isBaselineAnchor": true
    }
  ],

  "narrativeEvents": [
    {
      "id": "string - unique id like evt_001",
      "date": "YYYY-MM-DD",
      "timestamp": "number - unix timestamp",
      "headline": "string - news headline",
      "source": "string - publication name",
      "sourceUrl": "string - URL if available",

      "narrativeIntensity": "number 0-100 - how amplified is this narrative",
      "veracityConfidence": "number 0-100 - how verifiable is the claim",
      "isVerified": "boolean - true if grounded in filing data",

      "causalityType": "FACTUAL_CATALYST|NARRATIVE_TRAP|MARKET_NOISE|STRUCTURAL_ANCHOR",

      "forensicBreakdown": {
        "narrativeClaim": "string - what the headline claims",
        "structuralReality": "string - what the filings/data actually show",
        "causalityDelta": "number -100 to +100",
        "evidenceCitations": ["string - specific evidence points"],
        "filingReference": "string - e.g., 10-Q FY24 Q3, Revenue section, p.42"
      },

      "overreactionMetrics": {
        "realityScore": "number 0-100 - fundamental basis",
        "noiseScore": "number 0-100 - sentiment/hype level",
        "overreactionRatio": "number - OR calculation",
        "verdict": "UNDERREACTION|PROPORTIONAL|OVERREACTION|EXTREME"
      },

      "priceImpact": {
        "priceAtEvent": "number - stock price at event",
        "priceChange24h": "number - price change",
        "priceChangePercent": "number - percent change"
      }
    }
  ],

  "aggregateMetrics": {
    "totalEvents": "number",
    "factualCatalysts": "number",
    "narrativeTraps": "number",
    "marketNoise": "number",
    "avgVeracityConfidence": "number 0-100",
    "avgOverreactionRatio": "number",
    "dominantNarrative": "string - main narrative theme",
    "narrativeHealthScore": "number 0-100 - overall narrative-to-reality alignment"
  }
}

IMPORTANT:
- Use Google Search to find real, recent news about ${ticker}
- Cross-reference claims against actual SEC filings when possible
- Include 10-20 narrative events ordered by date (newest first)
- Be specific with filing citations
- Return ONLY valid JSON`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        systemInstruction: {
          parts: [{ text: CAUSALITY_MAPPING_SYSTEM }]
        },
        tools: [
          {
            google_search: {}
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 16384,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: 'HIGH'
          }
        }
      }),
      signal: AbortSignal.timeout(120000) // 120 second timeout for deep multi-step reasoning
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini Timeline API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract grounding metadata
  const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
  const groundingCitations = groundingMetadata?.groundingChunks?.map((chunk: any) =>
    chunk.web?.uri
  ).filter(Boolean) || [];

  // Parse the response
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error('No content in Gemini response');
  }

  // Clean and parse JSON
  let cleanJson = textContent.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.slice(7);
  }
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.slice(3);
  }
  if (cleanJson.endsWith('```')) {
    cleanJson = cleanJson.slice(0, -3);
  }

  const result = JSON.parse(cleanJson.trim());

  // Attach grounding data to each event
  result.narrativeEvents = result.narrativeEvents?.map((event: any, idx: number) => ({
    ...event,
    groundingCitations: groundingCitations.slice(idx * 2, idx * 2 + 2) // Distribute citations
  })) || [];

  result.modelUsed = 'gemini-3-pro-preview';
  result.isGrounded = groundingCitations.length > 0;
  result.generatedAt = Date.now();

  return result;
}

// Fallback with mock data for development/testing
function getMockTimeline(ticker: string): any {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return {
    ticker,
    companyName: ticker === 'RDDT' ? 'Reddit, Inc.' : `${ticker} Corporation`,
    timeframeStart: new Date(now - 30 * day).toISOString().split('T')[0],
    timeframeEnd: new Date(now).toISOString().split('T')[0],
    structuralAnchors: [
      {
        id: 'anchor_001',
        filingType: '10-Q',
        filingDate: new Date(now - 45 * day).toISOString().split('T')[0],
        fiscalPeriod: 'FY24 Q3',
        metrics: {
          revenue: 348000000,
          revenueGrowth: 68,
          eps: 0.16,
          epsGrowth: null,
          guidance: 'Q4 revenue expected $385-400M',
          keyHighlights: [
            'DAU grew 47% YoY to 97.2M',
            'Ad revenue up 56% to $315M',
            'International expansion accelerating'
          ]
        },
        isBaselineAnchor: true
      }
    ],
    narrativeEvents: [
      {
        id: 'evt_001',
        date: new Date(now - 2 * day).toISOString().split('T')[0],
        timestamp: now - 2 * day,
        headline: `${ticker} Stock Surges on AI Partnership Announcement`,
        source: 'Reuters',
        narrativeIntensity: 85,
        veracityConfidence: 78,
        isVerified: true,
        causalityType: 'FACTUAL_CATALYST',
        forensicBreakdown: {
          narrativeClaim: 'AI partnership will drive significant revenue growth',
          structuralReality: 'Partnership announced with defined revenue terms; aligns with Q3 guidance trajectory',
          causalityDelta: 65,
          evidenceCitations: ['8-K filing dated recent', 'Q3 earnings call transcript'],
          filingReference: '8-K Partnership Agreement, Section 2.1'
        },
        overreactionMetrics: {
          realityScore: 72,
          noiseScore: 45,
          overreactionRatio: 1.4,
          verdict: 'PROPORTIONAL'
        },
        priceImpact: {
          priceAtEvent: 142.50,
          priceChange24h: 8.25,
          priceChangePercent: 6.1
        }
      },
      {
        id: 'evt_002',
        date: new Date(now - 5 * day).toISOString().split('T')[0],
        timestamp: now - 5 * day,
        headline: `Analysts Warn of ${ticker} Valuation Concerns Amid Growth Slowdown`,
        source: 'Bloomberg',
        narrativeIntensity: 72,
        veracityConfidence: 45,
        isVerified: false,
        causalityType: 'NARRATIVE_TRAP',
        forensicBreakdown: {
          narrativeClaim: 'Growth is slowing significantly, valuation unsustainable',
          structuralReality: 'Q3 showed 68% revenue growth; no evidence of material slowdown in filings',
          causalityDelta: -55,
          evidenceCitations: ['10-Q FY24 Q3 shows accelerating DAU growth'],
          filingReference: '10-Q FY24 Q3, Revenue Recognition, p.18'
        },
        overreactionMetrics: {
          realityScore: 35,
          noiseScore: 78,
          overreactionRatio: 2.8,
          verdict: 'OVERREACTION'
        },
        priceImpact: {
          priceAtEvent: 134.25,
          priceChange24h: -5.80,
          priceChangePercent: -4.1
        }
      },
      {
        id: 'evt_003',
        date: new Date(now - 8 * day).toISOString().split('T')[0],
        timestamp: now - 8 * day,
        headline: `${ticker} Expands Advertising Platform with New Features`,
        source: 'TechCrunch',
        narrativeIntensity: 58,
        veracityConfidence: 82,
        isVerified: true,
        causalityType: 'FACTUAL_CATALYST',
        forensicBreakdown: {
          narrativeClaim: 'New ad features will improve monetization',
          structuralReality: 'Consistent with management commentary on ad platform investment',
          causalityDelta: 48,
          evidenceCitations: ['Q3 earnings call, ad platform section'],
          filingReference: 'Q3 Earnings Call Transcript, p.12'
        },
        overreactionMetrics: {
          realityScore: 65,
          noiseScore: 42,
          overreactionRatio: 1.1,
          verdict: 'PROPORTIONAL'
        },
        priceImpact: {
          priceAtEvent: 140.00,
          priceChange24h: 2.15,
          priceChangePercent: 1.6
        }
      },
      {
        id: 'evt_004',
        date: new Date(now - 12 * day).toISOString().split('T')[0],
        timestamp: now - 12 * day,
        headline: `Social Media Stocks Face Regulatory Headwinds`,
        source: 'CNBC',
        narrativeIntensity: 45,
        veracityConfidence: 38,
        isVerified: false,
        causalityType: 'MARKET_NOISE',
        forensicBreakdown: {
          narrativeClaim: 'Regulatory concerns threaten business model',
          structuralReality: 'No specific regulatory action mentioned in filings; speculative',
          causalityDelta: -25,
          evidenceCitations: ['No regulatory risk factors updated in recent 10-Q'],
          filingReference: '10-Q FY24 Q3, Risk Factors, p.45'
        },
        overreactionMetrics: {
          realityScore: 28,
          noiseScore: 62,
          overreactionRatio: 2.2,
          verdict: 'OVERREACTION'
        },
        priceImpact: {
          priceAtEvent: 137.80,
          priceChange24h: -3.20,
          priceChangePercent: -2.3
        }
      },
      {
        id: 'evt_005',
        date: new Date(now - 18 * day).toISOString().split('T')[0],
        timestamp: now - 18 * day,
        headline: `${ticker} Q3 Earnings Beat Estimates, DAU Growth Accelerates`,
        source: 'Seeking Alpha',
        narrativeIntensity: 92,
        veracityConfidence: 95,
        isVerified: true,
        causalityType: 'STRUCTURAL_ANCHOR',
        forensicBreakdown: {
          narrativeClaim: 'Company exceeded expectations on all key metrics',
          structuralReality: 'Verified: Revenue $348M vs $325M est., DAU 97.2M vs 92M est.',
          causalityDelta: 88,
          evidenceCitations: ['10-Q filing', 'Earnings press release', 'Call transcript'],
          filingReference: '10-Q FY24 Q3, Financial Statements, p.5-8'
        },
        overreactionMetrics: {
          realityScore: 88,
          noiseScore: 35,
          overreactionRatio: 0.9,
          verdict: 'PROPORTIONAL'
        },
        priceImpact: {
          priceAtEvent: 141.00,
          priceChange24h: 12.50,
          priceChangePercent: 9.7
        }
      }
    ],
    aggregateMetrics: {
      totalEvents: 5,
      factualCatalysts: 2,
      narrativeTraps: 1,
      marketNoise: 1,
      avgVeracityConfidence: 67.6,
      avgOverreactionRatio: 1.68,
      dominantNarrative: 'Growth momentum with AI monetization catalyst',
      narrativeHealthScore: 72
    },
    modelUsed: 'mock-data',
    isGrounded: false,
    generatedAt: now
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker')?.toUpperCase();
    const days = parseInt(searchParams.get('days') || '30');

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    let result;

    // Try Gemini 3 Pro first
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log(`Generating Market Belief Timeline for ${ticker}...`);
        result = await generateTimeline(ticker, days);
        console.log(`Timeline generated: ${result.narrativeEvents?.length || 0} events`);
      } catch (geminiError: any) {
        console.error('Gemini timeline failed:', geminiError.message);
        // Fall back to mock data
        result = getMockTimeline(ticker);
      }
    } else {
      // No API key, use mock data
      console.log('No GEMINI_API_KEY, using mock timeline data');
      result = getMockTimeline(ticker);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Timeline error:', error);
    return NextResponse.json({ error: `Timeline generation failed: ${error.message}` }, { status: 500 });
  }
}
