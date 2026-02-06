"""
Analyst Credibility Tracker (UPDATED)
Implements Patent #1: Multi-Dimensional Financial Analyst Credibility Assessment

UPDATED FOR INTEGRATION:
- Works with daily_calculations.py for Page 2 formulas
- Proper article_id FK handling
- Enhanced coordination detection
- Pre-publication monitoring

This handles analyst DETECTION and TRACKING.
Formula CALCULATIONS are in daily_calculations.py.
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
import yfinance as yf
from supabase import create_client, Client
import re

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


class AnalystExtractor:
    """Extracts analyst information from articles"""
    
    ANALYST_FIRMS = [
        'Morgan Stanley', 'Goldman Sachs', 'JPMorgan', 'Bank of America',
        'Wells Fargo', 'Citi', 'Citigroup', 'Barclays', 'UBS', 'Credit Suisse',
        'Wedbush', 'Piper Sandler', 'KeyBanc', 'Oppenheimer',
        'Needham', 'Jefferies', 'Raymond James', 'Bernstein',
        'Evercore', 'Cowen', 'RBC Capital', 'Deutsche Bank', 'Mizuho',
        'Stifel', 'Loop Capital', 'Baird', 'Canaccord', 'BTIG'
    ]
    
    @staticmethod
    def extract_analyst_info(article_text: str, author: Optional[str] = None) -> Optional[Dict]:
        """
        Extract analyst name and firm from article
        
        Returns:
            {
                'name': str,
                'firm': str,
                'confidence': float  # 0-1 confidence in extraction
            }
        """
        if not article_text:
            return None
        
        text_lower = article_text.lower()
        
        # Check if article is analyst-related
        analyst_indicators = [
            'analyst', 'price target', 'rating', 'upgrade', 'downgrade',
            'maintains', 'initiates coverage', 'reiterates', 'raises target',
            'lowers target', 'overweight', 'underweight', 'outperform'
        ]
        
        if not any(indicator in text_lower for indicator in analyst_indicators):
            return None
        
        # Try to find firm
        firm_name = None
        for firm in AnalystExtractor.ANALYST_FIRMS:
            if firm.lower() in text_lower:
                firm_name = firm
                break
        
        # Try to extract analyst name (improved patterns)
        analyst_name = None
        name_patterns = [
            r'analyst\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
            r'([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(?:analyst|of|at|from)',
            r'([A-Z][a-z]+\s+[A-Z][a-z]+)\s+at\s+' + (firm_name or ''),
            r'(?:by|from)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, article_text)
            if match:
                potential_name = match.group(1)
                # Validate it's a real name (not company name)
                if potential_name not in AnalystExtractor.ANALYST_FIRMS:
                    analyst_name = potential_name
                    break
        
        # Fallback to author if looks like person name
        if not analyst_name and author:
            if ' ' in author and author[0].isupper() and len(author.split()) == 2:
                analyst_name = author
        
        # Default if we found firm but no name
        if not analyst_name and firm_name:
            analyst_name = f"{firm_name} Analyst"
        
        if analyst_name or firm_name:
            # Calculate confidence
            confidence = 0.5
            if analyst_name and analyst_name != f"{firm_name} Analyst":
                confidence += 0.3
            if firm_name:
                confidence += 0.2
            
            return {
                'name': analyst_name or 'Unknown Analyst',
                'firm': firm_name or 'Unknown Firm',
                'confidence': min(confidence, 1.0)
            }
        
        return None


class PrePublicationMonitor:
    """
    Monitors market activity before analyst publications
    Implements Patent #1: Pre-Publication Activity Detection
    """
    
    @staticmethod
    def get_pre_publication_activity(ticker: str, publish_date: datetime) -> Dict:
        """
        Get 30-day pre-publication market data
        
        Detects:
        - Volume spikes (>200% of baseline)
        - Price movements (>10%)
        - Volatility increases (>150% of baseline)
        
        Returns suspicion_score: 0-100
        """
        try:
            stock = yf.Ticker(ticker)
            
            # Get 90 days of data (60 baseline + 30 prepub)
            start_date = publish_date - timedelta(days=90)
            end_date = publish_date
            
            hist = stock.history(start=start_date, end=end_date)
            
            if hist.empty or len(hist) < 30:
                return {'has_data': False}
            
            # Split into baseline (first 60 days) and prepub (last 30 days)
            baseline_end = max(1, len(hist) - 30)
            baseline_data = hist.iloc[:baseline_end]
            prepub_data = hist.iloc[-30:]
            
            if baseline_data.empty or prepub_data.empty:
                return {'has_data': False}
            
            # Calculate baseline metrics
            baseline_volume = baseline_data['Volume'].mean()
            baseline_volatility = baseline_data['Close'].std()
            
            # Calculate prepub metrics
            prepub_volume = prepub_data['Volume'].mean()
            prepub_volatility = prepub_data['Close'].std()
            
            price_start = prepub_data['Close'].iloc[0]
            price_end = prepub_data['Close'].iloc[-1]
            price_change_pct = ((price_end - price_start) / price_start) * 100
            
            # Detect anomalies
            volume_spike = prepub_volume > (baseline_volume * 2)
            volatility_spike = prepub_volatility > (baseline_volatility * 1.5)
            significant_price_move = abs(price_change_pct) > 10
            
            # Calculate suspicion score (0-100)
            suspicion_score = 0
            
            # Volume scoring (0-40 points)
            volume_ratio = prepub_volume / baseline_volume if baseline_volume > 0 else 1
            if volume_ratio > 3.0:
                suspicion_score += 40
            elif volume_ratio > 2.0:
                suspicion_score += 30
            elif volume_ratio > 1.5:
                suspicion_score += 20
            
            # Price movement scoring (0-40 points)
            abs_price_change = abs(price_change_pct)
            if abs_price_change > 20:
                suspicion_score += 40
            elif abs_price_change > 10:
                suspicion_score += 30
            elif abs_price_change > 5:
                suspicion_score += 20
            
            # Volatility scoring (0-20 points)
            volatility_ratio = prepub_volatility / baseline_volatility if baseline_volatility > 0 else 1
            if volatility_ratio > 2.0:
                suspicion_score += 20
            elif volatility_ratio > 1.5:
                suspicion_score += 10
            
            return {
                'has_data': True,
                'baseline_volume': int(baseline_volume),
                'prepub_volume': int(prepub_volume),
                'volume_ratio': round(volume_ratio, 2),
                'current_price': float(price_end),
                'price_30d_before': float(price_start),
                'price_change_pct': round(price_change_pct, 2),
                'baseline_volatility': float(baseline_volatility),
                'prepub_volatility': float(prepub_volatility),
                'volume_spike': volume_spike,
                'volatility_spike': volatility_spike,
                'significant_price_move': significant_price_move,
                'suspicion_score': min(suspicion_score, 100)
            }
            
        except Exception as e:
            logger.error(f"Error monitoring pre-pub activity for {ticker}: {e}")
            return {'has_data': False}


class AnalystTracker:
    """
    Main class for tracking analysts and their calls
    
    This handles DETECTION and TRACKING.
    Formulas (AAR, ARB, OR, NPP, HDS, Coordination) are in daily_calculations.py
    """
    
    def __init__(self):
        self.db = supabase
        self.extractor = AnalystExtractor()
        self.pre_pub_monitor = PrePublicationMonitor()
    
    def process_analyst_article(self, article_data: Dict, analysis: Dict) -> Optional[str]:
        """
        Process article that contains analyst commentary
        
        Args:
            article_data: Must include 'article_id' for FK relationship
            analysis: OpenAI analysis results
        
        Returns:
            analyst_call_id if successful, None otherwise
        """
        try:
            # Extract analyst info from title + full_text + summary
            article_text = (
                article_data.get('title', '') + ' ' +
                article_data.get('full_text', '') + ' ' + 
                analysis.get('primaryClaim', '')
            )
            
            analyst_info = self.extractor.extract_analyst_info(
                article_text, 
                article_data.get('author')
            )
            
            if not analyst_info:
                return None
            
            # Skip if confidence too low
            if analyst_info.get('confidence', 0) < 0.3:
                return None
            
            # Get or create analyst
            analyst_id = self._get_or_create_analyst(
                analyst_info['name'],
                analyst_info['firm'],
                article_data.get('ticker', 'UNKNOWN')
            )
            
            if not analyst_id:
                return None
            
            # Get pre-publication activity
            publish_date_str = article_data.get('published_at', datetime.now().isoformat())
            if 'Z' in publish_date_str:
                publish_date_str = publish_date_str.replace('Z', '+00:00')
            publish_date = datetime.fromisoformat(publish_date_str)
            
            pre_pub_activity = self.pre_pub_monitor.get_pre_publication_activity(
                article_data.get('ticker', 'UNKNOWN'),
                publish_date
            )
            
            # Determine sentiment and call type
            sentiment = 'NEUTRAL'
            call_type = 'COMMENT'
            
            sentiment_score = article_data.get('sentiment', 0)
            if not sentiment_score:
                sentiment_score = analysis.get('sentiment', 0)
            
            if sentiment_score > 30:
                sentiment = 'BULLISH'
            elif sentiment_score < -30:
                sentiment = 'BEARISH'
            
            # Detect call type from text
            text_lower = article_text.lower()
            if 'upgrade' in text_lower:
                call_type = 'UPGRADE'
            elif 'downgrade' in text_lower:
                call_type = 'DOWNGRADE'
            elif 'price target' in text_lower or 'target price' in text_lower:
                call_type = 'PRICE_TARGET'
            elif 'initiate' in text_lower:
                call_type = 'INITIATE'
            
            # Extract price target if mentioned
            target_price = self._extract_price_target(article_text)
            
            # Prepare analyst_calls data with REQUIRED article_id FK
            call_data = {
                'analyst_id': analyst_id,
                'article_id': article_data.get('article_id'),  # ← CRITICAL FK
                'ticker': article_data.get('ticker', 'UNKNOWN'),
                'publish_datetime': publish_date.isoformat(),
                'call_type': call_type,
                'sentiment': sentiment,
                'target_price': target_price,
                'price_at_publish': pre_pub_activity.get('current_price'),
                'price_30d_before': pre_pub_activity.get('price_30d_before'),
                'volume_30d_avg': pre_pub_activity.get('baseline_volume'),
                'volume_at_publish': pre_pub_activity.get('prepub_volume'),
                'suspicion_score': pre_pub_activity.get('suspicion_score', 0),
                'outcome_status': 'PENDING',
                'directional_correct': None
            }
            
            # Save analyst call
            result = self.db.table('analyst_calls').insert(call_data).execute()
            
            if result.data:
                call_id = result.data[0]['id']
                logger.info(f"  💼 Analyst tracked: {analyst_info['name']} ({analyst_info['firm']}) on {article_data.get('ticker', 'UNKNOWN')}")
                
                # Update analyst total_calls count
                self.db.table('analysts').update({
                    'total_calls': self.db.rpc('increment_total_calls', {'analyst_id': analyst_id})
                }).eq('id', analyst_id).execute()
                
                return call_id
            
            return None
            
        except Exception as e:
            logger.error(f"Error processing analyst article: {e}")
            return None
    
    def _get_or_create_analyst(self, name: str, firm: str, ticker: str = None) -> Optional[str]:
        """
        Get existing analyst or create new one
        
        Args:
            name: Analyst name
            firm: Firm name
            ticker: Primary ticker (optional)
        """
        try:
            # Check if exists (match on name AND firm for accuracy)
            result = self.db.table('analysts').select('id').eq('name', name).eq('firm_name', firm).execute()
            
            if result.data:
                return result.data[0]['id']
            
            # Create new analyst
            new_analyst = self.db.table('analysts').insert({
                'name': name,
                'firm_name': firm,
                'ticker': ticker,
                'total_calls': 0,
                'composite_credibility_score': 50.0,  # Neutral start
                'first_seen': datetime.now().isoformat()
            }).execute()
            
            if new_analyst.data:
                analyst_id = new_analyst.data[0]['id']
                logger.info(f"  ➕ New analyst: {name} ({firm})")
                return analyst_id
            
            return None
            
        except Exception as e:
            logger.error(f"Error creating analyst {name}: {e}")
            return None
    
    def _extract_price_target(self, article_text: str) -> Optional[float]:
        """
        Extract price target from article text
        
        Looks for patterns like:
        - "price target of $150"
        - "target price to $200"
        - "raises target to $175"
        """
        try:
            # Common patterns for price targets
            patterns = [
                r'(?:price target|target price|target)\s+(?:of|to|at|raised to|lowered to)\s+\$(\d+(?:\.\d{2})?)',
                r'\$(\d+(?:\.\d{2})?)\s+(?:price target|target price)',
                r'(?:raises|lowers|maintains|sets)\s+target\s+(?:to|at)\s+\$(\d+(?:\.\d{2})?)'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, article_text, re.IGNORECASE)
                if match:
                    price = float(match.group(1))
                    # Sanity check (typical stock price range)
                    if 1 <= price <= 10000:
                        return price
            
            return None
            
        except Exception as e:
            logger.debug(f"Could not extract price target: {e}")
            return None
    
    def evaluate_analyst_calls(self, days_ago: int = 90):
        """
        Evaluate analyst calls from X days ago to determine accuracy
        
        Called periodically to update outcome_status and directional_correct
        
        This is called by a separate evaluation job, not during scraping
        """
        try:
            cutoff_date = (datetime.now() - timedelta(days=days_ago)).isoformat()
            
            # Get calls that are PENDING and old enough to evaluate
            calls = self.db.table('analyst_calls')\
                .select('*')\
                .eq('outcome_status', 'PENDING')\
                .lt('publish_datetime', cutoff_date)\
                .execute()
            
            logger.info(f"Evaluating {len(calls.data)} analyst calls from {days_ago}+ days ago")
            
            for call in calls.data:
                try:
                    ticker = call['ticker']
                    publish_date = datetime.fromisoformat(call['publish_datetime'])
                    
                    # Get price movement after publication
                    stock = yf.Ticker(ticker)
                    
                    # Get price 90 days after publish
                    end_date = publish_date + timedelta(days=90)
                    hist = stock.history(start=publish_date, end=end_date)
                    
                    if hist.empty or len(hist) < 30:
                        continue
                    
                    price_at_publish = call.get('price_at_publish', hist['Close'].iloc[0])
                    price_90d_later = hist['Close'].iloc[-1]
                    
                    price_change_pct = ((price_90d_later - price_at_publish) / price_at_publish) * 100
                    
                    # Determine if directionally correct
                    sentiment = call['sentiment']
                    directional_correct = False
                    
                    if sentiment == 'BULLISH' and price_change_pct > 5:
                        directional_correct = True
                    elif sentiment == 'BEARISH' and price_change_pct < -5:
                        directional_correct = True
                    elif sentiment == 'NEUTRAL' and abs(price_change_pct) <= 5:
                        directional_correct = True
                    
                    # Update call
                    self.db.table('analyst_calls').update({
                        'outcome_status': 'EVALUATED',
                        'directional_correct': directional_correct,
                        'price_90d_later': float(price_90d_later),
                        'evaluated_at': datetime.now().isoformat()
                    }).eq('id', call['id']).execute()
                    
                    logger.info(f"  ✓ Evaluated call {call['id']}: {ticker} {sentiment} = {'CORRECT' if directional_correct else 'INCORRECT'}")
                    
                except Exception as e:
                    logger.error(f"Error evaluating call {call.get('id')}: {e}")
                    continue
            
            logger.info(f"✓ Evaluation complete")
            
        except Exception as e:
            logger.error(f"Error in evaluate_analyst_calls: {e}")


def main():
    """
    Test analyst extraction
    """
    test_text = """
    Morgan Stanley analyst John Smith raised his price target on NVIDIA to $150, 
    maintaining an Overweight rating. The analyst believes the AI opportunity 
    remains underappreciated by the market.
    """
    
    extractor = AnalystExtractor()
    info = extractor.extract_analyst_info(test_text)
    
    if info:
        print(f"✓ Analyst detected:")
        print(f"  Name: {info['name']}")
        print(f"  Firm: {info['firm']}")
        print(f"  Confidence: {info['confidence']}")
    else:
        print("✗ No analyst found")


if __name__ == "__main__":
    main()
