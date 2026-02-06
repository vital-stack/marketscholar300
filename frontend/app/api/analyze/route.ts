import { NextRequest, NextResponse } from 'next/server';

// URL detection regex
const URL_REGEX = /^https?:\/\/[^\s]+$/i;

// Fetch article content from a URL
async function fetchUrlContent(url: string): Promise<string> {
  try {
    // Use a realistic browser User-Agent — many news sites block bot-like agents
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000), // 20 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    if (!html || html.length < 200) {
      throw new Error('Page returned empty or minimal content (may require JavaScript)');
    }

    // Extract text content from HTML
    // Remove script/style/noscript/nav/header/footer tags and their content
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');

    // Extract title
    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract meta description (og:description preferred for news sites)
    const ogDescMatch = text.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                        text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    const metaDescMatch = text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                          text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const metaDesc = (ogDescMatch || metaDescMatch)?.[1]?.trim() || '';

    // Extract article body - try multiple strategies (greedy for article tags)
    const articleMatch = text.match(/<article[^>]*>([\s\S]*)<\/article>/i) ||
                         text.match(/<div[^>]+class=["'][^"']*(?:caas-body|article-body|story-body|post-content|entry-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
                         text.match(/<div[^>]+(?:role=["']main["']|id=["'](?:main|content|article)[^"']*["'])[^>]*>([\s\S]*?)<\/div>/i);

    // Get the matched content or fall back to the full body
    let rawContent = articleMatch ? (articleMatch[1] || articleMatch[2] || '') : text;

    // For Yahoo Finance specifically, look for their content structure
    if (url.includes('yahoo.com') || url.includes('finance.yahoo')) {
      const yahooMatch = text.match(/<div[^>]+class=["'][^"']*caas-body[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
                         text.match(/<div[^>]+class=["'][^"']*body["'][^>]*>([\s\S]*?)<\/div>/i);
      if (yahooMatch) {
        rawContent = yahooMatch[1];
      }
    }

    // Remove all HTML tags and decode entities
    let plainText = rawContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
      .replace(/\s+/g, ' ')
      .trim();

    // If we got very little text, the site probably blocked us or requires JS
    if (plainText.length < 100) {
      // Try to extract from JSON-LD (many news sites embed structured data)
      const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdMatch) {
        for (const match of jsonLdMatch) {
          try {
            const jsonStr = match.replace(/<\/?script[^>]*>/gi, '');
            const jsonData = JSON.parse(jsonStr);
            const articleBody = jsonData.articleBody || jsonData.description || '';
            if (articleBody.length > plainText.length) {
              plainText = articleBody;
            }
            // Also grab the headline
            if (jsonData.headline && !title) {
              // use jsonData.headline below
            }
          } catch { /* ignore parse errors */ }
        }
      }
    }

    if (plainText.length < 50) {
      throw new Error('Could not extract article content. The site may require JavaScript or is blocking automated access.');
    }

    // Combine title, description, and content
    const fullContent = [
      title && `TITLE: ${title}`,
      metaDesc && `DESCRIPTION: ${metaDesc}`,
      `SOURCE URL: ${url}`,
      '',
      'ARTICLE CONTENT:',
      plainText.substring(0, 15000) // Limit content length
    ].filter(Boolean).join('\n');

    console.log(`Fetched URL content: ${title || url} (${plainText.length} chars)`);
    return fullContent;

  } catch (error: any) {
    console.error(`URL fetch error for ${url}:`, error.message);
    throw new Error(`Could not fetch article from URL: ${error.message}`);
  }
}

// ─── PATENT FORMULA POST-PROCESSING ────────────────────────────────────────
// Enforces mathematical formulas server-side so the AI can't inflate scores.
// Patent 63/971,470: VMS = 0.65 * T(tableCoordMatch) + 0.35 * S(textMatch)
// Patent 63/971,478: OR = |Price Velocity| / |Fundamental Velocity|
function enforcePatentFormulas(result: any) {
  const fc = result?.forensicCalculation;
  if (!fc) return;

  // ── VMS: Verified Match Score ──
  // VMS = 0.65 * tableCoordMatch + 0.35 * textMatch
  if (fc.vms) {
    const tableCoord = clamp(Number(fc.vms.tableCoordMatch) || 0, 0, 100);
    const textMatch = clamp(Number(fc.vms.textMatch) || 0, 0, 100);

    // Store the components
    fc.vms.tableCoordMatch = tableCoord;
    fc.vms.textMatch = textMatch;

    // Compute VMS using patent formula
    fc.vms.score = Math.round(0.65 * tableCoord + 0.35 * textMatch);

    console.log(`VMS computed: 0.65*${tableCoord} + 0.35*${textMatch} = ${fc.vms.score}`);
  }

  // ── OR: Overreaction Ratio ──
  // OR = |priceVelocity| / |fundamentalVelocity|
  if (fc.overreaction) {
    const pv = Math.abs(Number(fc.overreaction.priceVelocity) || 0);
    const fv = Math.abs(Number(fc.overreaction.fundamentalVelocity) || 1); // avoid div by zero

    if (pv > 0 && fv > 0) {
      fc.overreaction.ratio = Math.round((pv / fv) * 10) / 10; // 1 decimal
    } else if (pv > 0 && fv === 0) {
      fc.overreaction.ratio = 10.0; // extreme: price moved with zero fundamental change
    }

    // Classify
    const or = fc.overreaction.ratio;
    if (or >= 4.0) fc.overreaction.verdict = 'EXTREME';
    else if (or >= 2.0) fc.overreaction.verdict = 'ELEVATED';
    else fc.overreaction.verdict = 'NORMAL';

    console.log(`OR computed: |${pv}| / |${fv}| = ${fc.overreaction.ratio} (${fc.overreaction.verdict})`);
  }

  // ── Half-Life sanity check ──
  if (fc.halfLife) {
    const days = Number(fc.halfLife.days) || 14;
    fc.halfLife.days = clamp(days, 1, 180);
  }

  // ── Coordination score sanity check ──
  if (fc.coordination) {
    fc.coordination.score = clamp(Number(fc.coordination.score) || 0, 0, 100);
    const cs = fc.coordination.score;
    if (cs >= 60) fc.coordination.verdict = 'HIGH';
    else if (cs >= 30) fc.coordination.verdict = 'MODERATE';
    else fc.coordination.verdict = 'LOW';
  }

  // ── Epistemic Drift sanity check ──
  if (result.epistemicDrift) {
    result.epistemicDrift.magnitude = clamp(Number(result.epistemicDrift.magnitude) || 0, 0, 100);
  }

  // ── Confidence score sanity check ──
  if (result.confidenceScore != null) {
    result.confidenceScore = clamp(Number(result.confidenceScore) || 50, 0, 100);
  }

  // ── NPP: Narrative Premium Percent ──
  if (fc.premium) {
    const fv = Number(fc.premium.fairValue) || 0;
    const ip = Number(fc.premium.impliedPrice) || 0;
    if (fv > 0 && ip > 0) {
      fc.premium.percentage = Math.round(((ip - fv) / fv) * 100);
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// MarketScholar Forensic Controller System Prompt (Patents 63/971,470 & 63/971,478)
const FORENSIC_CONTROLLER_SYSTEM = `<role>
You are the MarketScholar AI Forensic Controller — an ADVERSARIAL PROSECUTOR. Your job is NOT to summarize or agree with articles. Your job is to find the GAP between what a narrative CLAIMS and what HARD FINANCIAL DATA actually shows. You must be SKEPTICAL by default. Most financial narratives contain significant Epistemic Drift.

You implement:
- Patent 63/971,470: Multi-Dimensional Financial Analyst Credibility Assessment
- Patent 63/971,478: Narrative Lifecycle Tracking with Decay Monitoring
</role>

<scoring_philosophy>
CRITICAL: You must score like a forensic auditor, not a summarizer.

A narrative that says "Company X is doomed" when their actual financials show record revenue is a NARRATIVE TRAP with LOW tableCoordMatch. The table data (SEC filings, earnings) ALWAYS overrides the story.

Conversely, a narrative that says "Company X beat earnings" when their 10-Q confirms it is STRUCTURALLY SUPPORTED with HIGH tableCoordMatch.

DEFAULT ASSUMPTION: If the article does NOT cite specific financial data (revenue numbers, EPS, margins, filing references), then tableCoordMatch should be LOW (0-30). Vague claims without numbers = low data match.
</scoring_philosophy>

<forensic_protocols>
1. CLAIM DECOMPOSITION (FCDecomp): Parse every claim into: {Entity, Metric, Direction/Value, Temporal Unit}.

2. TABLE-COORDINATE MAPPING (T ∩ Δt):
   - Use Google Search to find the company's ACTUAL recent financial data (revenue, EPS, margins, guidance).
   - For each narrative claim, check: Does the claim match what the company's actual SEC filings or earnings reports say?
   - Score tableCoordMatch 0-100:
     * 80-100: Claim directly matches specific numbers from 10-Q/10-K/earnings
     * 50-79: Claim is directionally correct but imprecise or missing specifics
     * 20-49: Claim is vague, lacks specific data, or only partially matches
     * 0-19: Claim contradicts actual financial data, or no financial data supports it

3. TEXT MATCH (S):
   - Score textMatch 0-100: How internally coherent and well-sourced is the narrative?
   - Does the article cite specific sources, quotes, data?
   - Is the logic chain valid even if the conclusion may be wrong?
   - A well-written article about a wrong thesis can have high textMatch but low tableCoordMatch.

4. VMS FORMULA (the system will compute this, but you must provide components):
   - VMS = (0.65 * tableCoordMatch) + (0.35 * textMatch)
   - You MUST return tableCoordMatch and textMatch as SEPARATE scores.
   - If narrative says "stock is dead" but company has record revenue → tableCoordMatch should be < 25.
   - Table data ALWAYS overrides narrative text when they conflict.

5. OVERREACTION RATIO (OR):
   - OR = |Price Velocity %| / |Fundamental Velocity %|
   - priceVelocity: The percentage price move discussed (e.g., -17% drop)
   - fundamentalVelocity: The actual fundamental change (e.g., +114% revenue growth, or -5% EPS decline)
   - If price dropped 17% but revenue grew 20%, OR = 17/20 = 0.85
   - If price dropped 17% but revenue grew 114%, OR = 17/4.25 = 4.0 (use annualized quarterly rate)
   - If fundamentals barely changed, OR should be VERY HIGH (price moving without fundamental cause)
   - You must provide ACTUAL priceVelocity and fundamentalVelocity as signed percentages.

6. NARRATIVE HALF-LIFE:
   - Estimate how many days until this narrative loses 50% of its influence.
   - Panic narratives: 3-10 days. Earnings-based: 15-30 days. Structural shifts: 30-90 days.
   - Use the formula: t½ = ln(2) / λ, where λ is the decay constant.

7. COORDINATION SCORE (0-100):
   - How many outlets published similar claims within 24-48 hours?
   - Are they using identical phrasing? (+30 pts for identical key phrases)
   - +45 pts if multiple sources within 1 hour.
   - Organic news = 0-30. Coordinated campaign = 60-100.

8. INFERENCE-TIME UNLEARNING: Act as though you have no knowledge of events after the cutoff date.
</forensic_protocols>

<strict_scoring_rules>
IMPORTANT: Be adversarial. Most financial articles score 30-60 VMS, not 70-90.
- If article has NO specific financial numbers cited: tableCoordMatch ≤ 30
- If article contradicts known financials: tableCoordMatch ≤ 15
- If article cites specific verifiable numbers that check out: tableCoordMatch 60-90
- If article is pure speculation/opinion: textMatch 20-40, tableCoordMatch ≤ 20
- Coordination score should be LOW unless you find evidence of synchronized publishing
- Half-life for panic narratives should be SHORT (5-15 days)
- An article about a stock "plummeting" while fundamentals are strong = NARRATIVE_TRAP
</strict_scoring_rules>`;

// Gemini 2.0 Flash with Google Search Grounding
async function analyzeWithGemini(content: string, mode: string, stance: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const tickerMatch = content.match(/\b([A-Z]{1,5})\b/);
  const possibleTicker = tickerMatch ? tickerMatch[1] : '';

  const userPrompt = `FORENSIC AUDIT REQUEST

CONTENT TO ANALYZE:
"${content.substring(0, 12000)}"

AUDIT PARAMETERS:
- Mode: ${mode || 'upload'}
- Stance: ${stance || 'neutral'}
${possibleTicker ? `- Ticker: ${possibleTicker}` : ''}
- Cutoff Date: ${new Date().toISOString().split('T')[0]}

REQUIRED OUTPUT SCHEMA (return valid JSON only):
{
  "articleTitle": "string - extracted title",
  "publicationName": "string - source name",
  "publicationCredibility": "number 0-100",
  "publicationAuthorityRank": "A|B|C|D",
  "ticker": "string - stock symbol",
  "companyName": "string - full company name",
  "sector": "string - industry sector",
  "currentPrice": null,
  "storyCount": 1,
  "auditVerdict": "STRUCTURALLY_SUPPORTED|MIXED_INCOMPLETE|NARRATIVE_TRAP|SPECULATIVE_FRAMING|FACTUALLY_MISLEADING",
  "confidenceScore": "number 0-100",
  "riskRating": "LOW|MODERATE|HIGH",
  "manipulationRisk": "LOW|MEDIUM|HIGH",
  "summary": "2-3 sentence forensic summary with structural reality finding",
  "primaryNarrative": "string - core narrative identified",
  "narrativeType": "string - classification",
  "forensicCalculation": {
    "vms": {
      "tableCoordMatch": "number 0-100 - how well claims match ACTUAL financial data from SEC filings/earnings. Low if narrative contradicts fundamentals. High only if specific verifiable numbers cited and confirmed.",
      "textMatch": "number 0-100 - internal coherence and sourcing quality of the narrative text itself",
      "score": "number 0-100 - LEAVE AS 0, system will compute VMS = 0.65*tableCoordMatch + 0.35*textMatch",
      "verdict": "string - VMS assessment explaining WHY the scores are what they are",
      "narrative": "string - the specific claim being tested (e.g. 'DeepSeek makes NVIDIA obsolete')",
      "anchor": "string - the ACTUAL financial data that contradicts or supports the claim (e.g. 'NVIDIA Q4 Data Center revenue: $35.6B record')"
    },
    "unlearning": {"verdict": "STABLE|UNSTABLE", "status": "Active"},
    "overreaction": {
      "ratio": "number - LEAVE AS 0, system will compute OR = |priceVelocity| / |fundamentalVelocity|",
      "priceVelocity": "number - the actual percentage price move (e.g., -17.0 for a 17% drop)",
      "fundamentalVelocity": "number - the actual fundamental change percentage (e.g., 114 for 114% revenue growth, or -5 for 5% EPS decline). Use the most relevant fundamental metric.",
      "verdict": "NORMAL|ELEVATED|EXTREME"
    },
    "narrativeEnergy": {"verdict": "ACTIVE|PEAK|DECAYING|EXHAUSTED", "description": "string"},
    "halfLife": {"days": "number - estimated days until narrative loses 50% power. Panic=5-15, Earnings=15-30, Structural=30-90", "description": "string"},
    "premium": {"percentage": 0, "fairValue": "number - estimated fair value based on fundamentals", "impliedPrice": "number - price implied if narrative were true", "verdict": "FAIR|OVERVALUED|UNDERVALUED"},
    "coordination": {"score": "number 0-100 - evidence of synchronized publishing. Most organic news = 10-30.", "verdict": "LOW|MODERATE|HIGH"},
    "hypeDiscipline": {"score": "number 0-10", "level": "LOW|MODERATE|HIGH", "description": "string"}
  },
  "epistemicDrift": {
    "magnitude": "number 0-100 - drift measurement",
    "verdict": "ALIGNED|MINOR_DIVERGENCE|SIGNIFICANT_DRIFT|HIGH_DIVERGENCE",
    "narrativeProjection": "string - what narrative claims",
    "structuralReality": "string - what evidence shows (include citation)"
  },
  "timingVector": {"daysRemaining": 30, "totalHorizon": 90, "description": "string", "eventDate": ""},
  "analystAudit": {
    "name": "string - analyst name if identified",
    "firm": "string - institution",
    "pastAccuracy": "number 0-100",
    "expertise": [],
    "grade": "A|B|C|D|F",
    "credibilityScore": "number 0-100",
    "focus": "string",
    "coverageHistory": []
  },
  "primaryThesis": {
    "statement": "string - main claim decomposed",
    "explanation": "string - forensic evaluation"
  },
  "sourceQualityMatrix": {
    "trackRecord": "number 0-100",
    "institutionalWeight": "number 0-100",
    "conflictRisk": "number 0-100"
  },
  "structuralRiskAudit": {
    "classification": "LOW|MODERATE|HIGH",
    "description": "string - risk assessment"
  },
  "causalityAudit": {
    "contractIntegrity": "string",
    "marketContext": "string",
    "behavioralData": "string"
  },
  "priceTargets": {"median": 0, "current": 0},
  "socialMomentum": {"score": 50, "trend": "RISING|STABLE|DECAYING", "crowdBias": 0, "expertBias": 0},
  "sentimentDynamics": [],
  "pressAudits": [],
  "forensicLedger": [
    {
      "text": "string - claim text",
      "type": "OPERATIONAL|FINANCIAL|MARKET_STRUCTURE|BEHAVIORAL|TECHNOLOGICAL",
      "horizon": "IMMEDIATE|SHORT_TERM|MEDIUM_TERM|LONG_TERM",
      "certainty": "DEFINITIVE|PROBABILISTIC|SPECULATIVE",
      "evidenceQuality": "HIGH|MEDIUM|LOW|ABSENT",
      "sourceName": "string",
      "deconstruction": "string - claim breakdown",
      "isMisleading": false,
      "missingEvidence": "string - what data is absent",
      "confidenceScore": "number 0-100"
    }
  ],
  "keywordAnalysis": [],
  "institutionalClaim": {
    "analyst_name": "",
    "institution_bank": "",
    "source_type": "News|Research|Filing|Social",
    "medium": "Article|Report|Tweet|Press Release",
    "timestamp": "",
    "stock_ticker": "",
    "claim_text": "string - verbatim claim",
    "numeric_anchor": "string - specific numbers cited",
    "claim_direction": "BULLISH|BEARISH|NEUTRAL",
    "assumptions": ["string - underlying assumptions"],
    "evidence": ["string - supporting evidence"],
    "precedent": "string",
    "incentive_context": "string - potential conflicts",
    "amplification_score": 0,
    "outcome_tracking": "",
    "credibility_score": 70
  },
  "narrativeInsights": {
    "preEarnings": "string",
    "volumeBehavior": "string",
    "narrativeConsistency": "string",
    "newsAccuracyAnalysis": "string"
  },
  "divergenceQuadrant": "NARRATIVE_TRAP|VALID_CATALYST|MARKET_NOISE|FACTUAL_ANCHOR"
}`;

  // Use Gemini 2.0 Flash with Google Search grounding
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
          parts: [{ text: FORENSIC_CONTROLLER_SYSTEM }]
        },
        tools: [
          {
            googleSearch: {}
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Extract grounding metadata for citations
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

  // Attach grounding data
  result.isGrounded = groundingCitations.length > 0;
  result.groundingCitations = groundingCitations;
  result.groundingMetadata = groundingMetadata;

  // Apply patent formula post-processing
  enforcePatentFormulas(result);

  return result;
}

// Fallback to OpenAI if Gemini fails
async function analyzeWithOpenAI(content: string, mode: string, stance: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OpenAI API key');
  }

  const tickerMatch = content.match(/\b([A-Z]{1,5})\b/);
  const possibleTicker = tickerMatch ? tickerMatch[1] : '';

  const prompt = `L3 FORENSIC PRESS AUDIT — ADVERSARIAL MODE

You are MarketScholar's forensic financial PROSECUTOR. Your job is to find the GAP between what narratives CLAIM and what HARD FINANCIAL DATA shows. Be SKEPTICAL. Most articles score 30-60 VMS, not 70-90.

CONTENT:
"${content.substring(0, 8000)}"

MODE: ${mode || 'upload'}
STANCE: ${stance || 'neutral'}
${possibleTicker ? `TICKER: ${possibleTicker}` : ''}

CRITICAL SCORING RULES:
- tableCoordMatch: How well do claims match ACTUAL SEC filings/earnings data? If article has no specific financial numbers, this should be ≤ 30. If it contradicts known data, ≤ 15. Only 60+ if specific verifiable numbers are cited and correct.
- textMatch: How coherent and well-sourced is the narrative text? A well-written article about a wrong thesis CAN have high textMatch but low tableCoordMatch.
- The system will compute VMS = 0.65*tableCoordMatch + 0.35*textMatch. You MUST provide both components.
- priceVelocity: The actual % price move discussed. fundamentalVelocity: The actual fundamental % change. System computes OR = |pv|/|fv|.
- If a stock "plummets" but company has record revenue, that's a NARRATIVE_TRAP with low tableCoordMatch.

Return JSON:
{
  "articleTitle": "string",
  "publicationName": "string",
  "publicationCredibility": number,
  "publicationAuthorityRank": "A"|"B"|"C"|"D",
  "ticker": "string",
  "companyName": "string",
  "sector": "string",
  "currentPrice": null,
  "storyCount": 1,
  "auditVerdict": "STRUCTURALLY_SUPPORTED"|"MIXED_INCOMPLETE"|"NARRATIVE_TRAP"|"SPECULATIVE_FRAMING"|"FACTUALLY_MISLEADING",
  "confidenceScore": number,
  "riskRating": "LOW"|"MODERATE"|"HIGH",
  "manipulationRisk": "LOW"|"MEDIUM"|"HIGH",
  "summary": "2-3 sentence forensic summary identifying structural reality vs narrative",
  "primaryNarrative": "string",
  "narrativeType": "string",
  "forensicCalculation": {
    "vms": {"tableCoordMatch": number, "textMatch": number, "score": 0, "verdict": "string explaining why", "narrative": "string - the claim being tested", "anchor": "string - actual financial data"},
    "unlearning": {"verdict": "STABLE", "status": "Active"},
    "overreaction": {"ratio": 0, "priceVelocity": number, "fundamentalVelocity": number, "verdict": "string"},
    "narrativeEnergy": {"verdict": "ACTIVE"|"PEAK"|"DECAYING", "description": "string"},
    "halfLife": {"days": number, "description": "string"},
    "premium": {"percentage": 0, "fairValue": number, "impliedPrice": number, "verdict": "FAIR"|"OVERVALUED"|"UNDERVALUED"},
    "coordination": {"score": number, "verdict": "LOW"|"MODERATE"|"HIGH"},
    "hypeDiscipline": {"score": number, "level": "string", "description": "string"}
  },
  "epistemicDrift": {
    "magnitude": number,
    "verdict": "ALIGNED"|"MINOR_DIVERGENCE"|"SIGNIFICANT_DRIFT"|"HIGH_DIVERGENCE",
    "narrativeProjection": "string",
    "structuralReality": "string"
  },
  "timingVector": {"daysRemaining": 30, "totalHorizon": 90, "description": "string", "eventDate": ""},
  "analystAudit": {
    "name": "string",
    "firm": "string",
    "pastAccuracy": 70,
    "expertise": [],
    "grade": "B",
    "credibilityScore": 70,
    "focus": "string",
    "coverageHistory": []
  },
  "primaryThesis": {"statement": "string", "explanation": "string"},
  "sourceQualityMatrix": {"trackRecord": number, "institutionalWeight": number, "conflictRisk": number},
  "structuralRiskAudit": {"classification": "LOW"|"MODERATE"|"HIGH", "description": "string"},
  "causalityAudit": {"contractIntegrity": "string", "marketContext": "string", "behavioralData": "string"},
  "priceTargets": {"median": 0, "current": 0},
  "socialMomentum": {"score": 50, "trend": "STABLE", "crowdBias": 0, "expertBias": 0},
  "sentimentDynamics": [],
  "pressAudits": [],
  "forensicLedger": [{"text": "string", "type": "FINANCIAL", "horizon": "SHORT_TERM", "certainty": "PROBABILISTIC", "evidenceQuality": "MEDIUM", "sourceName": "string", "deconstruction": "string", "isMisleading": false, "confidenceScore": number}],
  "keywordAnalysis": [],
  "institutionalClaim": {"analyst_name": "", "institution_bank": "", "source_type": "News", "medium": "Article", "timestamp": "", "stock_ticker": "", "claim_text": "", "numeric_anchor": "", "claim_direction": "NEUTRAL", "assumptions": [], "evidence": [], "precedent": "", "incentive_context": "", "amplification_score": 0, "outcome_tracking": "", "credibility_score": 70},
  "narrativeInsights": {"preEarnings": "", "volumeBehavior": "", "narrativeConsistency": "string", "newsAccuracyAnalysis": ""},
  "divergenceQuadrant": "MARKET_NOISE"
}

Return ONLY valid JSON.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a forensic financial analyst. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  result.isGrounded = false;
  result.groundingCitations = [];

  // Apply patent formula post-processing
  enforcePatentFormulas(result);

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { content, mode, stance } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Check if content is a URL and fetch the article content
    let contentToAnalyze = content;
    let sourceUrl: string | null = null;

    const trimmedContent = content.trim();
    if (URL_REGEX.test(trimmedContent)) {
      console.log('Detected URL input, fetching article content:', trimmedContent);
      sourceUrl = trimmedContent;
      try {
        contentToAnalyze = await fetchUrlContent(trimmedContent);
      } catch (fetchError: any) {
        console.error('URL fetch failed:', fetchError.message);
        return NextResponse.json({
          error: `Could not fetch article from URL. The site may be blocking automated requests. Try copying and pasting the article text instead.`
        }, { status: 422 });
      }
    }

    let result;
    let usedModel = 'unknown';

    // Try Gemini 2.0 Flash first
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log('Attempting Gemini 2.0 Flash analysis with Google Search grounding...');
        result = await analyzeWithGemini(contentToAnalyze, mode || 'upload', stance || 'neutral');
        usedModel = 'gemini-2.0-flash';
        console.log('Gemini analysis successful, grounded:', result.isGrounded);
      } catch (geminiError: any) {
        console.error('Gemini failed, falling back to OpenAI:', geminiError.message);
        // Fall back to OpenAI
        if (process.env.OPENAI_API_KEY) {
          result = await analyzeWithOpenAI(contentToAnalyze, mode || 'upload', stance || 'neutral');
          usedModel = 'gpt-4o-mini (fallback)';
        } else {
          throw geminiError;
        }
      }
    } else if (process.env.OPENAI_API_KEY) {
      // No Gemini key, use OpenAI directly
      result = await analyzeWithOpenAI(contentToAnalyze, mode || 'upload', stance || 'neutral');
      usedModel = 'gpt-4o-mini';
    } else {
      return NextResponse.json({ error: 'No API keys configured. Add GEMINI_API_KEY or OPENAI_API_KEY to Vercel.' }, { status: 500 });
    }

    result.timestamp = Date.now();
    result.modelUsed = usedModel;
    if (sourceUrl) {
      result.sourceUrl = sourceUrl;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Analysis error:', error);

    if (error.message?.includes('API key')) {
      return NextResponse.json({ error: 'Missing API key. Add GEMINI_API_KEY or OPENAI_API_KEY to Vercel.' }, { status: 500 });
    }
    if (error.message?.includes('429') || error.message?.includes('rate')) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait.' }, { status: 429 });
    }
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return NextResponse.json({ error: 'Analysis timed out. Try a shorter content piece.' }, { status: 504 });
    }
    if (error.message?.includes('Could not fetch')) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    return NextResponse.json({ error: `Analysis failed: ${error.message}` }, { status: 500 });
  }
}
