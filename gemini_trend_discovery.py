"""
Gemini HFT-Style Trend Discovery
Discovers top volatile tickers and performs press audit on each.

Runs daily to find market movers and analyze if price action is justified.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import google.generativeai as genai
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Initialize
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None


class GeminiTrendDiscovery:
    """
    HFT-Style Trend Discovery using Gemini with Google Search.

    Discovers:
    - Top volatile tickers of the day
    - Breaking news catalysts
    - Press sentiment vs reality gap
    - Narrative trap detection
    """

    def __init__(self, api_key: Optional[str] = None, supabase_client: Optional[Client] = None):
        self.api_key = api_key or GEMINI_API_KEY
        self.db = supabase_client or supabase
        self.model = None

        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(
                    model_name='gemini-2.0-flash',
                    tools='google_search'
                )
                logger.info("✓ Gemini Trend Discovery initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Trend Discovery: {e}")
                self.model = None

    def discover_trending_tickers(self, max_tickers: int = 5) -> Dict:
        """
        Discover top volatile/trending tickers today.

        Returns:
        {
            'trending_tickers': [
                {
                    'ticker': 'NVDA',
                    'price_change_pct': -17.2,
                    'volume_spike': 3.5,
                    'catalyst': 'DeepSeek announcement',
                    'headline_count': 45,
                    'sentiment_avg': -65,
                    'epistemic_drift': 72,
                    'verdict': 'NARRATIVE_TRAP'
                }
            ],
            'market_summary': 'Brief market overview',
            'discovered_at': 'timestamp'
        }
        """
        if not self.model:
            return {'error': 'Model not initialized', 'trending_tickers': []}

        prompt = f"""You are a High-Frequency Trading analyst discovering market movers.

TASK: Find the TOP {max_tickers} most significant stock movers TODAY.

Use Google Search to find:
1. Biggest price movers (% change up or down)
2. Unusual volume spikes
3. Breaking news catalysts
4. Major earnings surprises

For EACH ticker, provide a "Press Audit":
- Count of recent headlines (last 24h)
- Average sentiment of coverage (-100 to +100)
- Is the price move JUSTIFIED by fundamentals?
- Epistemic drift score (0-100): gap between narrative and reality

Classify each as:
- VALID_CATALYST: Price move justified by real news
- NARRATIVE_TRAP: Overreaction to hype/fear
- EARNINGS_DRIVEN: Legitimate earnings surprise
- MARKET_CONTAGION: Sector-wide move
- MANIPULATION_RISK: Suspicious coordinated activity

Return ONLY JSON (no markdown):
{{
    "trending_tickers": [
        {{
            "ticker": "NVDA",
            "company_name": "NVIDIA Corporation",
            "price_change_pct": -5.2,
            "volume_spike": 2.3,
            "catalyst": "Brief description of catalyst",
            "headline_count": 25,
            "sentiment_avg": -45,
            "epistemic_drift": 55,
            "evidence_strength": 40,
            "narrative_intensity": 75,
            "verdict": "NARRATIVE_TRAP",
            "reasoning": "Why this classification"
        }}
    ],
    "market_summary": "Brief overall market context",
    "sectors_affected": ["Technology", "Semiconductors"],
    "risk_level": "ELEVATED"
}}"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': 0.3,
                    'max_output_tokens': 3000
                }
            )

            response_text = response.text.strip()
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            result = json.loads(response_text)
            result['discovered_at'] = datetime.now().isoformat()

            # Save to database
            if self.db and result.get('trending_tickers'):
                self._save_trending_tickers(result['trending_tickers'])

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse trending response: {e}")
            return {'error': str(e), 'trending_tickers': []}
        except Exception as e:
            logger.error(f"Trend discovery failed: {e}")
            return {'error': str(e), 'trending_tickers': []}

    def press_audit_ticker(self, ticker: str) -> Dict:
        """
        Perform detailed press audit on a specific ticker.
        """
        if not self.model:
            return {'error': 'Model not initialized'}

        prompt = f"""Perform a PRESS AUDIT on {ticker}.

Use Google Search to find:
1. All headlines about {ticker} from the last 24 hours
2. The main narrative being pushed
3. Hard data points vs speculation
4. Coordinated messaging patterns

Analyze:
- Are multiple sources using identical phrasing? (coordination)
- Is there more opinion than data? (epistemic drift)
- Does the sentiment match the fundamentals?
- Are anonymous sources being used?

Return ONLY JSON:
{{
    "ticker": "{ticker}",
    "headline_count": 30,
    "unique_sources": 12,
    "sentiment_distribution": {{
        "bullish": 5,
        "neutral": 10,
        "bearish": 15
    }},
    "sentiment_avg": -35,
    "top_narratives": [
        "Main narrative 1",
        "Main narrative 2"
    ],
    "hard_anchors": [
        {{"claim": "...", "value": "...", "verified": true}}
    ],
    "soft_claims": [
        "Unverified claim or speculation"
    ],
    "coordination_score": 45,
    "epistemic_drift": 60,
    "verdict": "NARRATIVE_TRAP",
    "recommendation": "Brief actionable insight"
}}"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={'temperature': 0.2}
            )

            response_text = response.text.strip()
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            result = json.loads(response_text)
            result['audited_at'] = datetime.now().isoformat()
            return result

        except Exception as e:
            logger.error(f"Press audit failed for {ticker}: {e}")
            return {'error': str(e), 'ticker': ticker}

    def _save_trending_tickers(self, tickers: List[Dict]):
        """Save trending tickers to database."""
        if not self.db:
            return

        try:
            for ticker_data in tickers:
                self.db.table('trending_tickers').insert({
                    'ticker': ticker_data.get('ticker'),
                    'company_name': ticker_data.get('company_name'),
                    'price_change_pct': ticker_data.get('price_change_pct'),
                    'volume_spike': ticker_data.get('volume_spike'),
                    'catalyst': ticker_data.get('catalyst'),
                    'headline_count': ticker_data.get('headline_count'),
                    'sentiment_avg': ticker_data.get('sentiment_avg'),
                    'epistemic_drift': ticker_data.get('epistemic_drift'),
                    'evidence_strength': ticker_data.get('evidence_strength'),
                    'narrative_intensity': ticker_data.get('narrative_intensity'),
                    'verdict': ticker_data.get('verdict'),
                    'reasoning': ticker_data.get('reasoning'),
                    'discovered_at': datetime.now().isoformat(),
                    'discovered_date': datetime.now().date().isoformat()
                }).execute()

            logger.info(f"  Saved {len(tickers)} trending tickers to database")

        except Exception as e:
            logger.error(f"Failed to save trending tickers: {e}")

    def get_sector_sentiment(self, sector: str) -> Dict:
        """
        Get overall sentiment for a sector using Gemini search.
        """
        if not self.model:
            return {'error': 'Model not initialized'}

        prompt = f"""Analyze current market sentiment for the {sector} sector.

Use Google Search to find:
1. Recent sector news and developments
2. Major stocks moving in this sector
3. Analyst sentiment and price targets
4. Key risks and opportunities

Return ONLY JSON:
{{
    "sector": "{sector}",
    "overall_sentiment": 45,
    "sentiment_label": "CAUTIOUSLY_BULLISH",
    "key_drivers": ["driver 1", "driver 2"],
    "top_movers": [
        {{"ticker": "XXX", "change_pct": 5.2, "reason": "..."}}
    ],
    "risks": ["risk 1", "risk 2"],
    "opportunities": ["opportunity 1"],
    "outlook": "Brief sector outlook"
}}"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={'temperature': 0.3}
            )

            response_text = response.text.strip()
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            return json.loads(response_text)

        except Exception as e:
            logger.error(f"Sector sentiment failed: {e}")
            return {'error': str(e), 'sector': sector}


def run_daily_trend_discovery():
    """
    Run daily trend discovery - call this from GitHub Actions.
    """
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    logger.info("=" * 60)
    logger.info("GEMINI TREND DISCOVERY - Daily Run")
    logger.info("=" * 60)

    discovery = GeminiTrendDiscovery()

    # Discover trending tickers
    logger.info("\nDiscovering trending tickers...")
    trends = discovery.discover_trending_tickers(max_tickers=5)

    if trends.get('error'):
        logger.error(f"Discovery failed: {trends['error']}")
        return trends

    # Log results
    if trends.get('trending_tickers'):
        logger.info(f"\nFound {len(trends['trending_tickers'])} trending tickers:")
        for t in trends['trending_tickers']:
            logger.info(f"  {t['ticker']}: {t.get('price_change_pct', 0):+.1f}% | "
                       f"Drift: {t.get('epistemic_drift', 0)} | "
                       f"Verdict: {t.get('verdict', 'UNKNOWN')}")

    if trends.get('market_summary'):
        logger.info(f"\nMarket Summary: {trends['market_summary']}")

    logger.info("\n" + "=" * 60)
    logger.info("Trend Discovery Complete")
    logger.info("=" * 60)

    return trends


if __name__ == "__main__":
    run_daily_trend_discovery()
