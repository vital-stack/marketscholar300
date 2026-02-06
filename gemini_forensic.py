"""
Gemini Forensic Analyzer - L3 Forensic Audit System
Implements VMS, Epistemic Drift, Hard Anchor Detection, and Spatial Divergence Mapping

This module acts as a "prosecutor" looking for gaps between narrative and reality.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import google.generativeai as genai
from supabase import Client

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')


class GeminiForensicAnalyzer:
    """
    L3 Forensic Audit System
    Acts as prosecutor looking for Epistemic Drift between narrative and structural reality.

    Implements:
    - Verified Match Score (VMS = 0.35*S + 0.65*T)
    - Epistemic Drift Detection
    - Hard Anchor Detection (GAAP data)
    - Soft Narrative Detection (opinions/predictions)
    - Spatial Divergence Mapping (4 quadrants)
    """

    def __init__(self, api_key: Optional[str] = None, supabase_client: Optional[Client] = None):
        self.api_key = api_key or GEMINI_API_KEY
        self.db = supabase_client
        self.model = None

        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                # Use Gemini 2.0 Flash for forensic analysis
                self.model = genai.GenerativeModel(
                    model_name='gemini-2.0-flash',
                    tools='google_search'
                )
                logger.info("✓ Gemini Forensic Analyzer initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Forensic: {e}")
                self.model = None
        else:
            logger.warning("No GEMINI_API_KEY - Forensic Analyzer disabled")

    def forensic_audit(self, ticker: str, article_data: Dict) -> Dict:
        """
        Perform L3 Forensic Audit on an article.

        Returns:
        {
            'vms_score': float,           # VMS = 0.35(S) + 0.65(T)
            'epistemic_drift': float,     # Gap between narrative and reality (0-100)
            'hard_anchors': List[Dict],   # GAAP data points
            'soft_narrative': List[str],  # Opinion/speculation
            'evidence_strength': int,     # X-axis (0-100)
            'narrative_intensity': int,   # Y-axis (0-100)
            'quadrant': str,              # NARRATIVE_TRAP, VALID_CATALYST, etc.
            'verdict': str,               # Overall assessment
            'audit_confidence': float     # Confidence in analysis (0-1)
        }
        """
        if not self.model:
            return self._default_audit_result(ticker, "Model not initialized")

        title = article_data.get('title', '')
        content = article_data.get('full_text', '') or article_data.get('content_summary', '')

        if not content:
            return self._default_audit_result(ticker, "No content to analyze")

        prompt = f"""You are a FORENSIC PROSECUTOR auditing financial claims.

Your job: Find the gap between NARRATIVE (what the analyst claims) and STRUCTURAL REALITY (what hard data shows).

ARTICLE TO AUDIT:
Ticker: {ticker}
Title: {title}
Content: {content[:3000]}

FORENSIC PROTOCOL:

1. HARD ANCHORS (concrete, verifiable data) - Weight 65%:
   - GAAP metrics (revenue, earnings, margins with specific numbers)
   - Regulatory filings (10-K, 10-Q data)
   - Specific dates and events
   - Quoted statistics with sources

2. SOFT NARRATIVE (opinion, speculation) - Weight 35%:
   - Analyst predictions without data backing
   - Market "sentiment" claims
   - Words like "could", "might", "expected", "believes"
   - Forward-looking statements

3. EPISTEMIC DRIFT (0-100):
   - How much does the narrative DIVERGE from hard evidence?
   - 0 = Perfect match between claims and evidence
   - 100 = Complete disconnect (pure speculation)

4. VERIFIED MATCH SCORE (VMS):
   - Formula: VMS = 0.35 * (text_coherence) + 0.65 * (data_match)
   - text_coherence: How internally consistent is the narrative (0-1)
   - data_match: How well claims match verifiable data (0-1)

5. SPATIAL QUADRANT MAPPING:
   - Evidence Strength (X-axis, 0-100): How much hard data supports claims
   - Narrative Intensity (Y-axis, 0-100): How strong/dramatic the narrative is

   Quadrants:
   - High Evidence + Low Narrative = FACTUAL_ANCHOR (boring but true)
   - High Evidence + High Narrative = VALID_CATALYST (justified excitement)
   - Low Evidence + High Narrative = NARRATIVE_TRAP (hype without substance)
   - Low Evidence + Low Narrative = MARKET_NOISE (irrelevant)

6. VERDICT:
   - VERIFIED: Claims well-supported by evidence
   - PARTIAL: Some claims supported, some not
   - UNVERIFIED: Claims lack evidence
   - MISLEADING: Claims contradict available evidence

Return ONLY valid JSON (no markdown):
{{
    "hard_anchors": [
        {{"claim": "specific claim", "value": "data point", "source": "where from", "verifiable": true}}
    ],
    "soft_narrative": [
        "prediction or opinion statement"
    ],
    "text_coherence": 0.75,
    "data_match": 0.60,
    "vms_score": 0.65,
    "epistemic_drift": 35,
    "evidence_strength": 65,
    "narrative_intensity": 45,
    "quadrant": "VALID_CATALYST",
    "verdict": "PARTIAL",
    "audit_confidence": 0.80,
    "reasoning": "Brief explanation of findings"
}}"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': 0.2,
                    'max_output_tokens': 2000
                }
            )

            # Parse JSON response
            response_text = response.text.strip()
            # Clean up potential markdown formatting
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            result = json.loads(response_text)

            # Ensure required fields
            result['ticker'] = ticker
            result['analyzed_at'] = datetime.now().isoformat()
            result['used_grounding'] = hasattr(response, 'candidates') and len(response.candidates) > 0

            # Calculate VMS if not provided correctly
            if 'vms_score' not in result or result['vms_score'] == 0:
                text_coherence = result.get('text_coherence', 0.5)
                data_match = result.get('data_match', 0.5)
                result['vms_score'] = round(0.35 * text_coherence + 0.65 * data_match, 3)

            # Determine quadrant if not set
            if 'quadrant' not in result:
                result['quadrant'] = self._determine_quadrant(
                    result.get('evidence_strength', 50),
                    result.get('narrative_intensity', 50)
                )

            # Save to database
            if self.db:
                self._save_forensic_audit(ticker, article_data, result)

            logger.info(f"  Forensic: VMS={result['vms_score']:.2f}, Drift={result['epistemic_drift']}, Verdict={result['verdict']}")
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            return self._default_audit_result(ticker, f"JSON parse error: {e}")
        except Exception as e:
            logger.error(f"Forensic audit failed: {e}")
            return self._default_audit_result(ticker, str(e))

    def _determine_quadrant(self, evidence: int, narrative: int) -> str:
        """Determine spatial quadrant based on evidence and narrative intensity."""
        if evidence >= 50 and narrative >= 50:
            return "VALID_CATALYST"
        elif evidence >= 50 and narrative < 50:
            return "FACTUAL_ANCHOR"
        elif evidence < 50 and narrative >= 50:
            return "NARRATIVE_TRAP"
        else:
            return "MARKET_NOISE"

    def _default_audit_result(self, ticker: str, error: str) -> Dict:
        """Return default result when audit fails."""
        return {
            'ticker': ticker,
            'hard_anchors': [],
            'soft_narrative': [],
            'vms_score': 0.5,
            'epistemic_drift': 0,
            'evidence_strength': 50,
            'narrative_intensity': 50,
            'quadrant': 'UNKNOWN',
            'verdict': 'ERROR',
            'audit_confidence': 0,
            'error': error,
            'analyzed_at': datetime.now().isoformat()
        }

    def _save_forensic_audit(self, ticker: str, article_data: Dict, audit: Dict):
        """Save forensic audit results to database."""
        if not self.db:
            return

        try:
            # Save to claim_verifications table
            self.db.table('claim_verifications').insert({
                'entity': ticker,
                'claim_text': audit.get('reasoning', ''),
                'claim_type': 'forensic_audit',
                'vms_score': audit.get('vms_score'),
                'text_match_score': audit.get('text_coherence'),
                'table_match_score': audit.get('data_match'),
                'verdict': audit.get('verdict'),
                'analysis_date': audit.get('analyzed_at')
            }).execute()

            # Save to spatial_divergence_map table
            article_id = article_data.get('article_id') or article_data.get('id')
            self.db.table('spatial_divergence_map').insert({
                'article_id': article_id,
                'ticker': ticker,
                'evidence_strength': audit.get('evidence_strength'),
                'narrative_intensity': audit.get('narrative_intensity'),
                'quadrant': audit.get('quadrant'),
                'epistemic_drift': audit.get('epistemic_drift'),
                'vms_score': audit.get('vms_score'),
                'hard_anchors': json.dumps(audit.get('hard_anchors', [])),
                'soft_narrative': json.dumps(audit.get('soft_narrative', [])),
                'verdict': audit.get('verdict'),
                'audit_confidence': audit.get('audit_confidence')
            }).execute()

            logger.debug(f"  Saved forensic audit for {ticker}")

        except Exception as e:
            logger.error(f"Failed to save forensic audit: {e}")

    def narrative_half_life_prediction(self, ticker: str, narrative_data: Dict) -> Dict:
        """
        Use Gemini to predict narrative half-life based on historical patterns.
        """
        if not self.model:
            return {'error': 'Model not initialized'}

        prompt = f"""You are predicting narrative half-life for {ticker}.

CURRENT NARRATIVE:
Name: {narrative_data.get('narrative_name', 'Unknown')}
Initial Sentiment: {narrative_data.get('initial_sentiment', 0)}
Current Sentiment: {narrative_data.get('current_sentiment', 0)}
Days Elapsed: {narrative_data.get('days_elapsed', 0)}

TASK:
Based on similar past narratives, predict:
1. Decay rate (sentiment points lost per day)
2. Half-life (days until sentiment drops to 50% of initial)
3. Days until exhaustion (sentiment < 20)
4. Confidence in prediction (0-1)

Consider:
- Sector-specific narrative duration
- Similar historical events
- Current market conditions

Return ONLY JSON:
{{
    "predicted_decay_rate": 2.5,
    "predicted_half_life": 12.3,
    "days_until_exhaustion": 45,
    "confidence": 0.78,
    "similar_narratives": ["example 1", "example 2"],
    "reasoning": "explanation"
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
            result['ticker'] = ticker
            result['predicted_at'] = datetime.now().isoformat()
            return result

        except Exception as e:
            logger.error(f"Half-life prediction failed: {e}")
            return {'error': str(e), 'ticker': ticker}

    def batch_audit(self, articles: List[Dict]) -> List[Dict]:
        """
        Perform forensic audit on multiple articles.
        """
        results = []
        for article in articles:
            ticker = article.get('ticker', 'UNKNOWN')
            audit = self.forensic_audit(ticker, article)
            audit['article_id'] = article.get('id')
            results.append(audit)
        return results
