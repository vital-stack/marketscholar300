"""
Pytest fixtures for MarketScholar backend tests
"""

import pytest
import os
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta

# Set dummy environment variables before importing modules
os.environ.setdefault('SUPABASE_URL', 'https://test.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
os.environ.setdefault('OPENAI_API_KEY', 'test-openai-key')
os.environ.setdefault('NEWSAPI_API_KEY', 'test-newsapi-key')


@pytest.fixture
def mock_supabase():
    """Mock Supabase client for database operations"""
    mock_client = MagicMock()

    # Mock table operations
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.upsert.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.in_.return_value = mock_table
    mock_table.gte.return_value = mock_table
    mock_table.lt.return_value = mock_table
    mock_table.order.return_value = mock_table
    mock_table.limit.return_value = mock_table
    mock_table.single.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[])

    return mock_client


@pytest.fixture
def mock_yfinance():
    """Mock yfinance for market data"""
    with patch('yfinance.Ticker') as mock_ticker:
        ticker_instance = MagicMock()
        mock_ticker.return_value = ticker_instance

        # Mock history data
        import pandas as pd
        import numpy as np

        dates = pd.date_range(end=datetime.now(), periods=60, freq='D')
        mock_history = pd.DataFrame({
            'Open': np.random.uniform(100, 150, 60),
            'High': np.random.uniform(100, 150, 60),
            'Low': np.random.uniform(100, 150, 60),
            'Close': np.linspace(100, 120, 60),  # Steady increase
            'Volume': np.random.uniform(1000000, 5000000, 60)
        }, index=dates)

        ticker_instance.history.return_value = mock_history

        # Mock info
        ticker_instance.info = {
            'currentPrice': 120.0,
            'trailingEps': 5.0,
            'forwardPe': 24.0,
        }

        # Mock financials
        mock_financials = pd.DataFrame({
            datetime(2024, 12, 31): [1000000000, 200000000],
            datetime(2023, 12, 31): [800000000, 150000000],
        }, index=['Total Revenue', 'Net Income'])
        ticker_instance.financials = mock_financials

        yield mock_ticker


@pytest.fixture
def sample_article_text():
    """Sample article text for testing"""
    return """
    Morgan Stanley analyst John Smith raised his price target on NVIDIA to $150 from $120,
    maintaining an Overweight rating. The analyst believes the AI opportunity
    remains underappreciated by the market, citing a massive $500 billion total addressable market.

    Revenue grew 114% year-over-year to $22.1 billion, crushing analyst estimates of $20.5 billion.
    The company reported earnings per share of $5.16, compared to $4.02 expected.

    "This is a revolutionary game-changer for the entire industry," Smith wrote in a note.
    The stock has experienced a wipeout of 17% since the DeepSeek announcement.
    """


@pytest.fixture
def sample_analyst_articles():
    """Sample articles with analyst mentions"""
    return [
        {
            'text': "Goldman Sachs analyst Sarah Johnson initiates coverage on Apple with Buy rating",
            'expected_firm': 'Goldman Sachs',
            'expected_has_analyst': True,
        },
        {
            'text': "JPMorgan raises price target to $200 on Tesla, maintains Overweight",
            'expected_firm': 'JPMorgan',
            'expected_has_analyst': True,
        },
        {
            'text': "Wedbush Dan Ives upgrades Microsoft to Outperform",
            'expected_firm': 'Wedbush',
            'expected_has_analyst': True,
        },
        {
            'text': "Apple reports record quarterly earnings beating expectations",
            'expected_firm': None,
            'expected_has_analyst': False,
        },
    ]


@pytest.fixture
def decay_test_data():
    """Test data for decay calculations"""
    return {
        'narrative_id': 'test-narrative-001',
        'initial_sentiment': 100.0,
        'initial_price': 100.0,
        'genesis_date': datetime(2025, 1, 1),
        # 14 days of decaying sentiment (matches DeepSeek case study)
        'sentiment_history': [100, 95, 88, 82, 75, 70, 65, 60, 55, 52, 48, 45, 42, 40],
        'price_history': [100, 98, 95, 93, 90, 88, 85, 83, 80, 78, 75, 73, 70, 68],
    }


@pytest.fixture
def hds_test_cases():
    """Test cases for Hype Discipline Score"""
    return [
        {
            'text': "Revenue increased 15% to $22.1 billion. EPS was $5.16. Margin expanded 200 basis points.",
            'expected_range': (60, 100),  # High HDS - data-rich
            'description': 'Data-rich, low hype'
        },
        {
            'text': "This is a revolutionary game-changer! Massive unprecedented collapse! Catastrophic wipeout!",
            'expected_range': (0, 30),  # Low HDS - hype-heavy
            'description': 'Hype-heavy, no data'
        },
        {
            'text': "Revenue soared 114% as the revolutionary AI opportunity creates a massive $500B TAM.",
            'expected_range': (30, 70),  # Mixed
            'description': 'Mixed data and hype'
        },
    ]
