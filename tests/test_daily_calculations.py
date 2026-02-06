"""
Tests for Daily Formula Calculations (Page 2 Patent Formulas)

Formulas tested:
- OR (Overreaction Ratio): Price Velocity / Fundamental Velocity
- NPP (Narrative Premium Percent): (IP - FV) / FV × 100
- HDS (Hype Discipline Score): Data Density / Emotional Manipulation
- AAR (Analyst Accuracy Rate): Correct / Total × 100
- ARB (Bayesian Reliability): (α₀ + successes) / (α₀ + β₀ + total) × 100
- Coordination Score: Timing + Identical Phrasing
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


class TestHypeDisciplineScore:
    """Tests for HDS calculation - Data Density / Emotional Manipulation"""

    @pytest.fixture(autouse=True)
    def setup_calculator(self, mock_supabase):
        """Setup calculator with mocked dependencies"""
        with patch('daily_calculations.supabase', mock_supabase):
            with patch('daily_calculations.create_client', return_value=mock_supabase):
                from daily_calculations import PatentFormulaCalculator
                self.calculator = PatentFormulaCalculator()

    def test_hds_data_rich_article(self):
        """Test HDS with data-rich, low-hype article"""
        text = """
        NVIDIA reported Q4 revenue of $22.1 billion, up 114% year-over-year.
        Earnings per share came in at $5.16, beating estimates of $4.02.
        Data center revenue reached $18.4 billion, representing 82% of total.
        Gross margin expanded to 76.7%, up from 63.3% in the prior year.
        The company guided Q1 revenue of $24.0 billion, plus or minus 2%.
        """

        hds = self.calculator.calculate_hype_discipline(text)

        # High data density, low hype = high HDS
        assert hds >= 60, f"Expected HDS >= 60 for data-rich text, got {hds}"

    def test_hds_hype_heavy_article(self):
        """Test HDS with hype-heavy, data-poor article"""
        text = """
        This is a revolutionary game-changer! The unprecedented collapse has
        caused a massive wipeout across the sector. Catastrophic losses are
        devastating investors as the crisis deepens. This breakthrough technology
        could skyrocket or completely obliterate current market dynamics.
        """

        hds = self.calculator.calculate_hype_discipline(text)

        # Low data density, high hype = low HDS
        assert hds <= 40, f"Expected HDS <= 40 for hype-heavy text, got {hds}"

    def test_hds_mixed_article(self):
        """Test HDS with mixed data and hype"""
        text = """
        Revenue soared 114% in a revolutionary quarter as the AI opportunity
        creates a massive $500 billion total addressable market. EPS of $5.16
        crushed the $4.02 estimate. This game-changing performance could
        skyrocket the stock to unprecedented heights.
        """

        hds = self.calculator.calculate_hype_discipline(text)

        # Mixed = moderate HDS
        assert 20 <= hds <= 80, f"Expected moderate HDS, got {hds}"

    def test_hds_empty_text(self):
        """Test HDS with empty or None text"""
        assert self.calculator.calculate_hype_discipline("") == 50
        assert self.calculator.calculate_hype_discipline(None) == 50

    def test_hds_numeric_patterns_detection(self):
        """Test that HDS correctly detects various numeric patterns"""
        text = """
        Revenue was $22.1B with 15.5% margin. The company has 10,000 employees
        and targets 25% growth. Stock moved 3.5% on 1.2 million shares traded.
        """

        hds = self.calculator.calculate_hype_discipline(text)

        # Should detect: $22.1B, 15.5%, 10,000, 25%, 3.5%, 1.2 million
        assert hds >= 40, f"Expected moderate-high HDS with numeric data, got {hds}"


class TestAnalystAccuracy:
    """Tests for AAR (Analyst Accuracy Rate) calculation"""

    @pytest.fixture(autouse=True)
    def setup_calculator(self, mock_supabase):
        """Setup calculator with mocked Supabase"""
        self.mock_supabase = mock_supabase
        with patch('daily_calculations.supabase', mock_supabase):
            with patch('daily_calculations.create_client', return_value=mock_supabase):
                from daily_calculations import PatentFormulaCalculator
                self.calculator = PatentFormulaCalculator()
                self.calculator.db = mock_supabase

    def test_aar_perfect_accuracy(self):
        """Test AAR with 100% accuracy"""
        # Mock 10 correct predictions
        mock_calls = [{'directional_correct': True} for _ in range(10)]
        self.mock_supabase.table().execute.return_value = MagicMock(data=mock_calls)

        aar = self.calculator.calculate_analyst_accuracy(analyst_id=1)

        assert aar == 100.0

    def test_aar_no_accuracy(self):
        """Test AAR with 0% accuracy"""
        # Mock 10 incorrect predictions
        mock_calls = [{'directional_correct': False} for _ in range(10)]
        self.mock_supabase.table().execute.return_value = MagicMock(data=mock_calls)

        aar = self.calculator.calculate_analyst_accuracy(analyst_id=1)

        assert aar == 0.0

    def test_aar_partial_accuracy(self):
        """Test AAR with 70% accuracy"""
        # Mock 7 correct, 3 incorrect
        mock_calls = [{'directional_correct': True}] * 7 + [{'directional_correct': False}] * 3
        self.mock_supabase.table().execute.return_value = MagicMock(data=mock_calls)

        aar = self.calculator.calculate_analyst_accuracy(analyst_id=1)

        assert aar == 70.0

    def test_aar_no_data(self):
        """Test AAR returns default when no data"""
        self.mock_supabase.table().execute.return_value = MagicMock(data=[])

        aar = self.calculator.calculate_analyst_accuracy(analyst_id=1)

        assert aar == 50.0  # Default value


class TestBayesianReliability:
    """Tests for ARB (Bayesian Reliability) calculation"""

    @pytest.fixture(autouse=True)
    def setup_calculator(self, mock_supabase):
        """Setup calculator with mocked Supabase"""
        self.mock_supabase = mock_supabase
        with patch('daily_calculations.supabase', mock_supabase):
            with patch('daily_calculations.create_client', return_value=mock_supabase):
                from daily_calculations import PatentFormulaCalculator
                self.calculator = PatentFormulaCalculator()
                self.calculator.db = mock_supabase

    def test_arb_formula(self):
        """
        Test ARB formula: (α₀ + successes) / (α₀ + β₀ + total) × 100
        With α₀ = β₀ = 2 (prior)
        """
        # 8 correct, 2 incorrect = 10 total
        mock_calls = [{'directional_correct': True}] * 8 + [{'directional_correct': False}] * 2
        self.mock_supabase.table().execute.return_value = MagicMock(data=mock_calls)

        arb = self.calculator.calculate_reliability_bayesian(analyst_id=1)

        # Expected: (2 + 8) / (2 + 2 + 10) × 100 = 10/14 × 100 ≈ 71.43
        expected = (2 + 8) / (2 + 2 + 10) * 100
        assert abs(arb - expected) < 0.1, f"Expected {expected:.2f}, got {arb}"

    def test_arb_with_prior_smoothing(self):
        """Test that ARB uses Bayesian prior smoothing"""
        # Only 1 correct prediction - without prior would be 100%
        mock_calls = [{'directional_correct': True}]
        self.mock_supabase.table().execute.return_value = MagicMock(data=mock_calls)

        arb = self.calculator.calculate_reliability_bayesian(analyst_id=1)

        # Expected: (2 + 1) / (2 + 2 + 1) × 100 = 3/5 × 100 = 60%
        # Prior pulls it down from 100% to 60%
        expected = 60.0
        assert abs(arb - expected) < 0.1

    def test_arb_no_data_returns_prior(self):
        """Test ARB returns prior expectation with no data"""
        self.mock_supabase.table().execute.return_value = MagicMock(data=[])

        arb = self.calculator.calculate_reliability_bayesian(analyst_id=1)

        # Default should be 50% (neutral prior)
        assert arb == 50.0


class TestOverreactionRatio:
    """Tests for OR (Overreaction Ratio) calculation"""

    @pytest.fixture(autouse=True)
    def setup_calculator(self, mock_supabase, mock_yfinance):
        """Setup calculator with mocked dependencies"""
        with patch('daily_calculations.supabase', mock_supabase):
            with patch('daily_calculations.create_client', return_value=mock_supabase):
                from daily_calculations import PatentFormulaCalculator
                self.calculator = PatentFormulaCalculator()

    def test_or_calculation_structure(self, mock_yfinance):
        """
        Test OR formula: Price Velocity / Fundamental Velocity

        Case Study: -17% price / +114% revenue = ~0.15 (should flag as unusual)
        """
        with patch('daily_calculations.yf', mock_yfinance):
            or_ratio = self.calculator.calculate_overreaction_ratio('NVDA')

            # Should return a valid ratio
            assert isinstance(or_ratio, float)
            assert or_ratio >= 0


class TestNarrativePremium:
    """Tests for NPP (Narrative Premium Percent) calculation"""

    @pytest.fixture(autouse=True)
    def setup_calculator(self, mock_supabase, mock_yfinance):
        """Setup calculator with mocked dependencies"""
        with patch('daily_calculations.supabase', mock_supabase):
            with patch('daily_calculations.create_client', return_value=mock_supabase):
                from daily_calculations import PatentFormulaCalculator
                self.calculator = PatentFormulaCalculator()

    def test_npp_calculation_structure(self, mock_yfinance):
        """
        Test NPP formula: (IP - FV) / FV × 100

        Returns dict with premium_pct, fair_value, current_price
        """
        with patch('daily_calculations.yf', mock_yfinance):
            result = self.calculator.calculate_narrative_premium('NVDA')

            assert 'premium_pct' in result
            assert 'fair_value' in result
            assert 'current_price' in result
            assert 'fair_value_delta' in result

    def test_npp_with_valid_eps(self, mock_yfinance):
        """Test NPP calculates correctly with valid EPS"""
        # Mock ticker with EPS = 5, Price = 120, FV PE = 17
        # FV = 5 * 17 = 85
        # NPP = (120 - 85) / 85 × 100 = 41.18%

        with patch('daily_calculations.yf.Ticker') as mock_ticker_class:
            mock_ticker = MagicMock()
            mock_ticker_class.return_value = mock_ticker
            mock_ticker.info = {
                'currentPrice': 120.0,
                'trailingEps': 5.0
            }
            mock_ticker.history.return_value = pd.DataFrame({'Close': [120.0]})

            result = self.calculator.calculate_narrative_premium('TEST')

            # Fair value = 5 * 17 = 85
            assert result['fair_value'] == 85.0
            assert result['current_price'] == 120.0

            # NPP = (120 - 85) / 85 * 100 ≈ 41.18%
            expected_npp = ((120 - 85) / 85) * 100
            assert abs(result['premium_pct'] - expected_npp) < 0.1


class TestCoordinationScore:
    """Tests for Coordination Score (Timing + Identical Phrasing)"""

    @pytest.fixture(autouse=True)
    def setup_calculator(self, mock_supabase):
        """Setup calculator with mocked Supabase"""
        self.mock_supabase = mock_supabase
        with patch('daily_calculations.supabase', mock_supabase):
            with patch('daily_calculations.create_client', return_value=mock_supabase):
                from daily_calculations import PatentFormulaCalculator
                self.calculator = PatentFormulaCalculator()
                self.calculator.db = mock_supabase

    def test_coordination_timing_detection(self):
        """Test detection of 3+ sources within 1 hour"""
        base_time = datetime.now()
        mock_articles = [
            {
                'title': 'AI crash narrative article 1',
                'content_summary': 'The AI bubble is bursting',
                'published_at': base_time.isoformat(),
                'author': 'Reporter 1'
            },
            {
                'title': 'AI crash narrative article 2',
                'content_summary': 'The AI bubble is bursting',
                'published_at': (base_time + timedelta(minutes=20)).isoformat(),
                'author': 'Reporter 2'
            },
            {
                'title': 'AI crash narrative article 3',
                'content_summary': 'The AI bubble is bursting',
                'published_at': (base_time + timedelta(minutes=40)).isoformat(),
                'author': 'Reporter 3'
            }
        ]

        self.mock_supabase.table().execute.return_value = MagicMock(data=mock_articles)

        score = self.calculator.calculate_coordination_score('NVDA', 'AI crash')

        # Should score high due to timing proximity
        assert score >= 45, f"Expected score >= 45 for coordinated timing, got {score}"

    def test_coordination_no_articles(self):
        """Test coordination score with no matching articles"""
        self.mock_supabase.table().execute.return_value = MagicMock(data=[])

        score = self.calculator.calculate_coordination_score('NVDA', 'nonexistent narrative')

        assert score == 0

    def test_coordination_single_article(self):
        """Test coordination score with only one article"""
        mock_articles = [
            {
                'title': 'Single article about AI',
                'content_summary': 'AI is changing everything',
                'published_at': datetime.now().isoformat(),
                'author': 'Solo Reporter'
            }
        ]

        self.mock_supabase.table().execute.return_value = MagicMock(data=mock_articles)

        score = self.calculator.calculate_coordination_score('NVDA', 'AI')

        # Single article can't show coordination
        assert score == 0
