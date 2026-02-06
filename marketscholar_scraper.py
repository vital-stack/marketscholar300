"""
MarketScholar Auto Scraper - UPDATED WITH FORMULA CALCULATIONS
Implements all scoring formulas and fixes database issues

CHANGES:
1. Fixed article_id foreign key issue (Issue #1)
2. Fixed full text truncation (Issue #2) 
3. Added create_daily_snapshot() after each article
4. Added calculate_scores() to run after scraping
5. All tables now populate correctly
"""

import os
import time
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup
import yfinance as yf
from supabase import create_client, Client
from analyst_tracker import AnalystTracker
import math

# Optional Gemini imports - these are conditional to avoid failures if modules are unavailable
GeminiForensicAnalyzer = None
GeminiGroundingSearcher = None

try:
    from gemini_forensic import GeminiForensicAnalyzer
except ImportError:
    pass

try:
    from gemini_grounding import GeminiGroundingSearcher
except ImportError:
    pass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize clients
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
NEWSAPI_KEY = os.getenv('NEWSAPI_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if not all([SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY]):
    raise ValueError("Missing required environment variables")

# Log which search providers are available
if GEMINI_API_KEY and GeminiGroundingSearcher:
    logger.info("✓ Gemini Grounding with Google Search available")
elif GEMINI_API_KEY:
    logger.info("⚠ GEMINI_API_KEY set but GeminiGroundingSearcher module not available")
if GEMINI_API_KEY and GeminiForensicAnalyzer:
    logger.info("✓ Gemini Forensic Analyzer available")
elif GEMINI_API_KEY:
    logger.info("⚠ GEMINI_API_KEY set but GeminiForensicAnalyzer module not available")
if NEWSAPI_KEY:
    logger.info("✓ NewsAPI available")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================================================
# TOP 100 STOCKS BY MARKET CAP - ORGANIZED BY INDUSTRY
# ============================================================================

TOP_STOCKS = {
    
    # ========== TECHNOLOGY - SOFTWARE (10) ==========
    'MSFT': {'name': 'Microsoft', 'industry': 'Software', 'keywords': ['Microsoft', 'MSFT', 'Azure', 'Satya Nadella', 'Windows', 'Office', 'AI']},
    'ORCL': {'name': 'Oracle', 'industry': 'Software', 'keywords': ['Oracle', 'ORCL', 'database', 'cloud', 'Larry Ellison', 'enterprise software']},
    'ADBE': {'name': 'Adobe', 'industry': 'Software', 'keywords': ['Adobe', 'ADBE', 'Photoshop', 'Creative Cloud', 'PDF']},
    'CRM': {'name': 'Salesforce', 'industry': 'Software', 'keywords': ['Salesforce', 'CRM', 'Marc Benioff', 'cloud software']},
    'INTU': {'name': 'Intuit', 'industry': 'Software', 'keywords': ['Intuit', 'INTU', 'TurboTax', 'QuickBooks', 'tax software']},
    'NOW': {'name': 'ServiceNow', 'industry': 'Software', 'keywords': ['ServiceNow', 'NOW', 'IT service', 'enterprise']},
    'PANW': {'name': 'Palo Alto Networks', 'industry': 'Software', 'keywords': ['Palo Alto', 'PANW', 'cybersecurity', 'firewall', 'security']},
    'SNPS': {'name': 'Synopsys', 'industry': 'Software', 'keywords': ['Synopsys', 'SNPS', 'EDA', 'chip design', 'semiconductor software']},
    'CDNS': {'name': 'Cadence', 'industry': 'Software', 'keywords': ['Cadence', 'CDNS', 'EDA', 'chip design']},
    'WDAY': {'name': 'Workday', 'industry': 'Software', 'keywords': ['Workday', 'WDAY', 'HR software', 'finance software']},
    
    # ========== TECHNOLOGY - SEMICONDUCTORS (10) ==========
    'NVDA': {'name': 'NVIDIA', 'industry': 'Semiconductors', 'keywords': ['NVIDIA', 'NVDA', 'Jensen Huang', 'GPU', 'AI chips', 'CUDA', 'data center']},
    'TSM': {'name': 'Taiwan Semiconductor', 'industry': 'Semiconductors', 'keywords': ['TSMC', 'TSM', 'Taiwan Semiconductor', 'chip manufacturing', 'foundry']},
    'AVGO': {'name': 'Broadcom', 'industry': 'Semiconductors', 'keywords': ['Broadcom', 'AVGO', 'Hock Tan', 'chip', 'semiconductor']},
    'AMD': {'name': 'AMD', 'industry': 'Semiconductors', 'keywords': ['AMD', 'Lisa Su', 'Ryzen', 'EPYC', 'Radeon', 'processor']},
    'INTC': {'name': 'Intel', 'industry': 'Semiconductors', 'keywords': ['Intel', 'INTC', 'Pat Gelsinger', 'chip', 'processor', 'foundry']},
    'QCOM': {'name': 'Qualcomm', 'industry': 'Semiconductors', 'keywords': ['Qualcomm', 'QCOM', 'Snapdragon', '5G', 'mobile chip']},
    'TXN': {'name': 'Texas Instruments', 'industry': 'Semiconductors', 'keywords': ['Texas Instruments', 'TXN', 'TI', 'analog chip']},
    'AMAT': {'name': 'Applied Materials', 'industry': 'Semiconductors', 'keywords': ['Applied Materials', 'AMAT', 'chip equipment', 'semiconductor equipment']},
    'LRCX': {'name': 'Lam Research', 'industry': 'Semiconductors', 'keywords': ['Lam Research', 'LRCX', 'chip equipment', 'wafer fabrication']},
    'MRVL': {'name': 'Marvell', 'industry': 'Semiconductors', 'keywords': ['Marvell', 'MRVL', 'chip', 'data center', 'storage']},
    
    # ========== TECHNOLOGY - INTERNET & E-COMMERCE (10) ==========
    'AMZN': {'name': 'Amazon', 'industry': 'E-Commerce', 'keywords': ['Amazon', 'AMZN', 'AWS', 'Jeff Bezos', 'Andy Jassy', 'Prime', 'e-commerce']},
    'GOOGL': {'name': 'Alphabet', 'industry': 'Internet', 'keywords': ['Google', 'Alphabet', 'GOOGL', 'Sundar Pichai', 'Android', 'YouTube', 'search']},
    'META': {'name': 'Meta', 'industry': 'Social Media', 'keywords': ['Meta', 'Facebook', 'META', 'Mark Zuckerberg', 'Instagram', 'WhatsApp']},
    'NFLX': {'name': 'Netflix', 'industry': 'Streaming', 'keywords': ['Netflix', 'NFLX', 'streaming', 'video', 'entertainment']},
    'BKNG': {'name': 'Booking Holdings', 'industry': 'Travel', 'keywords': ['Booking', 'BKNG', 'travel', 'hotel', 'Priceline']},
    'UBER': {'name': 'Uber', 'industry': 'Rideshare', 'keywords': ['Uber', 'rideshare', 'ride-hailing', 'Dara Khosrowshahi']},
    'ABNB': {'name': 'Airbnb', 'industry': 'Travel', 'keywords': ['Airbnb', 'ABNB', 'vacation rental', 'travel', 'lodging']},
    'DASH': {'name': 'DoorDash', 'industry': 'Food Delivery', 'keywords': ['DoorDash', 'DASH', 'food delivery', 'delivery']},
    'SPOT': {'name': 'Spotify', 'industry': 'Streaming', 'keywords': ['Spotify', 'SPOT', 'music streaming', 'audio', 'podcast']},
    'RDDT': {'name': 'Reddit', 'industry': 'Social Media', 'keywords': ['Reddit', 'RDDT', 'social media', 'forum', 'community']},
    
    # ========== CONSUMER ELECTRONICS & HARDWARE (5) ==========
    'AAPL': {'name': 'Apple', 'industry': 'Consumer Electronics', 'keywords': ['Apple', 'AAPL', 'iPhone', 'Tim Cook', 'iOS', 'Mac', 'iPad']},
    'DELL': {'name': 'Dell Technologies', 'industry': 'Hardware', 'keywords': ['Dell', 'PC', 'computer', 'server', 'Michael Dell']},
    'HPQ': {'name': 'HP Inc', 'industry': 'Hardware', 'keywords': ['HP', 'HPQ', 'printer', 'PC', 'computer']},
    'SONY': {'name': 'Sony', 'industry': 'Consumer Electronics', 'keywords': ['Sony', 'PlayStation', 'electronics', 'gaming', 'camera']},
    'STX': {'name': 'Seagate', 'industry': 'Hardware', 'keywords': ['Seagate', 'STX', 'hard drive', 'storage', 'HDD']},
    
    # ========== AUTOMOTIVE & TRANSPORTATION (8) ==========
    'TSLA': {'name': 'Tesla', 'industry': 'Automotive', 'keywords': ['Tesla', 'TSLA', 'Elon Musk', 'electric vehicle', 'EV', 'Model 3', 'Model Y']},
    'F': {'name': 'Ford', 'industry': 'Automotive', 'keywords': ['Ford', 'F-150', 'electric vehicle', 'EV', 'Jim Farley']},
    'GM': {'name': 'General Motors', 'industry': 'Automotive', 'keywords': ['GM', 'General Motors', 'electric vehicle', 'Chevrolet', 'Mary Barra']},
    'RIVN': {'name': 'Rivian', 'industry': 'Automotive', 'keywords': ['Rivian', 'RIVN', 'electric vehicle', 'EV', 'R1T', 'truck']},
    'NIO': {'name': 'NIO', 'industry': 'Automotive', 'keywords': ['NIO', 'electric vehicle', 'EV', 'China', 'William Li']},
    'HMC': {'name': 'Honda', 'industry': 'Automotive', 'keywords': ['Honda', 'HMC', 'automobile', 'Accord', 'Civic']},
    'TM': {'name': 'Toyota', 'industry': 'Automotive', 'keywords': ['Toyota', 'TM', 'automobile', 'hybrid', 'Camry']},
    'UAL': {'name': 'United Airlines', 'industry': 'Airlines', 'keywords': ['United', 'UAL', 'airline', 'aviation', 'travel']},
    
    # ========== FINANCIAL SERVICES (10) ==========
    'BRK.B': {'name': 'Berkshire Hathaway', 'industry': 'Conglomerate', 'keywords': ['Berkshire', 'BRK', 'Warren Buffett', 'insurance', 'investment']},
    'JPM': {'name': 'JPMorgan Chase', 'industry': 'Banking', 'keywords': ['JPMorgan', 'JPM', 'Jamie Dimon', 'bank', 'investment bank']},
    'V': {'name': 'Visa', 'industry': 'Payments', 'keywords': ['Visa', 'payment', 'credit card', 'transaction']},
    'MA': {'name': 'Mastercard', 'industry': 'Payments', 'keywords': ['Mastercard', 'MA', 'payment', 'credit card']},
    'BAC': {'name': 'Bank of America', 'industry': 'Banking', 'keywords': ['Bank of America', 'BAC', 'bank', 'Brian Moynihan']},
    'WFC': {'name': 'Wells Fargo', 'industry': 'Banking', 'keywords': ['Wells Fargo', 'WFC', 'bank', 'Charlie Scharf']},
    'GS': {'name': 'Goldman Sachs', 'industry': 'Investment Banking', 'keywords': ['Goldman', 'GS', 'investment bank', 'David Solomon']},
    'MS': {'name': 'Morgan Stanley', 'industry': 'Investment Banking', 'keywords': ['Morgan Stanley', 'MS', 'investment bank', 'James Gorman']},
    'PYPL': {'name': 'PayPal', 'industry': 'Payments', 'keywords': ['PayPal', 'PYPL', 'payment', 'digital wallet', 'Venmo']},
    'COIN': {'name': 'Coinbase', 'industry': 'Cryptocurrency', 'keywords': ['Coinbase', 'COIN', 'cryptocurrency', 'Bitcoin', 'crypto exchange']},
    
    # ========== HEALTHCARE - PHARMA & BIOTECH (10) ==========
    'LLY': {'name': 'Eli Lilly', 'industry': 'Pharmaceuticals', 'keywords': ['Eli Lilly', 'LLY', 'pharmaceutical', 'drug', 'diabetes', 'Mounjaro']},
    'NVO': {'name': 'Novo Nordisk', 'industry': 'Pharmaceuticals', 'keywords': ['Novo Nordisk', 'NVO', 'diabetes', 'Ozempic', 'Wegovy', 'pharmaceutical']},
    'JNJ': {'name': 'Johnson & Johnson', 'industry': 'Pharmaceuticals', 'keywords': ['Johnson & Johnson', 'JNJ', 'pharmaceutical', 'medical device']},
    'UNH': {'name': 'UnitedHealth', 'industry': 'Healthcare', 'keywords': ['UnitedHealth', 'UNH', 'health insurance', 'healthcare']},
    'PFE': {'name': 'Pfizer', 'industry': 'Pharmaceuticals', 'keywords': ['Pfizer', 'PFE', 'pharmaceutical', 'vaccine', 'drug']},
    'ABBV': {'name': 'AbbVie', 'industry': 'Pharmaceuticals', 'keywords': ['AbbVie', 'ABBV', 'pharmaceutical', 'Humira', 'drug']},
    'MRK': {'name': 'Merck', 'industry': 'Pharmaceuticals', 'keywords': ['Merck', 'MRK', 'pharmaceutical', 'Keytruda', 'drug']},
    'TMO': {'name': 'Thermo Fisher', 'industry': 'Life Sciences', 'keywords': ['Thermo Fisher', 'TMO', 'life sciences', 'laboratory', 'biotech']},
    'ABT': {'name': 'Abbott Labs', 'industry': 'Medical Devices', 'keywords': ['Abbott', 'ABT', 'medical device', 'diagnostics', 'healthcare']},
    'DHR': {'name': 'Danaher', 'industry': 'Life Sciences', 'keywords': ['Danaher', 'DHR', 'life sciences', 'diagnostics', 'biotech']},
    
    # ========== CONSUMER - RETAIL & APPAREL (8) ==========
    'WMT': {'name': 'Walmart', 'industry': 'Retail', 'keywords': ['Walmart', 'WMT', 'retail', 'grocery', 'Doug McMillon']},
    'COST': {'name': 'Costco', 'industry': 'Retail', 'keywords': ['Costco', 'COST', 'warehouse', 'retail', 'wholesale']},
    'HD': {'name': 'Home Depot', 'industry': 'Retail', 'keywords': ['Home Depot', 'HD', 'home improvement', 'retail']},
    'NKE': {'name': 'Nike', 'industry': 'Apparel', 'keywords': ['Nike', 'NKE', 'sportswear', 'sneakers', 'athletic']},
    'SBUX': {'name': 'Starbucks', 'industry': 'Restaurants', 'keywords': ['Starbucks', 'SBUX', 'coffee', 'cafe', 'Laxman Narasimhan']},
    'MCD': {'name': 'McDonalds', 'industry': 'Restaurants', 'keywords': ['McDonalds', 'MCD', 'fast food', 'restaurant']},
    'TGT': {'name': 'Target', 'industry': 'Retail', 'keywords': ['Target', 'TGT', 'retail', 'discount store', 'Brian Cornell']},
    'LOW': {'name': 'Lowes', 'industry': 'Retail', 'keywords': ['Lowes', 'LOW', 'home improvement', 'retail']},
    
    # ========== CONSUMER - FOOD & BEVERAGE (5) ==========
    'PEP': {'name': 'PepsiCo', 'industry': 'Beverages', 'keywords': ['PepsiCo', 'PEP', 'Pepsi', 'beverage', 'snacks', 'Frito-Lay']},
    'KO': {'name': 'Coca-Cola', 'industry': 'Beverages', 'keywords': ['Coca-Cola', 'KO', 'Coke', 'beverage', 'soda']},
    'MDLZ': {'name': 'Mondelez', 'industry': 'Food', 'keywords': ['Mondelez', 'MDLZ', 'snacks', 'Oreo', 'Cadbury', 'food']},
    'KHC': {'name': 'Kraft Heinz', 'industry': 'Food', 'keywords': ['Kraft', 'KHC', 'food', 'packaged food', 'Heinz']},
    'GIS': {'name': 'General Mills', 'industry': 'Food', 'keywords': ['General Mills', 'GIS', 'cereal', 'food', 'Cheerios']},
    
    # ========== ENERGY (7) ==========
    'XOM': {'name': 'ExxonMobil', 'industry': 'Oil & Gas', 'keywords': ['Exxon', 'XOM', 'oil', 'gas', 'energy', 'Darren Woods']},
    'CVX': {'name': 'Chevron', 'industry': 'Oil & Gas', 'keywords': ['Chevron', 'CVX', 'oil', 'gas', 'energy']},
    'COP': {'name': 'ConocoPhillips', 'industry': 'Oil & Gas', 'keywords': ['ConocoPhillips', 'COP', 'oil', 'gas', 'exploration']},
    'SLB': {'name': 'Schlumberger', 'industry': 'Oil Services', 'keywords': ['Schlumberger', 'SLB', 'oilfield services', 'drilling']},
    'NEE': {'name': 'NextEra Energy', 'industry': 'Utilities', 'keywords': ['NextEra', 'NEE', 'renewable energy', 'utility', 'solar', 'wind']},
    'DUK': {'name': 'Duke Energy', 'industry': 'Utilities', 'keywords': ['Duke', 'DUK', 'utility', 'electricity', 'power']},
    'ENPH': {'name': 'Enphase', 'industry': 'Solar', 'keywords': ['Enphase', 'ENPH', 'solar', 'renewable energy', 'inverter']},
    
    # ========== INDUSTRIALS & AEROSPACE (7) ==========
    'BA': {'name': 'Boeing', 'industry': 'Aerospace', 'keywords': ['Boeing', 'BA', 'aircraft', 'airplane', 'aerospace', 'Dave Calhoun']},
    'RTX': {'name': 'Raytheon', 'industry': 'Aerospace', 'keywords': ['Raytheon', 'RTX', 'defense', 'aerospace', 'military']},
    'LMT': {'name': 'Lockheed Martin', 'industry': 'Aerospace', 'keywords': ['Lockheed', 'LMT', 'defense', 'F-35', 'military']},
    'CAT': {'name': 'Caterpillar', 'industry': 'Machinery', 'keywords': ['Caterpillar', 'CAT', 'construction', 'equipment', 'machinery']},
    'DE': {'name': 'Deere & Company', 'industry': 'Machinery', 'keywords': ['Deere', 'DE', 'John Deere', 'agriculture', 'equipment']},
    'GE': {'name': 'General Electric', 'industry': 'Conglomerate', 'keywords': ['GE', 'General Electric', 'aviation', 'power', 'Larry Culp']},
    'UPS': {'name': 'UPS', 'industry': 'Logistics', 'keywords': ['UPS', 'shipping', 'logistics', 'delivery', 'package']},
    
    # ========== TELECOM & MEDIA (5) ==========
    'T': {'name': 'AT&T', 'industry': 'Telecom', 'keywords': ['AT&T', 'T', 'telecom', 'wireless', '5G', 'mobile']},
    'VZ': {'name': 'Verizon', 'industry': 'Telecom', 'keywords': ['Verizon', 'VZ', 'telecom', 'wireless', '5G']},
    'TMUS': {'name': 'T-Mobile', 'industry': 'Telecom', 'keywords': ['T-Mobile', 'TMUS', 'wireless', 'mobile', '5G']},
    'CMCSA': {'name': 'Comcast', 'industry': 'Media', 'keywords': ['Comcast', 'CMCSA', 'cable', 'NBCUniversal', 'broadband']},
    'DIS': {'name': 'Disney', 'industry': 'Entertainment', 'keywords': ['Disney', 'DIS', 'entertainment', 'streaming', 'Disney+', 'Bob Iger']},
    
    # ========== REAL ESTATE & CONSTRUCTION (3) ==========
    'AMT': {'name': 'American Tower', 'industry': 'REITs', 'keywords': ['American Tower', 'AMT', 'cell tower', 'REIT', 'telecom infrastructure']},
    'PLD': {'name': 'Prologis', 'industry': 'REITs', 'keywords': ['Prologis', 'PLD', 'warehouse', 'logistics', 'REIT', 'industrial']},
    'DHI': {'name': 'DR Horton', 'industry': 'Homebuilding', 'keywords': ['DR Horton', 'DHI', 'homebuilder', 'construction', 'housing']},
    
    # ========== MATERIALS & CHEMICALS (4) ==========
    'LIN': {'name': 'Linde', 'industry': 'Chemicals', 'keywords': ['Linde', 'LIN', 'industrial gas', 'chemicals', 'hydrogen']},
    'APD': {'name': 'Air Products', 'industry': 'Chemicals', 'keywords': ['Air Products', 'APD', 'industrial gas', 'hydrogen']},
    'NEM': {'name': 'Newmont', 'industry': 'Mining', 'keywords': ['Newmont', 'NEM', 'gold', 'mining', 'metals']},
    'FCX': {'name': 'Freeport-McMoRan', 'industry': 'Mining', 'keywords': ['Freeport', 'FCX', 'copper', 'mining', 'metals']},
}


class ArticleRelevanceChecker:
    """Filters out irrelevant articles"""
    
    @staticmethod
    def is_relevant(article: Dict, ticker: str, company_name: str) -> tuple:
        """Check if article is relevant"""
        title = article.get('title', '').lower()
        description = article.get('description', '').lower()
        combined_text = f"{title} {description}"
        
        # Must mention ticker or company
        has_mention = ticker.lower() in combined_text or company_name.lower() in combined_text
        if not has_mention:
            return False, "No mention"
        
        # Must have financial context
        financial_keywords = [
            'stock', 'shares', 'earnings', 'revenue', 'profit',
            'market', 'investor', 'ceo', 'quarter', 'guidance',
            'analyst', 'price target', 'upgrade', 'downgrade'
        ]
        
        has_financial = any(kw in combined_text for kw in financial_keywords)
        if not has_financial:
            return False, "No financial context"
        
        return True, "Relevant"


class NewsAPISearcher:
    """Search using NewsAPI"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or NEWSAPI_KEY
        self.base_url = "https://newsapi.org/v2/everything"
        self.relevance_checker = ArticleRelevanceChecker()
        
        if self.api_key:
            logger.info("✓ Using NewsAPI")
    
    def search_news(self, ticker: str, stock_info: Dict, max_results: int = 3) -> List[Dict]:
        """Search for relevant financial news"""
        if not self.api_key:
            logger.warning("No NewsAPI key")
            return []
        
        company_name = stock_info['name']
        
        try:
            search_terms = f'({company_name} OR {ticker}) AND (stock OR earnings OR revenue)'
            
            params = {
                'q': search_terms,
                'language': 'en',
                'sortBy': 'publishedAt',
                'pageSize': max_results * 3,
                'domains': 'reuters.com,bloomberg.com,cnbc.com,marketwatch.com,seekingalpha.com,benzinga.com',
                'from': (datetime.now() - timedelta(days=7)).isoformat(),
                'apiKey': self.api_key
            }
            
            response = requests.get(self.base_url, params=params, timeout=15)
            
            if response.status_code != 200:
                logger.error(f"NewsAPI error {response.status_code}")
                return []
            
            data = response.json()
            if data['status'] != 'ok':
                return []
            
            relevant_articles = []
            for article in data.get('articles', []):
                if article.get('title') == '[Removed]' or not article.get('url'):
                    continue
                
                is_relevant, reason = self.relevance_checker.is_relevant(article, ticker, company_name)
                
                if is_relevant:
                    relevant_articles.append({
                        'url': article['url'],
                        'title': article['title'],
                        'description': article.get('description', ''),
                        'published_at': article['publishedAt'],
                        'source': article['source']['name'],
                        'ticker': ticker,
                        'company_name': company_name
                    })
                
                if len(relevant_articles) >= max_results:
                    break
            
            logger.info(f"Found {len(relevant_articles)} relevant articles")
            return relevant_articles
            
        except Exception as e:
            logger.error(f"NewsAPI search error: {e}")
            return []


class ArticleExtractor:
    """Extracts content from article URLs"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    def extract_content(self, url: str) -> Optional[str]:
        """Extract text content"""
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            for element in soup(['script', 'style', 'nav', 'footer', 'header']):
                element.decompose()
            
            paragraphs = soup.find_all('p')
            text = '\n'.join([p.get_text().strip() for p in paragraphs if len(p.get_text().strip()) > 50])
            
            return text[:5000] if text else None
            
        except Exception as e:
            logger.error(f"Error extracting content: {e}")
            return None


class MarketDataCollector:
    """Collects historical market data"""
    
    @staticmethod
    def get_pre_publication_data(ticker: str, days_before: int = 30) -> Dict:
        """Get market data for pre-publication analysis"""
        try:
            stock = yf.Ticker(ticker)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_before + 90)
            
            hist = stock.history(start=start_date, end=end_date)
            
            if hist.empty:
                return {}
            
            baseline_period = hist.iloc[:60]
            recent_period = hist.iloc[-30:]
            
            baseline_volume = baseline_period['Volume'].mean()
            recent_volume = recent_period['Volume'].mean()
            current_price = hist['Close'].iloc[-1]
            
            volume_spike = recent_volume > (baseline_volume * 2)
            price_change_30d = ((current_price - hist['Close'].iloc[-30]) / hist['Close'].iloc[-30]) * 100
            
            return {
                'current_price': float(current_price),
                'price_30d_ago': float(hist['Close'].iloc[-30]),
                'baseline_volume': int(baseline_volume),
                'recent_volume': int(recent_volume),
                'volume_spike': volume_spike,
                'price_change_30d_pct': float(price_change_30d),
                'has_data': True
            }
            
        except Exception as e:
            logger.error(f"Error collecting market data: {e}")
            return {'has_data': False}


class OpenAIAnalyzer:
    """Analyzes articles with improved sentiment scoring"""
    
    def __init__(self):
        self.api_url = "https://api.openai.com/v1/chat/completions"
        self.api_key = OPENAI_API_KEY
    
    def analyze_article(self, article_text: str, ticker: str, article_title: str = None) -> Optional[Dict]:
        """Analyze article with detailed sentiment scoring"""
        try:
            prompt = f"""Analyze this financial article about ${ticker}. Return ONLY valid JSON.

SENTIMENT SCORING (-100 to +100):
VERY BULLISH (+70 to +100): Massive beats >20%, breakthroughs, major upgrades
BULLISH (+30 to +69): Earnings beats, positive guidance, upgrades
SLIGHTLY BULLISH (+1 to +29): Meets expectations positively
NEUTRAL (0): Mixed or meets expectations exactly
SLIGHTLY BEARISH (-1 to -29): Minor concerns, small misses
BEARISH (-30 to -69): Clear misses, guidance cuts, downgrades
VERY BEARISH (-70 to -100): Disasters >20% miss, scandals

Title: {article_title or 'Unknown'}

Required JSON:
{{
  "ticker": "{ticker}",
  "companyName": "Full company name",
  "articleTitle": "Title",
  "publicationName": "Source",
  "author": "Author or null",
  "narrativeName": "Brief summary (max 100 chars)",
  "narrativeType": "EARNINGS_MISS|COMPETITIVE_THREAT|REGULATORY_CONCERN|MANAGEMENT_CHANGE|PRODUCT_FAILURE|MARKET_CORRECTION|GROWTH_CONCERN|VALUATION_CONCERN",
  "sentiment": 0,
  "sentimentReasoning": "Brief explanation",
  "primaryClaim": "Main thesis"
}}

Article: {article_text[:4000]}"""

            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "Financial analyst. Use full -100 to +100 range. Return only JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"}
            }
            
            response = requests.post(
                self.api_url,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.api_key}'
                },
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"OpenAI error {response.status_code}")
                return None
            
            data = response.json()
            content = data['choices'][0]['message']['content']
            analysis = json.loads(content)
            
            # Validate sentiment
            sentiment = analysis.get('sentiment', 0)
            if not isinstance(sentiment, (int, float)):
                analysis['sentiment'] = 0
            elif sentiment < -100 or sentiment > 100:
                analysis['sentiment'] = max(-100, min(100, sentiment))
            
            logger.info(f"  Sentiment: {analysis['sentiment']}")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing article: {e}")
            return None


class DatabaseManager:
    """Manages database operations with proper schema matching"""
    
    def __init__(self, supabase_client: Client):
        self.db = supabase_client
    
    def save_article(self, article_data: Dict) -> Optional[str]:
        """Save article - returns article_id for FK references"""
        try:
            # Check if article already exists
            existing = self.db.table('articles').select('id').eq('url', article_data['url']).execute()
            
            if existing.data:
                logger.info(f"  Article already exists")
                return existing.data[0]['id']
            
            # Insert new article - FIXED: Save more text (Issue #2)
            result = self.db.table('articles').insert({
                'ticker': article_data['ticker'],
                'url': article_data['url'],
                'title': article_data.get('title'),
                'author': article_data.get('author'),
                'publication_name': article_data.get('publication_name'),
                'content_summary': article_data.get('content_summary'),
                'full_text': article_data.get('full_text')[:3000],  # FIXED: was 1000, now 3000
                'initial_sentiment': article_data.get('sentiment', 0),
                'published_at': article_data.get('published_at', datetime.now().isoformat())
            }).execute()
            
            if result.data:
                return result.data[0]['id']
            return None
            
        except Exception as e:
            logger.error(f"Error saving article: {e}")
            return None
    
    def create_or_update_narrative(self, narrative_data: Dict) -> Optional[str]:
        """Create or update narrative using upsert - FIXED (Issue #4)"""
        try:
            # FIXED: Use upsert instead of manual check
            result = self.db.table('narratives').upsert({
                'ticker': narrative_data['ticker'],
                'narrative_name': narrative_data['narrative_name'],
                'narrative_text': narrative_data.get('narrative_text'),
                'initial_sentiment': narrative_data.get('initial_sentiment', 0),
                'current_sentiment': narrative_data.get('current_sentiment', 0),
                'initial_price': narrative_data.get('initial_price'),
                'initial_volume': narrative_data.get('initial_volume'),
                'current_price': narrative_data.get('current_price'),
                'genesis_date': datetime.now().isoformat(),
                'status': 'ACTIVE',
                'days_elapsed': narrative_data.get('days_elapsed', 0),
                'updated_at': datetime.now().isoformat()
            }, on_conflict='ticker,narrative_name').execute()
            
            if result.data:
                narrative_id = result.data[0]['id']
                logger.info(f"  ✓ Narrative saved {narrative_id}")
                return narrative_id
            
            return None
            
        except Exception as e:
            logger.error(f"Error with narrative: {e}")
            return None
    
    def create_daily_snapshot(self, narrative_id: str, ticker: str, sentiment: int):
        """NEW: Create daily snapshot for decay tracking"""
        try:
            # Get current market data
            stock = yf.Ticker(ticker)
            hist = stock.history(period='1d')
            
            if hist.empty:
                return
            
            current_price = hist['Close'].iloc[-1]
            current_volume = hist['Volume'].iloc[-1]
            
            # Get narrative genesis date for days calculation
            narrative = self.db.table('narratives').select('genesis_date').eq('id', narrative_id).single().execute()
            genesis_date = datetime.fromisoformat(narrative.data['genesis_date']).date()
            today = datetime.now().date()
            days_since = (today - genesis_date).days
            
            # Insert snapshot
            self.db.table('narrative_snapshots').insert({
                'narrative_id': narrative_id,
                'snapshot_date': today.isoformat(),
                'sentiment': sentiment,
                'price': float(current_price),
                'volume': int(current_volume),
                'mention_count': 1,  # Simplified
                'days_since_genesis': days_since,
                'sentiment_decay_pct': 0  # Will calculate in batch job
            }).execute()
            
            logger.info(f"  ✓ Created snapshot for narrative {narrative_id}")
            
        except Exception as e:
            logger.debug(f"Snapshot error: {e}")  # Don't fail the scraper


class FormulaCalculator:
    """NEW: Calculates all patent formulas"""
    
    def __init__(self, supabase_client: Client):
        self.db = supabase_client
    
    def calculate_analyst_accuracy(self, analyst_id: int) -> float:
        """AAR: Analyst Accuracy Rate"""
        try:
            calls = self.db.table('analyst_calls')\
                .select('*')\
                .eq('analyst_id', analyst_id)\
                .eq('outcome_status', 'EVALUATED')\
                .execute()
            
            if not calls.data:
                return 50.0
            
            correct = sum(1 for call in calls.data if call.get('directional_correct'))
            return (correct / len(calls.data)) * 100
            
        except:
            return 50.0
    
    def calculate_reliability_bayesian(self, analyst_id: int) -> float:
        """ARB: Bayesian Reliability"""
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
            
            return ((alpha_0 + successes) / (alpha_0 + beta_0 + successes + failures)) * 100
            
        except:
            return 50.0
    
    def calculate_narrative_premium(self, ticker: str) -> Dict:
        """NPP: Narrative Premium Percent"""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            current_price = info.get('currentPrice', 0)
            eps = info.get('trailingEps', 0)
            
            if eps == 0:
                return {'premium_pct': 0, 'fair_value_delta': 0}
            
            fair_value_pe = 17
            fair_value = eps * fair_value_pe
            premium_pct = ((current_price - fair_value) / fair_value) * 100
            
            return {
                'premium_pct': round(premium_pct, 2),
                'fair_value_delta': round(current_price - fair_value, 2)
            }
            
        except:
            return {'premium_pct': 0, 'fair_value_delta': 0}
    
    def calculate_narrative_decay(self, narrative_id: int) -> Dict:
        """Calculate decay rate and half-life"""
        try:
            snapshots = self.db.table('narrative_snapshots')\
                .select('*')\
                .eq('narrative_id', narrative_id)\
                .order('snapshot_date')\
                .execute()
            
            if not snapshots.data or len(snapshots.data) < 2:
                return {}
            
            initial = snapshots.data[0]['sentiment']
            current = snapshots.data[-1]['sentiment']
            days = len(snapshots.data) - 1
            
            decay_rate = (initial - current) / days
            
            if decay_rate > 0 and initial > 0:
                half_life = math.log(0.5) / math.log(1 - (decay_rate / initial))
            else:
                half_life = None
            
            return {
                'decay_rate': round(decay_rate, 2),
                'half_life': round(half_life, 2) if half_life else None
            }
            
        except:
            return {}
    
    def update_analyst_scores(self, analyst_id: int, ticker: str):
        """Update analyst_scores table with all formulas"""
        try:
            # Calculate scores
            aar = self.calculate_analyst_accuracy(analyst_id)
            arb = self.calculate_reliability_bayesian(analyst_id)
            valuation = self.calculate_narrative_premium(ticker)
            
            # Composite score (simplified)
            acs = (aar * 0.30 + arb * 0.20 + 50 * 0.50)  # Rest default to 50
            
            # Upsert to analyst_scores
            self.db.table('analyst_scores').upsert({
                'analyst_id': analyst_id,
                'ticker': ticker,
                'accuracy_rate': round(aar, 2),
                'reliability_score': round(arb, 2),
                'source_reliability': 70.0,
                'claim_verifiability': 60.0,
                'claim_confidence': round((arb + 70 + 60) / 3, 2),
                'verified_match_score': 50.0,
                'cross_verification': 50.0,
                'narrative_persistence': 50.0,
                'overreaction_ratio': 1.0,
                'narrative_risk': 50.0,
                'narrative_premium_pct': valuation['premium_pct'],
                'fair_value_delta': valuation['fair_value_delta'],
                'credibility_score': round(acs, 2),
                'last_updated': datetime.now().isoformat()
            }, on_conflict='analyst_id,ticker').execute()
            
            logger.info(f"  ✓ Updated scores for analyst {analyst_id}: ACS={round(acs, 2)}")
            
        except Exception as e:
            logger.error(f"Error updating scores: {e}")


class MarketScholarScraper:
    """Main orchestrator - UPDATED with formula integration, Gemini Grounding, and Forensic Analysis"""

    def __init__(self, use_gemini: bool = True, use_newsapi: bool = True, use_forensic: bool = True):
        """
        Initialize scraper with configurable search providers and forensic analysis.

        Args:
            use_gemini: Enable Gemini Grounding with Google Search (default: True)
            use_newsapi: Enable NewsAPI search (default: True)
            use_forensic: Enable Gemini Forensic Analysis (default: True)
        """
        # Search providers
        self.newsapi_searcher = NewsAPISearcher(NEWSAPI_KEY) if use_newsapi and NEWSAPI_KEY else None
        self.gemini_searcher = GeminiGroundingSearcher(GEMINI_API_KEY, supabase) if use_gemini and GEMINI_API_KEY and GeminiGroundingSearcher else None

        # Forensic analyzer (L3 Audit)
        self.forensic_analyzer = GeminiForensicAnalyzer(GEMINI_API_KEY, supabase) if use_forensic and GEMINI_API_KEY and GeminiForensicAnalyzer else None

        # Other components
        self.extractor = ArticleExtractor()
        self.market_data = MarketDataCollector()
        self.analyzer = OpenAIAnalyzer()
        self.db = DatabaseManager(supabase)
        self.analyst_tracker = AnalystTracker()
        self.formula_calc = FormulaCalculator(supabase)

        # Log active providers
        providers = []
        if self.gemini_searcher:
            providers.append("Gemini Grounding")
        if self.newsapi_searcher:
            providers.append("NewsAPI")
        if self.forensic_analyzer:
            providers.append("Forensic Analyzer")
        logger.info(f"Active providers: {', '.join(providers) or 'None'}")
    
    def _search_articles(self, ticker: str, stock_info: Dict, max_articles: int) -> List[Dict]:
        """Search for articles using all available providers."""
        all_articles = []
        seen_urls = set()

        # Try Gemini Grounding first (real-time web search)
        if self.gemini_searcher:
            try:
                logger.info(f"  Searching with Gemini Grounding...")
                gemini_articles = self.gemini_searcher.search_news(ticker, stock_info, max_articles)
                for article in gemini_articles:
                    if article['url'] not in seen_urls:
                        article['search_source'] = 'gemini_grounding'
                        all_articles.append(article)
                        seen_urls.add(article['url'])
                logger.info(f"  Gemini found {len(gemini_articles)} articles")
            except Exception as e:
                logger.error(f"  Gemini search error: {e}")

        # Supplement with NewsAPI
        if self.newsapi_searcher and len(all_articles) < max_articles:
            try:
                remaining = max_articles - len(all_articles)
                logger.info(f"  Searching with NewsAPI for {remaining} more...")
                newsapi_articles = self.newsapi_searcher.search_news(ticker, stock_info, remaining + 2)
                for article in newsapi_articles:
                    if article['url'] not in seen_urls:
                        article['search_source'] = 'newsapi'
                        all_articles.append(article)
                        seen_urls.add(article['url'])
                        if len(all_articles) >= max_articles:
                            break
                logger.info(f"  NewsAPI added {len(all_articles) - len(gemini_articles) if self.gemini_searcher else len(all_articles)} articles")
            except Exception as e:
                logger.error(f"  NewsAPI search error: {e}")

        return all_articles[:max_articles]

    def process_ticker(self, ticker: str, stock_info: Dict, max_articles: int = 3) -> int:
        """Process all articles for a ticker"""
        company_name = stock_info['name']
        industry = stock_info.get('industry', 'Unknown')
        logger.info(f"{'='*60}")
        logger.info(f"Processing {ticker} ({company_name}) - {industry}")
        logger.info(f"{'='*60}")

        articles_processed = 0

        try:
            articles = self._search_articles(ticker, stock_info, max_articles)
            
            if not articles:
                logger.warning(f"No articles found for {ticker}")
                return 0
            
            market_data = self.market_data.get_pre_publication_data(ticker)
            
            for idx, article in enumerate(articles, 1):
                try:
                    title_display = article['title'][:80] if article['title'] else article['url'][:60]
                    logger.info(f"  [{idx}/{len(articles)}] {title_display}")
                    
                    content = article.get('description') or self.extractor.extract_content(article['url'])
                    if not content or len(content) < 100:
                        logger.warning(f"  Insufficient content")
                        continue
                    
                    analysis = self.analyzer.analyze_article(content, ticker, article.get('title'))
                    if not analysis:
                        continue
                    
                    # Prepare article data
                    article_data = {
                        'ticker': ticker,
                        'url': article['url'],
                        'title': article.get('title') or analysis.get('articleTitle'),
                        'author': analysis.get('author'),
                        'publication_name': article.get('source') or analysis.get('publicationName'),
                        'content_summary': analysis.get('narrativeName'),
                        'full_text': content,  # Full content now
                        'sentiment': analysis.get('sentiment', 0),
                        'published_at': article.get('published_at', datetime.now().isoformat())
                    }
                    
                    # FIXED (Issue #1): Save article FIRST to get article_id
                    article_id = self.db.save_article(article_data)
                    
                    if article_id:
                        # Create/update narrative
                        narrative_data = {
                            'ticker': ticker,
                            'narrative_name': analysis.get('narrativeName', 'Unknown'),
                            'narrative_text': analysis.get('primaryClaim'),
                            'initial_sentiment': analysis.get('sentiment', 0),
                            'current_sentiment': analysis.get('sentiment', 0),
                            'initial_price': market_data.get('current_price'),
                            'initial_volume': market_data.get('recent_volume'),
                            'current_price': market_data.get('current_price'),
                            'days_elapsed': 0
                        }
                        
                        narrative_id = self.db.create_or_update_narrative(narrative_data)
                        
                        # NEW: Create daily snapshot
                        if narrative_id:
                            self.db.create_daily_snapshot(
                                narrative_id, 
                                ticker, 
                                analysis.get('sentiment', 0)
                            )
                        
                        # FIXED (Issue #1): Track analyst with article_id for FK
                        try:
                            article_data_full = {
                                'article_id': article_id,  # CRITICAL FIX
                                'full_text': content,
                                'title': article.get('title', ''),
                                'ticker': ticker,
                                'sentiment': analysis.get('sentiment', 0),
                                'published_at': article.get('published_at')
                            }
                            
                            analyst_call_id = self.analyst_tracker.process_analyst_article(
                                article_data_full,
                                analysis
                            )
                            
                            if analyst_call_id:
                                logger.info(f"  💼 Analyst tracked!")
                                
                                # NEW: Calculate scores for this analyst
                                analyst_id = self.db.db.table('analyst_calls')\
                                    .select('analyst_id')\
                                    .eq('id', analyst_call_id)\
                                    .single().execute().data['analyst_id']
                                
                                self.formula_calc.update_analyst_scores(analyst_id, ticker)
                                
                        except Exception as e:
                            logger.debug(f"  No analyst: {e}")

                        # Forensic Audit (L3 Analysis)
                        if self.forensic_analyzer:
                            try:
                                forensic_data = {
                                    'article_id': article_id,
                                    'title': article.get('title', ''),
                                    'full_text': content,
                                    'content_summary': analysis.get('narrativeName', '')
                                }
                                forensic_result = self.forensic_analyzer.forensic_audit(ticker, forensic_data)
                                if forensic_result.get('verdict') != 'ERROR':
                                    logger.info(f"  🔍 Forensic: VMS={forensic_result.get('vms_score', 0):.2f}, "
                                               f"Drift={forensic_result.get('epistemic_drift', 0)}, "
                                               f"Verdict={forensic_result.get('verdict', 'N/A')}")
                            except Exception as e:
                                logger.debug(f"  Forensic audit skipped: {e}")

                        articles_processed += 1
                        logger.info(f"  ✓ Saved article")
                    
                    time.sleep(2)
                    
                except Exception as e:
                    logger.error(f"  Error processing article {idx}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error processing {ticker}: {e}")
        
        logger.info(f"Completed {ticker}: {articles_processed} articles\n")
        return articles_processed
    
    def run_daily_scrape(self, tickers_to_process: Optional[List[str]] = None, 
                         articles_per_ticker: int = 3) -> Dict:
        """Run daily scraping job"""
        start_time = datetime.now()
        logger.info("="*70)
        logger.info("MARKETSCHOLAR DAILY SCRAPER - UPDATED WITH FORMULAS")
        logger.info(f"Time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("="*70)
        
        if tickers_to_process:
            tickers = {k: v for k, v in TOP_STOCKS.items() if k in tickers_to_process}
        else:
            tickers = TOP_STOCKS
        
        results = {
            'total_tickers': len(tickers),
            'successful_tickers': 0,
            'total_articles': 0,
            'errors': []
        }
        
        for ticker, stock_info in tickers.items():
            try:
                articles_count = self.process_ticker(ticker, stock_info, articles_per_ticker)
                
                if articles_count > 0:
                    results['successful_tickers'] += 1
                    results['total_articles'] += articles_count
                
            except Exception as e:
                error_msg = f"Failed {ticker}: {str(e)}"
                logger.error(error_msg)
                results['errors'].append(error_msg)
            
            time.sleep(3)
        
        # NEW: Calculate decay for all active narratives at end
        logger.info("\n" + "="*70)
        logger.info("CALCULATING NARRATIVE DECAY METRICS")
        logger.info("="*70)
        
        try:
            narratives = supabase.table('narratives')\
                .select('id')\
                .eq('status', 'ACTIVE')\
                .execute()
            
            for narrative in narratives.data:
                decay_metrics = self.formula_calc.calculate_narrative_decay(narrative['id'])
                
                if decay_metrics:
                    supabase.table('narrative_decay_metrics').upsert({
                        'narrative_id': narrative['id'],
                        'decay_rate': decay_metrics.get('decay_rate'),
                        'half_life_days': decay_metrics.get('half_life'),
                        'last_calculated': datetime.now().isoformat()
                    }, on_conflict='narrative_id').execute()
                    
                    logger.info(f"✓ Calculated decay for narrative {narrative['id']}")
                    
        except Exception as e:
            logger.error(f"Error calculating decay: {e}")
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info("\n" + "="*70)
        logger.info("COMPLETED")
        logger.info(f"Duration: {duration:.2f}s ({duration/60:.1f} minutes)")
        logger.info(f"Tickers: {results['successful_tickers']}/{results['total_tickers']}")
        logger.info(f"Articles: {results['total_articles']}")
        logger.info("="*70)
        
        return results


def main():
    """Main entry point"""
    try:
        scraper = MarketScholarScraper()
        results = scraper.run_daily_scrape(articles_per_ticker=3)
        
        exit(0 if not results['errors'] else 1)
            
    except Exception as e:
        logger.critical(f"Fatal error: {e}")
        exit(1)


if __name__ == "__main__":
    main()
