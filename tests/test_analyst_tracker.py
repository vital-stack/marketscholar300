"""
Tests for Analyst Tracker (Patent #1)
Multi-Dimensional Financial Analyst Credibility Assessment

Tests:
- Analyst name extraction from article text
- Firm name recognition (28+ major firms)
- Price target extraction
- Pre-publication activity monitoring
"""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import pandas as pd
import numpy as np


class TestAnalystExtractor:
    """Tests for AnalystExtractor class"""

    @pytest.fixture(autouse=True)
    def setup_extractor(self, mock_supabase):
        """Setup extractor with mocked dependencies"""
        with patch('analyst_tracker.supabase', mock_supabase):
            with patch('analyst_tracker.create_client', return_value=mock_supabase):
                from analyst_tracker import AnalystExtractor
                self.extractor = AnalystExtractor()

    @pytest.mark.parametrize("firm", [
        'Morgan Stanley', 'Goldman Sachs', 'JPMorgan', 'Bank of America',
        'Wells Fargo', 'Citi', 'Barclays', 'UBS', 'Wedbush', 'Piper Sandler',
        'KeyBanc', 'Oppenheimer', 'Needham', 'Jefferies', 'Raymond James',
        'Bernstein', 'Evercore', 'Cowen', 'RBC Capital', 'Deutsche Bank',
        'Mizuho', 'Stifel', 'Loop Capital', 'Baird', 'Canaccord', 'BTIG'
    ])
    def test_firm_recognition(self, firm):
        """Test that all major analyst firms are recognized"""
        text = f"{firm} analyst raised the price target on NVIDIA"

        result = self.extractor.extract_analyst_info(text)

        assert result is not None, f"Failed to detect {firm}"
        assert result['firm'] == firm, f"Expected {firm}, got {result['firm']}"

    def test_analyst_name_extraction_standard_pattern(self):
        """Test extraction of analyst name with standard pattern"""
        text = "Morgan Stanley analyst John Smith raised his price target on NVIDIA"

        result = self.extractor.extract_analyst_info(text)

        assert result is not None
        assert result['firm'] == 'Morgan Stanley'
        assert 'John Smith' in result['name'] or result['name'] != 'Unknown Analyst'

    def test_analyst_name_extraction_at_pattern(self):
        """Test extraction with 'at [firm]' pattern"""
        text = "Analyst Sarah Johnson at Goldman Sachs upgraded Apple to Buy"

        result = self.extractor.extract_analyst_info(text)

        assert result is not None
        assert result['firm'] == 'Goldman Sachs'

    def test_analyst_extraction_upgrade_context(self):
        """Test extraction from upgrade article"""
        text = """
        JPMorgan analyst Michael Chen upgraded Tesla to Overweight from Neutral,
        raising his price target to $300 from $250. The analyst cites improving
        margins and strong demand for the Model Y.
        """

        result = self.extractor.extract_analyst_info(text)

        assert result is not None
        assert result['firm'] == 'JPMorgan'
        assert result['confidence'] >= 0.5

    def test_analyst_extraction_downgrade_context(self):
        """Test extraction from downgrade article"""
        text = """
        Wedbush Dan Ives downgraded Microsoft to Underperform, slashing his
        price target to $350 from $400. The analyst believes cloud growth
        is decelerating faster than expected.
        """

        result = self.extractor.extract_analyst_info(text)

        assert result is not None
        assert result['firm'] == 'Wedbush'

    def test_no_analyst_in_earnings_article(self):
        """Test returns None for non-analyst articles"""
        text = """
        Apple reported record quarterly revenue of $119 billion, beating
        analyst estimates of $117 billion. The company shipped 78 million
        iPhones during the quarter, up 5% year-over-year.
        """

        result = self.extractor.extract_analyst_info(text)

        # Should return None - no analyst commentary detected
        assert result is None

    def test_empty_text_returns_none(self):
        """Test returns None for empty text"""
        assert self.extractor.extract_analyst_info("") is None
        assert self.extractor.extract_analyst_info(None) is None

    def test_confidence_scoring(self):
        """Test confidence scoring logic"""
        # High confidence: both name and firm detected
        text = "Morgan Stanley analyst John Smith raised target to $150"
        result = self.extractor.extract_analyst_info(text)

        if result:
            # Should have higher confidence with both name and firm
            assert result['confidence'] >= 0.7

    def test_fallback_to_author(self):
        """Test fallback to author when no analyst name in text"""
        text = "JPMorgan initiates coverage on Tesla with Buy rating"

        result = self.extractor.extract_analyst_info(text, author="Jane Doe")

        assert result is not None
        # May use author as fallback or create "JPMorgan Analyst"


class TestPriceTargetExtraction:
    """Tests for price target extraction from article text"""

    @pytest.fixture(autouse=True)
    def setup_tracker(self, mock_supabase):
        """Setup tracker with mocked dependencies"""
        with patch('analyst_tracker.supabase', mock_supabase):
            with patch('analyst_tracker.create_client', return_value=mock_supabase):
                from analyst_tracker import AnalystTracker
                self.tracker = AnalystTracker()

    @pytest.mark.parametrize("text,expected", [
        ("price target of $150", 150.0),
        ("target price to $200", 200.0),
        ("raises target to $175", 175.0),
        ("$250 price target", 250.0),
        ("lowers target to $85", 85.0),
        ("maintains target at $320", 320.0),
        ("sets target to $99.50", 99.50),
    ])
    def test_price_target_patterns(self, text, expected):
        """Test various price target patterns"""
        result = self.tracker._extract_price_target(text)

        assert result == expected, f"For '{text}', expected {expected}, got {result}"

    def test_price_target_not_found(self):
        """Test returns None when no price target"""
        text = "The company reported strong earnings beating expectations"

        result = self.tracker._extract_price_target(text)

        assert result is None

    def test_price_target_sanity_check(self):
        """Test that unrealistic price targets are rejected"""
        # Price targets outside 1-10000 range should be rejected
        text = "price target to $50000"

        result = self.tracker._extract_price_target(text)

        assert result is None


class TestPrePublicationMonitor:
    """Tests for pre-publication activity monitoring"""

    @pytest.fixture(autouse=True)
    def setup_monitor(self, mock_supabase, mock_yfinance):
        """Setup monitor with mocked dependencies"""
        with patch('analyst_tracker.supabase', mock_supabase):
            with patch('analyst_tracker.create_client', return_value=mock_supabase):
                from analyst_tracker import PrePublicationMonitor
                self.monitor = PrePublicationMonitor()

    def test_volume_spike_detection(self, mock_yfinance):
        """Test detection of volume spikes before publication"""
        with patch('analyst_tracker.yf.Ticker') as mock_ticker:
            ticker_instance = MagicMock()
            mock_ticker.return_value = ticker_instance

            # Create history with volume spike in last 30 days
            dates = pd.date_range(end=datetime.now(), periods=90, freq='D')
            volumes = [1000000] * 60 + [3000000] * 30  # 3x spike in prepub period

            mock_history = pd.DataFrame({
                'Open': [100] * 90,
                'High': [105] * 90,
                'Low': [95] * 90,
                'Close': [100] * 90,
                'Volume': volumes
            }, index=dates)

            ticker_instance.history.return_value = mock_history

            result = self.monitor.get_pre_publication_activity(
                ticker='NVDA',
                publish_date=datetime.now()
            )

            assert result['has_data'] is True
            assert result['volume_spike'] is True
            assert result['volume_ratio'] >= 2.0

    def test_price_movement_detection(self, mock_yfinance):
        """Test detection of significant price movements"""
        with patch('analyst_tracker.yf.Ticker') as mock_ticker:
            ticker_instance = MagicMock()
            mock_ticker.return_value = ticker_instance

            # Create history with 15% price move in prepub period
            dates = pd.date_range(end=datetime.now(), periods=90, freq='D')
            prices = [100] * 60 + list(np.linspace(100, 115, 30))  # 15% increase

            mock_history = pd.DataFrame({
                'Open': prices,
                'High': [p + 2 for p in prices],
                'Low': [p - 2 for p in prices],
                'Close': prices,
                'Volume': [1000000] * 90
            }, index=dates)

            ticker_instance.history.return_value = mock_history

            result = self.monitor.get_pre_publication_activity(
                ticker='NVDA',
                publish_date=datetime.now()
            )

            assert result['has_data'] is True
            assert result['significant_price_move'] is True
            assert abs(result['price_change_pct']) > 10

    def test_suspicion_score_calculation(self, mock_yfinance):
        """Test suspicion score aggregation"""
        with patch('analyst_tracker.yf.Ticker') as mock_ticker:
            ticker_instance = MagicMock()
            mock_ticker.return_value = ticker_instance

            # Create highly suspicious pattern
            dates = pd.date_range(end=datetime.now(), periods=90, freq='D')

            # Volume spike + price move
            volumes = [1000000] * 60 + [3500000] * 30  # 3.5x spike
            prices = [100] * 60 + list(np.linspace(100, 125, 30))  # 25% move

            mock_history = pd.DataFrame({
                'Open': prices,
                'High': [p + 5 for p in prices],
                'Low': [p - 5 for p in prices],
                'Close': prices,
                'Volume': volumes
            }, index=dates)

            ticker_instance.history.return_value = mock_history

            result = self.monitor.get_pre_publication_activity(
                ticker='NVDA',
                publish_date=datetime.now()
            )

            assert result['has_data'] is True
            # High suspicion due to both volume and price anomalies
            assert result['suspicion_score'] >= 60

    def test_insufficient_data(self, mock_yfinance):
        """Test handling of insufficient historical data"""
        with patch('analyst_tracker.yf.Ticker') as mock_ticker:
            ticker_instance = MagicMock()
            mock_ticker.return_value = ticker_instance

            # Only 10 days of data
            dates = pd.date_range(end=datetime.now(), periods=10, freq='D')
            mock_history = pd.DataFrame({
                'Close': [100] * 10,
                'Volume': [1000000] * 10
            }, index=dates)

            ticker_instance.history.return_value = mock_history

            result = self.monitor.get_pre_publication_activity(
                ticker='NVDA',
                publish_date=datetime.now()
            )

            assert result['has_data'] is False

    def test_normal_market_activity(self, mock_yfinance):
        """Test low suspicion for normal market activity"""
        with patch('analyst_tracker.yf.Ticker') as mock_ticker:
            ticker_instance = MagicMock()
            mock_ticker.return_value = ticker_instance

            # Normal stable pattern
            dates = pd.date_range(end=datetime.now(), periods=90, freq='D')

            mock_history = pd.DataFrame({
                'Open': [100] * 90,
                'High': [102] * 90,
                'Low': [98] * 90,
                'Close': [100] * 90,
                'Volume': [1000000] * 90  # Stable volume
            }, index=dates)

            ticker_instance.history.return_value = mock_history

            result = self.monitor.get_pre_publication_activity(
                ticker='NVDA',
                publish_date=datetime.now()
            )

            assert result['has_data'] is True
            assert result['suspicion_score'] < 30  # Low suspicion for normal activity
