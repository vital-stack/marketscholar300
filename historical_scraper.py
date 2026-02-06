"""
MarketScholar Historical Scraper
Scrapes articles from past dates to populate database and identify patterns
"""

import os
import time
from datetime import datetime, timedelta
from typing import List, Dict
import requests
from marketscholar_scraper import MarketScholarScraper, TOP_STOCKS

NEWSAPI_KEY = os.getenv('NEWSAPI_API_KEY')


class HistoricalScraper:
    """Scrape articles from specific date ranges in the past"""
    
    def __init__(self):
        self.scraper = MarketScholarScraper()
        self.newsapi_key = NEWSAPI_KEY
        self.base_url = "https://newsapi.org/v2/everything"
    
    def scrape_date_range(self, start_date: str, end_date: str, tickers: List[str] = None):
        """
        Scrape articles for a specific date range
        
        Args:
            start_date: Format 'YYYY-MM-DD' (e.g., '2025-01-01')
            end_date: Format 'YYYY-MM-DD' (e.g., '2025-01-30')
            tickers: List of tickers to scrape (default: all)
        """
        print(f"\n{'='*70}")
        print(f"HISTORICAL SCRAPE: {start_date} to {end_date}")
        print(f"{'='*70}\n")
        
        # Get tickers to process
        stocks_to_process = TOP_STOCKS if not tickers else {k: v for k, v in TOP_STOCKS.items() if k in tickers}
        
        total_articles = 0
        
        for ticker, stock_info in stocks_to_process.items():
            print(f"\n{'='*60}")
            print(f"Processing {ticker} ({stock_info['name']}) for {start_date} to {end_date}")
            print(f"{'='*60}")
            
            try:
                # Search NewsAPI for this date range
                articles = self._search_historical(ticker, stock_info, start_date, end_date)
                
                if not articles:
                    print(f"No articles found for {ticker} in this date range")
                    continue
                
                print(f"Found {len(articles)} articles")
                
                # Process each article (reuse existing scraper logic)
                for idx, article in enumerate(articles, 1):
                    try:
                        print(f"  [{idx}/{len(articles)}] {article['title'][:80]}")
                        
                        # Extract content
                        content = article.get('description') or self.scraper.extractor.extract_content(article['url'])
                        
                        if not content or len(content) < 100:
                            print(f"    ⚠ Insufficient content")
                            continue
                        
                        # Analyze with OpenAI
                        analysis = self.scraper.analyzer.analyze_article(content, ticker, article.get('title'))
                        if not analysis:
                            print(f"    ⚠ Analysis failed")
                            continue
                        
                        # Get market data for this historical date
                        publish_date = datetime.fromisoformat(article['publishedAt'].replace('Z', '+00:00'))
                        market_data = self.scraper.market_data.get_pre_publication_data(ticker)
                        
                        # Save article
                        article_data = {
                            'ticker': ticker,
                            'url': article['url'],
                            'title': article.get('title'),
                            'author': analysis.get('author'),
                            'publication_name': article.get('source', {}).get('name'),
                            'content_summary': analysis.get('narrativeName'),
                            'full_text': content[:1000],
                            'sentiment': analysis.get('sentiment', 0),
                            'published_at': article['publishedAt']
                        }
                        
                        article_id = self.scraper.db.save_article(article_data)
                        
                        if article_id:
                            # Track narrative
                            narrative_data = {
                                'ticker': ticker,
                                'narrative_name': analysis.get('narrativeName', 'Unknown'),
                                'narrative_text': analysis.get('primaryClaim'),
                                'initial_sentiment': analysis.get('sentiment', 0),
                                'current_sentiment': analysis.get('sentiment', 0),
                                'initial_price': market_data.get('current_price'),
                                'initial_volume': market_data.get('recent_volume'),
                                'current_price': market_data.get('current_price'),
                                'days_elapsed': 0,
                                'genesis_date': article['publishedAt']
                            }
                            
                            self.scraper.db.create_or_update_narrative(narrative_data)
                            
                            # Track analyst if present
                            try:
                                article_data_full = article_data.copy()
                                article_data_full['full_text'] = content
                                article_data_full['title'] = article.get('title', '')
                                
                                analyst_call_id = self.scraper.analyst_tracker.process_analyst_article(
                                    article_data_full,
                                    analysis
                                )
                                if analyst_call_id:
                                    print(f"    💼 Analyst tracked!")
                            except Exception as e:
                                pass  # Not an analyst article
                            
                            total_articles += 1
                            print(f"    ✓ Saved (sentiment: {analysis.get('sentiment')})")
                        
                        time.sleep(1)  # Rate limiting
                        
                    except Exception as e:
                        print(f"    ✗ Error: {e}")
                        continue
                
                time.sleep(2)  # Delay between tickers
                
            except Exception as e:
                print(f"Error processing {ticker}: {e}")
                continue
        
        print(f"\n{'='*70}")
        print(f"HISTORICAL SCRAPE COMPLETE")
        print(f"Total articles saved: {total_articles}")
        print(f"{'='*70}\n")
        
        return total_articles
    
    def _search_historical(self, ticker: str, stock_info: Dict, start_date: str, end_date: str, max_results: int = 10):
        """Search NewsAPI for articles in date range"""
        try:
            company_name = stock_info['name']
            
            params = {
                'q': f'({company_name} OR {ticker}) AND (stock OR earnings OR revenue)',
                'language': 'en',
                'sortBy': 'publishedAt',
                'pageSize': max_results,
                'from': start_date,
                'to': end_date,
                'apiKey': self.newsapi_key
            }
            
            response = requests.get(self.base_url, params=params, timeout=15)
            
            if response.status_code != 200:
                print(f"  NewsAPI error: {response.status_code}")
                return []
            
            data = response.json()
            
            if data['status'] != 'ok':
                return []
            
            articles = []
            for article in data.get('articles', []):
                if article.get('title') == '[Removed]' or not article.get('url'):
                    continue
                
                articles.append({
                    'url': article['url'],
                    'title': article['title'],
                    'description': article.get('description', ''),
                    'publishedAt': article['publishedAt'],
                    'source': article['source']['name'],
                    'ticker': ticker,
                    'company_name': company_name
                })
            
            return articles
            
        except Exception as e:
            print(f"  Search error: {e}")
            return []


def main():
    """Run historical scrape"""
    
    print("\n" + "="*70)
    print("MARKETSCHOLAR HISTORICAL SCRAPER")
    print("="*70)
    
    # Example: Scrape last 30 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')
    
    # You can also specify specific date ranges
    # start_str = '2025-01-01'
    # end_str = '2025-01-30'
    
    scraper = HistoricalScraper()
    
    # Scrape all tickers for the date range
    scraper.scrape_date_range(start_str, end_str)
    
    # Or scrape specific tickers
    # scraper.scrape_date_range(start_str, end_str, tickers=['NVDA', 'AAPL', 'TSLA'])


if __name__ == "__main__":
    main()
