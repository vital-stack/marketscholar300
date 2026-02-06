"""
Configuration Loader for MarketScholar
Reads marketscholar_config.txt and makes settings available to the scraper
"""

import os
import re
from typing import Dict, List, Any


class MarketScholarConfig:
    """Loads and manages configuration from marketscholar_config.txt"""
    
    def __init__(self, config_file: str = 'marketscholar_config.txt'):
        self.config_file = config_file
        self.config = {}
        self.load_config()
    
    def load_config(self):
        """Parse the config file"""
        if not os.path.exists(self.config_file):
            print(f"⚠️  Config file not found: {self.config_file}")
            print("   Using default values")
            self._load_defaults()
            return
        
        print(f"✓ Loading config from {self.config_file}")
        
        with open(self.config_file, 'r') as f:
            content = f.read()
        
        # Parse sections
        current_section = None
        for line in content.split('\n'):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue
            
            # Section headers
            if line.startswith('[') and line.endswith(']'):
                current_section = line[1:-1]
                self.config[current_section] = {}
                continue
            
            # Key-value pairs
            if '=' in line and current_section:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                
                # Handle multi-line values (criteria blocks)
                if value.startswith('"""'):
                    # This is handled separately
                    continue
                
                self.config[current_section][key] = value
        
        # Parse sentiment ranges with criteria
        self._parse_sentiment_ranges(content)
        
        # Parse stock keywords
        self._parse_stock_keywords()
        
        # Parse relevance keywords
        self._parse_relevance_keywords()
        
        print(f"✓ Loaded {len(self.config)} configuration sections")
    
    def _parse_sentiment_ranges(self, content: str):
        """Parse sentiment range criteria from config"""
        sentiment_ranges = {}
        
        # Extract all criteria blocks
        criteria_pattern = r'([a-z_]+)_criteria = """(.*?)"""'
        matches = re.findall(criteria_pattern, content, re.DOTALL)
        
        for range_name, criteria_text in matches:
            sentiment_ranges[range_name] = criteria_text.strip()
        
        self.config['sentiment_ranges']['criteria'] = sentiment_ranges
    
    def _parse_stock_keywords(self):
        """Parse stock keywords into structured format"""
        if 'stock_keywords' not in self.config:
            return
        
        stocks = {}
        for line_key, line_value in self.config['stock_keywords'].items():
            if '|' in line_value:
                parts = line_value.split('|')
                if len(parts) == 2:
                    company_name = parts[0].strip()
                    keywords = [k.strip() for k in parts[1].split(',')]
                    stocks[line_key] = {
                        'name': company_name,
                        'keywords': keywords
                    }
        
        self.config['stock_keywords']['parsed'] = stocks
    
    def _parse_relevance_keywords(self):
        """Parse relevance keywords into lists"""
        if 'relevance_rules' not in self.config:
            return
        
        rules = self.config['relevance_rules']
        
        if 'required_financial_keywords' in rules:
            rules['required_financial_keywords'] = [
                k.strip() for k in rules['required_financial_keywords'].split(',')
            ]
        
        if 'irrelevant_keywords' in rules:
            rules['irrelevant_keywords'] = [
                k.strip() for k in rules['irrelevant_keywords'].split(',')
            ]
    
    def _load_defaults(self):
        """Load default config if file not found"""
        self.config = {
            'sentiment_ranges': {
                'very_bullish_min': '70',
                'very_bullish_max': '100',
                'bullish_min': '30',
                'bullish_max': '69',
            },
            'api_settings': {
                'openai_model': 'gpt-4o-mini',
                'openai_temperature': '0.2',
            }
        }
    
    def get_sentiment_prompt(self) -> str:
        """Generate OpenAI prompt from config"""
        if 'sentiment_ranges' not in self.config:
            return self._default_sentiment_prompt()
        
        ranges = self.config['sentiment_ranges']
        criteria = ranges.get('criteria', {})
        
        prompt = """SENTIMENT SCORING GUIDE (CRITICAL):
Score from -100 to +100 based on impact to stock price:

"""
        
        # Very Bullish
        if 'very_bullish' in criteria:
            prompt += f"""VERY BULLISH (+70 to +100):
{criteria['very_bullish']}

"""
        
        # Bullish
        if 'bullish' in criteria:
            prompt += f"""BULLISH (+30 to +69):
{criteria['bullish']}

"""
        
        # Slightly Bullish
        if 'slightly_bullish' in criteria:
            prompt += f"""SLIGHTLY BULLISH (+1 to +29):
{criteria['slightly_bullish']}

"""
        
        # Neutral
        if 'neutral' in criteria:
            prompt += f"""NEUTRAL (0):
{criteria['neutral']}

"""
        
        # Slightly Bearish
        if 'slightly_bearish' in criteria:
            prompt += f"""SLIGHTLY BEARISH (-1 to -29):
{criteria['slightly_bearish']}

"""
        
        # Bearish
        if 'bearish' in criteria:
            prompt += f"""BEARISH (-30 to -69):
{criteria['bearish']}

"""
        
        # Very Bearish
        if 'very_bearish' in criteria:
            prompt += f"""VERY BEARISH (-70 to -100):
{criteria['very_bearish']}
"""
        
        return prompt
    
    def _default_sentiment_prompt(self) -> str:
        """Fallback prompt if config not loaded"""
        return """SENTIMENT SCORING GUIDE:
Score from -100 to +100 based on stock price impact.
Use the full range: very bearish (-100) to very bullish (+100)."""
    
    def get_stocks(self) -> Dict[str, Dict]:
        """Get stock keywords dictionary"""
        if 'stock_keywords' in self.config and 'parsed' in self.config['stock_keywords']:
            return self.config['stock_keywords']['parsed']
        
        # Default stocks
        return {
            'NVDA': {'name': 'NVIDIA', 'keywords': ['NVIDIA', 'NVDA']},
            'AAPL': {'name': 'Apple', 'keywords': ['Apple', 'AAPL']},
        }
    
    def get_financial_keywords(self) -> List[str]:
        """Get required financial keywords for relevance"""
        if 'relevance_rules' in self.config:
            return self.config['relevance_rules'].get('required_financial_keywords', [])
        return ['stock', 'earnings', 'revenue']
    
    def get_irrelevant_keywords(self) -> List[str]:
        """Get keywords that mark articles as irrelevant"""
        if 'relevance_rules' in self.config:
            return self.config['relevance_rules'].get('irrelevant_keywords', [])
        return []
    
    def get_news_domains(self) -> str:
        """Get comma-separated news domains"""
        if 'news_sources' not in self.config:
            return 'reuters.com,bloomberg.com,cnbc.com'
        
        sources = self.config['news_sources']
        domains = []
        
        for tier in ['tier1_domains', 'tier2_domains', 'tier3_domains', 'tier4_domains']:
            if tier in sources:
                domains.extend(sources[tier].split(','))
        
        return ','.join([d.strip() for d in domains])
    
    def get_api_setting(self, key: str, default: Any = None) -> Any:
        """Get API setting by key"""
        if 'api_settings' in self.config:
            value = self.config['api_settings'].get(key, default)
            
            # Convert to appropriate type
            if key.endswith('_seconds') or key.endswith('_minutes'):
                return int(value) if value else default
            elif key.endswith('_temperature'):
                return float(value) if value else default
            
            return value
        
        return default
    
    def get_logging_setting(self, key: str, default: Any = None) -> Any:
        """Get logging setting by key"""
        if 'logging' in self.config:
            value = self.config['logging'].get(key, default)
            
            # Convert booleans
            if isinstance(default, bool):
                return value.lower() == 'true' if isinstance(value, str) else value
            
            return value
        
        return default


# Global config instance
_config = None

def get_config() -> MarketScholarConfig:
    """Get or create global config instance"""
    global _config
    if _config is None:
        _config = MarketScholarConfig()
    return _config


def reload_config():
    """Reload configuration from file"""
    global _config
    _config = MarketScholarConfig()
    return _config


# Example usage:
if __name__ == "__main__":
    config = get_config()
    
    print("\n=== Sentiment Prompt ===")
    print(config.get_sentiment_prompt()[:500] + "...")
    
    print("\n=== Stock Keywords ===")
    stocks = config.get_stocks()
    for ticker, info in list(stocks.items())[:3]:
        print(f"{ticker}: {info['name']} - {len(info['keywords'])} keywords")
    
    print("\n=== Relevance Rules ===")
    print(f"Financial keywords: {len(config.get_financial_keywords())}")
    print(f"Irrelevant keywords: {len(config.get_irrelevant_keywords())}")
    
    print("\n=== API Settings ===")
    print(f"Model: {config.get_api_setting('openai_model')}")
    print(f"Temperature: {config.get_api_setting('openai_temperature')}")
    
    print("\n✓ Config loaded successfully!")
