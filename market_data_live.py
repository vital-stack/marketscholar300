"""
MarketScholar - Live Market Data Collector
Pulls real-time ticker info, earnings dates, and financial data from Yahoo Finance
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import yfinance as yf
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Initialize Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None


class LiveMarketDataCollector:
    """
    Comprehensive market data collector using Yahoo Finance.
    Pulls live prices, earnings dates, financials, and analyst data.
    """

    def __init__(self, supabase_client: Optional[Client] = None):
        self.db = supabase_client or supabase

    def get_live_quote(self, ticker: str) -> Dict:
        """Get real-time quote data for a ticker."""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info

            quote = {
                'ticker': ticker,
                'current_price': info.get('currentPrice') or info.get('regularMarketPrice'),
                'previous_close': info.get('previousClose'),
                'open': info.get('open') or info.get('regularMarketOpen'),
                'day_high': info.get('dayHigh') or info.get('regularMarketDayHigh'),
                'day_low': info.get('dayLow') or info.get('regularMarketDayLow'),
                'volume': info.get('volume') or info.get('regularMarketVolume'),
                'avg_volume': info.get('averageVolume'),
                'market_cap': info.get('marketCap'),
                'pe_ratio': info.get('trailingPE'),
                'forward_pe': info.get('forwardPE'),
                'eps_trailing': info.get('trailingEps'),
                'eps_forward': info.get('forwardEps'),
                'dividend_yield': info.get('dividendYield'),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh'),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow'),
                'fifty_day_avg': info.get('fiftyDayAverage'),
                'two_hundred_day_avg': info.get('twoHundredDayAverage'),
                'beta': info.get('beta'),
                'short_ratio': info.get('shortRatio'),
                'timestamp': datetime.now().isoformat()
            }

            # Calculate price change
            if quote['current_price'] and quote['previous_close']:
                quote['price_change'] = quote['current_price'] - quote['previous_close']
                quote['price_change_pct'] = (quote['price_change'] / quote['previous_close']) * 100
            else:
                quote['price_change'] = 0
                quote['price_change_pct'] = 0

            logger.info(f"✓ {ticker}: ${quote['current_price']:.2f} ({quote['price_change_pct']:+.2f}%)")
            return quote

        except Exception as e:
            logger.error(f"Error getting quote for {ticker}: {e}")
            return {'ticker': ticker, 'error': str(e)}

    def get_earnings_calendar(self, ticker: str) -> Dict:
        """Get upcoming and recent earnings dates."""
        try:
            stock = yf.Ticker(ticker)

            # Get earnings calendar
            calendar = stock.calendar
            earnings_data = {
                'ticker': ticker,
                'next_earnings_date': None,
                'earnings_dates': [],
                'timestamp': datetime.now().isoformat()
            }

            if calendar is not None and not calendar.empty:
                # Calendar contains upcoming events
                if 'Earnings Date' in calendar.index:
                    earnings_date = calendar.loc['Earnings Date']
                    if hasattr(earnings_date, 'iloc'):
                        earnings_data['next_earnings_date'] = str(earnings_date.iloc[0])
                    else:
                        earnings_data['next_earnings_date'] = str(earnings_date)

                # Get additional calendar info
                if 'Dividend Date' in calendar.index:
                    earnings_data['next_dividend_date'] = str(calendar.loc['Dividend Date'])
                if 'Ex-Dividend Date' in calendar.index:
                    earnings_data['ex_dividend_date'] = str(calendar.loc['Ex-Dividend Date'])

            # Get historical earnings dates
            try:
                earnings_dates = stock.earnings_dates
                if earnings_dates is not None and not earnings_dates.empty:
                    # Get last 4 and next 4 earnings dates
                    dates_list = []
                    for date_idx in earnings_dates.index[:8]:
                        date_info = {
                            'date': str(date_idx),
                            'eps_estimate': earnings_dates.loc[date_idx].get('EPS Estimate'),
                            'eps_actual': earnings_dates.loc[date_idx].get('Reported EPS'),
                            'surprise_pct': earnings_dates.loc[date_idx].get('Surprise(%)')
                        }
                        dates_list.append(date_info)
                    earnings_data['earnings_dates'] = dates_list
            except:
                pass

            if earnings_data['next_earnings_date']:
                logger.info(f"✓ {ticker}: Next earnings {earnings_data['next_earnings_date']}")
            else:
                logger.info(f"○ {ticker}: No upcoming earnings date found")

            return earnings_data

        except Exception as e:
            logger.error(f"Error getting earnings calendar for {ticker}: {e}")
            return {'ticker': ticker, 'error': str(e)}

    def get_earnings_history(self, ticker: str) -> Dict:
        """Get historical earnings reports with beat/miss data."""
        try:
            stock = yf.Ticker(ticker)
            earnings_data = {
                'ticker': ticker,
                'quarterly_earnings': [],
                'annual_earnings': [],
                'timestamp': datetime.now().isoformat()
            }

            # Quarterly earnings
            try:
                quarterly = stock.quarterly_earnings
                if quarterly is not None and not quarterly.empty:
                    for date_idx in quarterly.index:
                        q_data = {
                            'period': str(date_idx),
                            'revenue': float(quarterly.loc[date_idx].get('Revenue', 0)) if quarterly.loc[date_idx].get('Revenue') else None,
                            'earnings': float(quarterly.loc[date_idx].get('Earnings', 0)) if quarterly.loc[date_idx].get('Earnings') else None
                        }
                        earnings_data['quarterly_earnings'].append(q_data)
            except:
                pass

            # Annual earnings
            try:
                annual = stock.earnings
                if annual is not None and not annual.empty:
                    for date_idx in annual.index:
                        a_data = {
                            'year': str(date_idx),
                            'revenue': float(annual.loc[date_idx].get('Revenue', 0)) if annual.loc[date_idx].get('Revenue') else None,
                            'earnings': float(annual.loc[date_idx].get('Earnings', 0)) if annual.loc[date_idx].get('Earnings') else None
                        }
                        earnings_data['annual_earnings'].append(a_data)
            except:
                pass

            logger.info(f"✓ {ticker}: {len(earnings_data['quarterly_earnings'])} quarters of earnings data")
            return earnings_data

        except Exception as e:
            logger.error(f"Error getting earnings history for {ticker}: {e}")
            return {'ticker': ticker, 'error': str(e)}

    def get_analyst_recommendations(self, ticker: str) -> Dict:
        """Get analyst recommendations and price targets."""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info

            analyst_data = {
                'ticker': ticker,
                'target_high': info.get('targetHighPrice'),
                'target_low': info.get('targetLowPrice'),
                'target_mean': info.get('targetMeanPrice'),
                'target_median': info.get('targetMedianPrice'),
                'recommendation': info.get('recommendationKey'),
                'recommendation_mean': info.get('recommendationMean'),
                'num_analysts': info.get('numberOfAnalystOpinions'),
                'recommendations_history': [],
                'timestamp': datetime.now().isoformat()
            }

            # Get recommendation history
            try:
                recs = stock.recommendations
                if recs is not None and not recs.empty:
                    recent_recs = recs.tail(10)
                    for date_idx in recent_recs.index:
                        rec = {
                            'date': str(date_idx),
                            'firm': recent_recs.loc[date_idx].get('Firm'),
                            'to_grade': recent_recs.loc[date_idx].get('To Grade'),
                            'from_grade': recent_recs.loc[date_idx].get('From Grade'),
                            'action': recent_recs.loc[date_idx].get('Action')
                        }
                        analyst_data['recommendations_history'].append(rec)
            except:
                pass

            if analyst_data['target_mean']:
                current = info.get('currentPrice', 0)
                upside = ((analyst_data['target_mean'] - current) / current * 100) if current else 0
                logger.info(f"✓ {ticker}: Target ${analyst_data['target_mean']:.2f} ({upside:+.1f}% upside), {analyst_data['num_analysts']} analysts")
            else:
                logger.info(f"○ {ticker}: No analyst targets found")

            return analyst_data

        except Exception as e:
            logger.error(f"Error getting analyst data for {ticker}: {e}")
            return {'ticker': ticker, 'error': str(e)}

    def get_financials_summary(self, ticker: str) -> Dict:
        """Get key financial metrics from latest reports."""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info

            financials = {
                'ticker': ticker,
                # Profitability
                'gross_margin': info.get('grossMargins'),
                'operating_margin': info.get('operatingMargins'),
                'profit_margin': info.get('profitMargins'),
                'return_on_equity': info.get('returnOnEquity'),
                'return_on_assets': info.get('returnOnAssets'),
                # Growth
                'revenue_growth': info.get('revenueGrowth'),
                'earnings_growth': info.get('earningsGrowth'),
                'earnings_quarterly_growth': info.get('earningsQuarterlyGrowth'),
                # Valuation
                'enterprise_value': info.get('enterpriseValue'),
                'ev_to_revenue': info.get('enterpriseToRevenue'),
                'ev_to_ebitda': info.get('enterpriseToEbitda'),
                'price_to_book': info.get('priceToBook'),
                'price_to_sales': info.get('priceToSalesTrailing12Months'),
                # Balance sheet
                'total_cash': info.get('totalCash'),
                'total_debt': info.get('totalDebt'),
                'debt_to_equity': info.get('debtToEquity'),
                'current_ratio': info.get('currentRatio'),
                'quick_ratio': info.get('quickRatio'),
                # Revenue
                'total_revenue': info.get('totalRevenue'),
                'revenue_per_share': info.get('revenuePerShare'),
                # Earnings
                'ebitda': info.get('ebitda'),
                'free_cash_flow': info.get('freeCashflow'),
                'operating_cash_flow': info.get('operatingCashflow'),
                'timestamp': datetime.now().isoformat()
            }

            logger.info(f"✓ {ticker}: Revenue ${financials['total_revenue']:,.0f}" if financials['total_revenue'] else f"○ {ticker}: Limited financial data")
            return financials

        except Exception as e:
            logger.error(f"Error getting financials for {ticker}: {e}")
            return {'ticker': ticker, 'error': str(e)}

    def get_complete_ticker_data(self, ticker: str) -> Dict:
        """Get all available data for a ticker in one call."""
        logger.info(f"\n{'='*50}")
        logger.info(f"Fetching complete data for {ticker}")
        logger.info(f"{'='*50}")

        return {
            'ticker': ticker,
            'quote': self.get_live_quote(ticker),
            'earnings_calendar': self.get_earnings_calendar(ticker),
            'earnings_history': self.get_earnings_history(ticker),
            'analyst_recommendations': self.get_analyst_recommendations(ticker),
            'financials': self.get_financials_summary(ticker),
            'fetched_at': datetime.now().isoformat()
        }

    def save_ticker_snapshot(self, ticker: str) -> Optional[str]:
        """Fetch all data and save to Supabase ticker_snapshots table."""
        if not self.db:
            logger.warning("No database connection")
            return None

        try:
            data = self.get_complete_ticker_data(ticker)

            # Save to ticker_snapshots table
            snapshot = {
                'ticker': ticker,
                'snapshot_date': datetime.now().date().isoformat(),
                'current_price': data['quote'].get('current_price'),
                'price_change_pct': data['quote'].get('price_change_pct'),
                'volume': data['quote'].get('volume'),
                'market_cap': data['quote'].get('market_cap'),
                'pe_ratio': data['quote'].get('pe_ratio'),
                'eps_trailing': data['quote'].get('eps_trailing'),
                'next_earnings_date': data['earnings_calendar'].get('next_earnings_date'),
                'analyst_target_mean': data['analyst_recommendations'].get('target_mean'),
                'analyst_recommendation': data['analyst_recommendations'].get('recommendation'),
                'num_analysts': data['analyst_recommendations'].get('num_analysts'),
                'revenue_growth': data['financials'].get('revenue_growth'),
                'profit_margin': data['financials'].get('profit_margin'),
                'full_data': data,  # Store complete JSON
                'created_at': datetime.now().isoformat()
            }

            result = self.db.table('ticker_snapshots').upsert(
                snapshot,
                on_conflict='ticker,snapshot_date'
            ).execute()

            if result.data:
                logger.info(f"✓ Saved snapshot for {ticker}")
                return result.data[0]['id']

        except Exception as e:
            logger.error(f"Error saving snapshot for {ticker}: {e}")

        return None


def update_all_tickers(tickers: List[str]) -> Dict:
    """Update market data for all tickers."""
    collector = LiveMarketDataCollector()
    results = {'success': 0, 'failed': 0, 'tickers': {}}

    for ticker in tickers:
        try:
            data = collector.get_complete_ticker_data(ticker)
            results['tickers'][ticker] = {
                'price': data['quote'].get('current_price'),
                'next_earnings': data['earnings_calendar'].get('next_earnings_date'),
                'target': data['analyst_recommendations'].get('target_mean')
            }
            results['success'] += 1
        except Exception as e:
            results['tickers'][ticker] = {'error': str(e)}
            results['failed'] += 1

    return results


# SQL Schema for ticker_snapshots table
TICKER_SNAPSHOTS_SQL = """
-- Ticker Snapshots Table
-- Stores daily snapshots of live market data

CREATE TABLE IF NOT EXISTS ticker_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Price data
    current_price NUMERIC(12,2),
    price_change_pct NUMERIC(8,4),
    volume BIGINT,
    market_cap BIGINT,

    -- Valuation
    pe_ratio NUMERIC(10,2),
    eps_trailing NUMERIC(10,2),

    -- Earnings
    next_earnings_date TEXT,

    -- Analyst data
    analyst_target_mean NUMERIC(12,2),
    analyst_recommendation VARCHAR(20),
    num_analysts INTEGER,

    -- Financials
    revenue_growth NUMERIC(8,4),
    profit_margin NUMERIC(8,4),

    -- Full JSON data
    full_data JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(ticker, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_ticker_snapshots_ticker ON ticker_snapshots(ticker);
CREATE INDEX IF NOT EXISTS idx_ticker_snapshots_date ON ticker_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_ticker_snapshots_earnings ON ticker_snapshots(next_earnings_date);

ALTER TABLE ticker_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON ticker_snapshots FOR ALL USING (true);
"""


if __name__ == "__main__":
    # Test with a few tickers
    logging.basicConfig(level=logging.INFO)
    collector = LiveMarketDataCollector()

    test_tickers = ['NVDA', 'AAPL', 'TSLA']
    for ticker in test_tickers:
        data = collector.get_complete_ticker_data(ticker)
        print(f"\n{ticker} Summary:")
        print(f"  Price: ${data['quote'].get('current_price', 'N/A')}")
        print(f"  Next Earnings: {data['earnings_calendar'].get('next_earnings_date', 'N/A')}")
        print(f"  Analyst Target: ${data['analyst_recommendations'].get('target_mean', 'N/A')}")
        print(f"  Revenue Growth: {data['financials'].get('revenue_growth', 'N/A')}")
