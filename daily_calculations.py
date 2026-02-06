"""
MarketScholar - Daily Formula Calculator (UPDATED)
Works with existing decay_engine.py

Implements Page 2 Patent Formulas:
1. OR - Overreaction Ratio
2. NPP - Narrative Premium Percent
3. HDS - Hype Discipline Score
4. Coordination Score
5. AAR - Analyst Accuracy Rate
6. ARB - Bayesian Reliability

NOTE: Decay calculations (t₁/₂) handled by decay_engine.py
"""

import os
from datetime import datetime, timedelta
from supabase import create_client
import yfinance as yf
import logging
import re
from difflib import SequenceMatcher
from typing import Dict, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


class PatentFormulaCalculator:
    """
    Implements Page 2 patent formulas (except decay - that's in decay_engine.py)
    """
    
    def __init__(self):
        self.db = supabase
    
    # ========================================================================
    # FORMULA 1: Analyst Accuracy Rate (AAR)
    # ========================================================================
    
    def calculate_analyst_accuracy(self, analyst_id: int) -> float:
        """
        AAR = (Correct Predictions / Total Evaluated) × 100
        """
        try:
            calls = self.db.table('analyst_calls')\
                .select('*')\
                .eq('analyst_id', analyst_id)\
                .eq('outcome_status', 'EVALUATED')\
                .execute()
            
            if not calls.data:
                return 50.0
            
            correct = sum(1 for call in calls.data if call.get('directional_correct'))
            return round((correct / len(calls.data)) * 100, 2)
            
        except Exception as e:
            logger.error(f"Error calculating AAR: {e}")
            return 50.0
    
    # ========================================================================
    # FORMULA 2: Bayesian Reliability (ARB)
    # ========================================================================
    
    def calculate_reliability_bayesian(self, analyst_id: int) -> float:
        """
        ARB = (α₀ + successes) / (α₀ + β₀ + total) × 100
        """
        try:
            calls = self.db.table('analyst_calls')\
                .select('*')\
                .eq('analyst_id', analyst_id)\
                .eq('outcome_status', 'EVALUATED')\
                .execute()
            
            if not calls.data:
                return 50.0
            
            alpha_0, beta_0 = 2, 2
            successes = sum(1 for call in calls.data if call.get('directional_correct'))
            failures = len(calls.data) - successes
            
            return round(((alpha_0 + successes) / (alpha_0 + beta_0 + successes + failures)) * 100, 2)
            
        except Exception as e:
            logger.error(f"Error calculating ARB: {e}")
            return 50.0
    
    # ========================================================================
    # FORMULA 3: Overreaction Ratio (OR) - FROM PAGE 2
    # ========================================================================
    
    def calculate_overreaction_ratio(self, ticker: str) -> float:
        """
        PATENT FORMULA FROM PAGE 2:
        OR = Price Velocity / Fundamental Velocity
        
        Case Study: -17% price / +114% revenue = 4.0 (Extreme)
        """
        try:
            stock = yf.Ticker(ticker)
            
            # Price Velocity (30-day)
            hist = stock.history(period='60d')
            if len(hist) < 30:
                return 1.0
            
            price_30d_ago = hist['Close'].iloc[-30]
            price_current = hist['Close'].iloc[-1]
            price_velocity = ((price_current - price_30d_ago) / price_30d_ago) * 100
            
            # Fundamental Velocity (YoY revenue growth)
            try:
                income_stmt = stock.financials
                if income_stmt.empty or len(income_stmt.columns) < 2:
                    return 1.0
                
                revenue_row = income_stmt.loc['Total Revenue'] if 'Total Revenue' in income_stmt.index else None
                if revenue_row is None:
                    return 1.0
                
                latest_revenue = revenue_row.iloc[0]
                prior_revenue = revenue_row.iloc[1]
                fundamental_velocity = ((latest_revenue - prior_revenue) / prior_revenue) * 100
                
            except:
                return 1.0
            
            if abs(fundamental_velocity) > 0:
                or_ratio = abs(price_velocity) / abs(fundamental_velocity)
            else:
                or_ratio = 1.0
            
            return round(or_ratio, 2)
            
        except Exception as e:
            logger.error(f"Error calculating OR: {e}")
            return 1.0
    
    # ========================================================================
    # FORMULA 4: Narrative Premium (NPP) - FROM PAGE 2
    # ========================================================================
    
    def calculate_narrative_premium(self, ticker: str) -> Dict:
        """
        PATENT FORMULA FROM PAGE 2:
        NPP = (IP - FV) / FV × 100
        
        Case Study: $95 vs $128 = -26% (Overcorrection)
        """
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            current_price = info.get('currentPrice', 0)
            if current_price == 0:
                hist = stock.history(period='1d')
                if not hist.empty:
                    current_price = hist['Close'].iloc[-1]
            
            eps = info.get('trailingEps', 0)
            
            if eps <= 0:
                return {'premium_pct': 0, 'fair_value': 0, 'current_price': current_price, 'fair_value_delta': 0}
            
            fair_value_pe = 17
            fair_value = eps * fair_value_pe
            premium_pct = ((current_price - fair_value) / fair_value) * 100
            
            return {
                'premium_pct': round(premium_pct, 2),
                'fair_value': round(fair_value, 2),
                'current_price': round(current_price, 2),
                'fair_value_delta': round(current_price - fair_value, 2)
            }
            
        except Exception as e:
            logger.error(f"Error calculating NPP: {e}")
            return {'premium_pct': 0, 'fair_value': 0, 'current_price': 0, 'fair_value_delta': 0}
    
    # ========================================================================
    # FORMULA 5: Hype Discipline Score (HDS) - FROM PAGE 2
    # ========================================================================
    
    def calculate_hype_discipline(self, article_text: str) -> int:
        """
        PATENT FORMULA FROM PAGE 2:
        HDS = Data Density / Emotional Manipulation
        
        Case Study: HDS = 32 (LOW - emotionally manipulative)
        """
        if not article_text:
            return 50
        
        try:
            hype_words = ['wipeout', 'collapse', 'foundation shaking', 'unprecedented',
                         'massive', 'catastrophic', 'revolutionary', 'game-changer',
                         'disaster', 'crisis', 'crash', 'plunge', 'soar', 'skyrocket',
                         'devastate', 'obliterate', 'dominate', 'breakthrough']
            
            text_lower = article_text.lower()
            hype_count = sum(text_lower.count(word) for word in hype_words)
            
            numeric_patterns = [r'\d+\.?\d*%', r'\$\d+\.?\d*[BMK]?', 
                              r'\d+\.?\d*\s*billion', r'\d+\.?\d*\s*million', 
                              r'\d{1,3}(,\d{3})*']
            
            numeric_anchors = sum(len(re.findall(p, article_text, re.IGNORECASE)) for p in numeric_patterns)
            
            if numeric_anchors > 0:
                data_to_hype_ratio = numeric_anchors / (hype_count + 1)
                hds = min(100, int(data_to_hype_ratio * 20))
            else:
                hds = 0
            
            if numeric_anchors > hype_count * 3:
                hds = min(100, hds + 20)
            
            return hds
            
        except Exception as e:
            logger.error(f"Error calculating HDS: {e}")
            return 50
    
    # ========================================================================
    # FORMULA 6: Coordination Score - FROM PAGE 2
    # ========================================================================
    
    def calculate_coordination_score(self, ticker: str, narrative_name: str) -> int:
        """
        PATENT FORMULA FROM PAGE 2:
        Timing + Identical Phrasing
        
        Case Study: 85/100 (Likely Coordinated)
        """
        try:
            cutoff = (datetime.now() - timedelta(days=7)).isoformat()
            articles = self.db.table('articles')\
                .select('title, content_summary, published_at, author')\
                .eq('ticker', ticker)\
                .gte('published_at', cutoff)\
                .execute()
            
            if not articles.data or len(articles.data) < 2:
                return 0
            
            relevant = [a for a in articles.data 
                       if narrative_name.lower() in (a.get('title', '') + a.get('content_summary', '')).lower()]
            
            if len(relevant) < 2:
                return 0
            
            score = 0
            
            # Timing check (3+ sources within 1 hour)
            timestamps = []
            for a in relevant:
                try:
                    ts = datetime.fromisoformat(a['published_at'].replace('Z', '+00:00'))
                    timestamps.append(ts)
                except:
                    continue
            
            timestamps.sort()
            for i in range(len(timestamps) - 2):
                if (timestamps[i+2] - timestamps[i]).total_seconds() < 3600:
                    score += 45
                    logger.info(f"  ⚠️  {ticker}: 3+ sources within 1 hour (+45)")
                    break
            
            # Phrasing check (70%+ similarity)
            texts = [(a.get('title', '') + ' ' + a.get('content_summary', '')).lower() for a in relevant]
            max_sim = 0
            for i in range(len(texts)):
                for j in range(i+1, len(texts)):
                    max_sim = max(max_sim, SequenceMatcher(None, texts[i], texts[j]).ratio())
            
            if max_sim > 0.7:
                score += 30
                logger.info(f"  ⚠️  {ticker}: Identical phrasing {int(max_sim*100)}% (+30)")
            
            # Anonymous sources check
            anon = sum(1 for a in relevant if not a.get('author'))
            if anon >= len(relevant) * 0.5:
                score += 20
                logger.info(f"  ⚠️  {ticker}: {anon}/{len(relevant)} anonymous sources (+20)")
            
            return min(100, score)
            
        except Exception as e:
            logger.error(f"Error calculating coordination: {e}")
            return 0
    
    # ========================================================================
    # MASTER FUNCTION: Update All Analyst Scores
    # ========================================================================
    
    def update_analyst_scores(self, analyst_id: int, ticker: str):
        """
        Calculate ALL Page 2 formulas and save to analyst_scores
        """
        try:
            logger.info(f"  Analyst {analyst_id} ({ticker})...")
            
            # Get article text for HDS
            article_text = ""
            recent = self.db.table('analyst_calls')\
                .select('article_id')\
                .eq('analyst_id', analyst_id)\
                .limit(1)\
                .execute()
            
            if recent.data and recent.data[0].get('article_id'):
                article = self.db.table('articles')\
                    .select('full_text')\
                    .eq('id', recent.data[0]['article_id'])\
                    .single()\
                    .execute()
                if article.data:
                    article_text = article.data.get('full_text', '')
            
            # Calculate formulas
            aar = self.calculate_analyst_accuracy(analyst_id)
            arb = self.calculate_reliability_bayesian(analyst_id)
            or_ratio = self.calculate_overreaction_ratio(ticker)
            npp = self.calculate_narrative_premium(ticker)
            hds = self.calculate_hype_discipline(article_text) if article_text else 50
            
            # Coordination score
            narrative = self.db.table('narratives')\
                .select('narrative_name')\
                .eq('ticker', ticker)\
                .limit(1)\
                .execute()
            coord = self.calculate_coordination_score(ticker, narrative.data[0]['narrative_name']) if narrative.data else 0
            
            # Composite credibility score
            acs = (
                aar * 0.25 +           # 25% accuracy
                arb * 0.15 +           # 15% reliability
                hds * 0.10 +           # 10% discipline
                (100 - coord) * 0.05 + # 5% inverse coordination
                50 * 0.45              # 45% placeholders
            )
            
            # Narrative risk classification
            if or_ratio > 3.0 or coord > 70:
                nrs = 80  # High risk
            elif or_ratio > 2.0 or coord > 50:
                nrs = 60  # Medium risk
            else:
                nrs = 30  # Low risk
            
            # Save to database
            self.db.table('analyst_scores').upsert({
                'analyst_id': analyst_id,
                'ticker': ticker,
                'accuracy_rate': aar,
                'reliability_score': arb,
                'source_reliability': 70.0,
                'claim_verifiability': hds,
                'claim_confidence': round((arb + hds) / 2, 2),
                'verified_match_score': 50.0,
                'cross_verification': 50.0,
                'narrative_persistence': 50.0,
                'overreaction_ratio': or_ratio,
                'narrative_risk': nrs,
                'narrative_premium_pct': npp['premium_pct'],
                'fair_value_delta': npp['fair_value_delta'],
                'credibility_score': round(acs, 2),
                'last_updated': datetime.now().isoformat()
            }, on_conflict='analyst_id,ticker').execute()
            
            logger.info(f"    ✓ ACS={round(acs,2)} OR={or_ratio} NPP={npp['premium_pct']}% HDS={hds} Coord={coord}")
            
        except Exception as e:
            logger.error(f"Error updating analyst {analyst_id}: {e}")


def calculate_all_analyst_scores():
    """Calculate scores for ALL analysts"""
    logger.info("="*60)
    logger.info("ANALYST SCORES (Page 2 Formulas)")
    logger.info("="*60)
    
    calc = PatentFormulaCalculator()
    
    try:
        analysts = supabase.table('analysts').select('id, name').execute()
        
        for analyst in analysts.data:
            # Find primary ticker
            calls = supabase.table('analyst_calls')\
                .select('ticker')\
                .eq('analyst_id', analyst['id'])\
                .execute()
            
            if calls.data:
                ticker_counts = {}
                for c in calls.data:
                    ticker_counts[c['ticker']] = ticker_counts.get(c['ticker'], 0) + 1
                ticker = max(ticker_counts, key=ticker_counts.get)
                calc.update_analyst_scores(analyst['id'], ticker)
        
        logger.info(f"✓ Calculated for {len(analysts.data)} analysts\n")
        
    except Exception as e:
        logger.error(f"Error in analyst calculations: {e}")


def run_narrative_decay():
    """
    Run decay calculations using existing decay_engine.py
    """
    logger.info("="*60)
    logger.info("NARRATIVE DECAY (via decay_engine.py)")
    logger.info("="*60)
    
    try:
        # Import and run existing decay engine
        from decay_engine import NarrativeUpdater
        
        updater = NarrativeUpdater()
        updater.run_daily_update()
        
    except Exception as e:
        logger.error(f"Error running decay engine: {e}")


def main():
    """
    Run all daily calculations
    
    1. Analyst scores (OR, NPP, HDS, Coordination) - NEW
    2. Narrative decay (t₁/₂) - Uses existing decay_engine.py
    """
    start = datetime.now()
    
    logger.info("\n" + "="*60)
    logger.info("MARKETSCHOLAR - DAILY CALCULATIONS")
    logger.info("Patent Formulas: OR, NPP, HDS, Coordination, t₁/₂")
    logger.info("="*60 + "\n")
    
    # Run analyst calculations (NEW formulas)
    calculate_all_analyst_scores()
    
    # Run decay calculations (EXISTING decay_engine.py)
    run_narrative_decay()
    
    duration = (datetime.now() - start).total_seconds()
    logger.info(f"\n✓ Complete ({duration:.1f}s)\n")


if __name__ == "__main__":
    main()
