"""
Narrative Decay Engine (UPDATED)
Implements Patent #2 - Narrative Lifecycle Tracking with Decay Monitoring

UPDATED: Now uses narrative_snapshots table (matches marketscholar_scraper.py)

This module:
1. Calculates narrative decay rate and half-life (t₁/₂ = ln(2) / λ)
2. Predicts narrative exhaustion dates
3. Classifies narrative status (ACTIVE, EXHAUSTED, FAILED, VALIDATED)
4. Updates narrative metrics daily
"""

import os
import math
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, List
import numpy as np
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not all([SUPABASE_URL, SUPABASE_KEY]):
    raise ValueError("Missing Supabase credentials")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


class NarrativeDecayEngine:
    """
    Calculates and tracks narrative decay metrics
    Patent #2 Claim 1: Narrative Decay Monitoring System
    
    PATENT FORMULA FROM PAGE 2:
    t₁/₂ = ln(2) / λ
    """
    
    def __init__(self, narrative_id: str, initial_sentiment: float, 
                 initial_price: float, genesis_date: datetime):
        self.narrative_id = narrative_id
        self.s0 = initial_sentiment  # Initial sentiment
        self.p0 = initial_price       # Initial price
        self.t0 = genesis_date        # Genesis timestamp
        
        self.sentiment_history = [initial_sentiment]
        self.price_history = [initial_price]
        self.dates = [genesis_date]
    
    def add_datapoint(self, sentiment: float, price: float, date: datetime):
        """Add new daily datapoint for tracking"""
        self.sentiment_history.append(sentiment)
        self.price_history.append(price)
        self.dates.append(date)
    
    def calculate_decay_rate(self) -> float:
        """
        Calculate daily decay rate
        decay_rate = (S₀ - Sₙ) / n (percentage points per day)
        
        This is λ (lambda) in the Page 2 formula
        """
        if len(self.sentiment_history) < 2:
            return 0.0
        
        current_sentiment = self.sentiment_history[-1]
        days_elapsed = len(self.sentiment_history) - 1
        
        decay_rate = (self.s0 - current_sentiment) / max(days_elapsed, 1)
        return round(decay_rate, 4)
    
    def calculate_half_life(self) -> Optional[float]:
        """
        Calculate narrative half-life (days to 50% sentiment decay)
        
        PATENT FORMULA FROM PAGE 2:
        t₁/₂ = ln(2) / λ
        
        Where λ = -ln(Sₙ/S₀) / n
        
        Case Study Example (DeepSeek narrative):
        - λ established from first 7 days
        - Output: t₁/₂ = 12.5 Days
        """
        if len(self.sentiment_history) < 2:
            return None
        
        current_sentiment = self.sentiment_history[-1]
        days_elapsed = len(self.sentiment_history) - 1
        
        if current_sentiment <= 0 or self.s0 <= 0:
            return None
        
        try:
            # Calculate decay constant λ
            lambda_const = -math.log(current_sentiment / self.s0) / days_elapsed
            
            if lambda_const <= 0:
                return None
            
            # PATENT FORMULA: t₁/₂ = ln(2) / λ
            half_life = math.log(2) / lambda_const
            return round(half_life, 2)
            
        except (ValueError, ZeroDivisionError):
            return None
    
    def calculate_price_correlation(self) -> Optional[float]:
        """
        Calculate Pearson correlation between sentiment and price
        Patent #2 Claim 1: Price Correlation Analysis
        """
        if len(self.sentiment_history) < 3:
            return None
        
        try:
            correlation = np.corrcoef(self.sentiment_history, self.price_history)[0, 1]
            return round(float(correlation), 4)
        except Exception as e:
            logger.error(f"Error calculating correlation: {e}")
            return None
    
    def predict_exhaustion_date(self) -> Optional[datetime]:
        """
        Predict when narrative will be exhausted (sentiment < 20)
        Patent #2 Claim 3: Narrative Exhaustion Detection
        """
        decay_rate = self.calculate_decay_rate()
        
        if decay_rate <= 0:
            return None
        
        current_sentiment = self.sentiment_history[-1]
        
        # Days until sentiment reaches 20 (exhaustion threshold)
        days_to_exhaustion = (current_sentiment - 20) / decay_rate
        
        if days_to_exhaustion <= 0:
            return self.t0  # Already exhausted
        
        exhaustion_date = self.dates[-1] + timedelta(days=days_to_exhaustion)
        return exhaustion_date
    
    def classify_status(self) -> str:
        """
        Classify narrative status based on metrics
        Patent #2 Claim 1: Status Classification
        
        Returns: ACTIVE, EXHAUSTED, FAILED, or VALIDATED
        """
        current_sentiment = self.sentiment_history[-1]
        days_elapsed = len(self.sentiment_history) - 1
        
        # EXHAUSTED: Sentiment depleted
        if current_sentiment < 20:
            return "EXHAUSTED"
        
        # FAILED: Sentiment down but price up (narrative was wrong)
        correlation = self.calculate_price_correlation()
        if correlation is not None and correlation < -0.5:
            return "FAILED"
        
        # VALIDATED: Strong correlation and sustained high sentiment
        if correlation is not None and correlation > 0.7 and current_sentiment > 70 and days_elapsed > 30:
            return "VALIDATED"
        
        # ACTIVE: Still playing out
        return "ACTIVE"
    
    def calculate_exhaustion_confidence(self) -> int:
        """
        Calculate confidence score that narrative is exhausted
        Patent #2 Claim 3: Exhaustion Detection
        
        Returns: Score from 0-100
        """
        score = 0
        
        current_sentiment = self.sentiment_history[-1]
        
        # Factor 1: Sentiment depletion (30 points)
        if current_sentiment < 20:
            score += 30
        elif current_sentiment < 40:
            score += 15
        
        # Factor 2: Decay acceleration (25 points)
        if len(self.sentiment_history) >= 14:
            recent_decay = (self.sentiment_history[-7] - current_sentiment) / 7
            prior_decay = (self.sentiment_history[-14] - self.sentiment_history[-7]) / 7
            
            if recent_decay > prior_decay * 2:
                score += 25
            elif recent_decay > prior_decay * 1.5:
                score += 15
        
        # Factor 3: Price decoupling (20 points)
        correlation = self.calculate_price_correlation()
        if correlation is not None:
            if abs(correlation) < 0.2:
                score += 20
            elif abs(correlation) < 0.4:
                score += 10
        
        # Factor 4: Low volatility (15 points)
        if len(self.sentiment_history) >= 7:
            recent_volatility = np.std(self.sentiment_history[-7:])
            if recent_volatility < 5:
                score += 15
            elif recent_volatility < 10:
                score += 8
        
        # Factor 5: Extended duration (10 points)
        days_elapsed = len(self.sentiment_history) - 1
        if days_elapsed > 60:
            score += 10
        elif days_elapsed > 40:
            score += 5
        
        return min(score, 100)
    
    def get_metrics(self) -> Dict:
        """Get all decay metrics for this narrative"""
        return {
            'decay_rate': self.calculate_decay_rate(),
            'half_life': self.calculate_half_life(),
            'price_correlation': self.calculate_price_correlation(),
            'status': self.classify_status(),
            'exhaustion_confidence': self.calculate_exhaustion_confidence(),
            'predicted_exhaustion_date': self.predict_exhaustion_date(),
            'days_elapsed': len(self.sentiment_history) - 1,
            'current_sentiment': self.sentiment_history[-1],
            'sentiment_change': self.sentiment_history[-1] - self.s0
        }


class FairValueCalculator:
    """
    Calculates fair value stress and narrative premium
    Patent #2 Claim 2: Fair Value Stress Testing System
    
    PATENT FORMULA FROM PAGE 2:
    NPP = (IP - FV) / FV × 100
    """
    
    @staticmethod
    def calculate_implied_valuation(narrative_data: Dict, market_data: Dict) -> Dict:
        """
        Calculate what the stock price would be if narrative is 100% accurate
        Patent #2 Claim 2
        
        Case Study Example (NVIDIA):
        - Fair Value (FV): $128
        - Implied Price (IP): $95
        - NPP = (95 - 128) / 128 × 100 = -26% (Overcorrection)
        """
        try:
            current_price = market_data.get('current_price', 0)
            current_eps = market_data.get('current_eps', 0)
            
            if current_eps <= 0:
                return {'error': 'Invalid EPS data'}
            
            # Calculate current P/E
            current_pe = current_price / current_eps
            
            # Extract narrative impact (if available)
            eps_impact_pct = narrative_data.get('eps_impact_pct', 0)
            
            # Calculate implied EPS
            implied_eps = current_eps * (1 + eps_impact_pct / 100)
            
            # Use narrative-specified P/E or assume current multiple
            implied_pe = narrative_data.get('implied_pe', current_pe)
            
            # Calculate implied price
            implied_price = implied_eps * implied_pe
            
            # PATENT FORMULA: NPP = (IP - FV) / FV × 100
            narrative_premium_pct = ((implied_price - current_price) / current_price) * 100
            
            # Get historical P/E context
            pe_history = market_data.get('pe_history', [])
            if pe_history:
                historical_median_pe = np.median(pe_history)
                fair_value = current_eps * historical_median_pe
                implied_pe_percentile = sum(1 for pe in pe_history if pe < implied_pe) / len(pe_history) * 100
            else:
                fair_value = current_price
                historical_median_pe = current_pe
                implied_pe_percentile = 50
            
            # Classify valuation (from Page 2)
            if narrative_premium_pct > 25:
                conclusion = "PRICED_FOR_PERFECTION"
            elif narrative_premium_pct > 10:
                conclusion = "MODERATE_PREMIUM"
            elif narrative_premium_pct > -10:
                conclusion = "FAIRLY_VALUED"
            else:
                conclusion = "OVERCORRECTION"  # Like NVIDIA at -26%
            
            return {
                'current_price': current_price,
                'implied_price': round(implied_price, 2),
                'fair_value': round(fair_value, 2),
                'narrative_premium_pct': round(narrative_premium_pct, 2),
                'current_pe': round(current_pe, 2),
                'implied_pe': round(implied_pe, 2),
                'historical_median_pe': round(historical_median_pe, 2),
                'implied_pe_percentile': round(implied_pe_percentile, 1),
                'conclusion': conclusion
            }
            
        except Exception as e:
            logger.error(f"Error calculating fair value: {e}")
            return {'error': str(e)}


class NarrativeUpdater:
    """
    Updates narrative metrics in the database daily
    
    UPDATED: Now uses narrative_snapshots table (created by scraper)
    """
    
    def __init__(self):
        self.db = supabase
    
    def get_active_narratives(self) -> List[Dict]:
        """Fetch all active narratives that need updating"""
        try:
            result = self.db.table('narratives').select('*').in_(
                'status', ['ACTIVE', 'PENDING']
            ).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error fetching narratives: {e}")
            return []
    
    def get_narrative_snapshots(self, narrative_id: str) -> List[Dict]:
        """
        Get all daily snapshots for a narrative
        
        UPDATED: Uses narrative_snapshots table (created by marketscholar_scraper.py)
        """
        try:
            # Use the table created by scraper
            result = self.db.table('narrative_snapshots').select('*').eq(
                'narrative_id', narrative_id
            ).order('snapshot_date').execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error fetching snapshots: {e}")
            return []
    
    def update_narrative_metrics(self, narrative_id: str):
        """Calculate and update all metrics for a narrative"""
        try:
            # Fetch narrative
            narrative_result = self.db.table('narratives').select('*').eq('id', narrative_id).execute()
            
            if not narrative_result.data:
                logger.warning(f"Narrative {narrative_id} not found")
                return
            
            narrative = narrative_result.data[0]
            
            # Fetch all snapshots
            snapshots = self.get_narrative_snapshots(narrative_id)
            
            if len(snapshots) < 2:
                logger.info(f"  {narrative.get('ticker', 'Unknown')}: Need more data (only {len(snapshots)} snapshot)")
                return
            
            # Initialize decay engine
            engine = NarrativeDecayEngine(
                narrative_id=narrative_id,
                initial_sentiment=narrative['initial_sentiment'],
                initial_price=narrative.get('initial_price', 0),
                genesis_date=datetime.fromisoformat(narrative['genesis_date'])
            )
            
            # Add all datapoints
            for snapshot in snapshots[1:]:  # Skip first (already in constructor)
                engine.add_datapoint(
                    sentiment=snapshot['sentiment'],
                    price=snapshot.get('price', 0),
                    date=datetime.fromisoformat(snapshot['snapshot_date'])
                )
            
            # Calculate metrics
            metrics = engine.get_metrics()
            
            # Update narratives table
            update_data = {
                'current_sentiment': metrics['current_sentiment'],
                'status': metrics['status'],
                'days_elapsed': metrics['days_elapsed'],
                'updated_at': datetime.now().isoformat()
            }
            
            self.db.table('narratives').update(update_data).eq('id', narrative_id).execute()
            
            # Save to narrative_decay_metrics table
            self.db.table('narrative_decay_metrics').upsert({
                'narrative_id': narrative_id,
                'initial_sentiment': narrative['initial_sentiment'],
                'current_sentiment': metrics['current_sentiment'],
                'decay_rate': metrics['decay_rate'],
                'half_life_days': metrics['half_life'],
                'days_until_exhaustion': (metrics['predicted_exhaustion_date'] - datetime.now()).days if metrics['predicted_exhaustion_date'] else None,
                'status': metrics['status'],
                'last_calculated': datetime.now().isoformat()
            }, on_conflict='narrative_id').execute()
            
            # Update snapshot decay percentages
            if metrics['half_life']:
                for snapshot in snapshots:
                    if narrative['initial_sentiment'] != 0:
                        decay_pct = ((narrative['initial_sentiment'] - snapshot['sentiment']) / narrative['initial_sentiment']) * 100
                        
                        self.db.table('narrative_snapshots')\
                            .update({'sentiment_decay_pct': round(decay_pct, 2)})\
                            .eq('id', snapshot['id'])\
                            .execute()
            
            logger.info(f"  ✓ {narrative.get('ticker', 'Unknown')}: t₁/₂={metrics['half_life']} days, λ={metrics['decay_rate']:.4f}, status={metrics['status']}")
            
        except Exception as e:
            logger.error(f"Error updating narrative {narrative_id}: {e}")
    
    def run_daily_update(self):
        """
        Update all active narratives
        
        Called by daily_calculations.py
        """
        logger.info("="*60)
        logger.info("NARRATIVE DECAY (t₁/₂ from Page 2)")
        logger.info("="*60)
        
        narratives = self.get_active_narratives()
        logger.info(f"Found {len(narratives)} active narratives")
        
        for narrative in narratives:
            try:
                self.update_narrative_metrics(narrative['id'])
            except Exception as e:
                logger.error(f"Error processing narrative {narrative['id']}: {e}")
        
        logger.info(f"✓ Decay calculated for {len(narratives)} narratives\n")


def main():
    """Main entry point for decay monitoring"""
    try:
        updater = NarrativeUpdater()
        updater.run_daily_update()
        exit(0)
    except Exception as e:
        logger.critical(f"Fatal error: {e}")
        exit(1)


if __name__ == "__main__":
    main()
