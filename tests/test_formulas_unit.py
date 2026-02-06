"""
Unit Tests for MarketScholar Patent Formulas

These tests verify the mathematical correctness of the patent formulas
without requiring external dependencies (Supabase, yfinance, etc.)

Formulas tested:
- t₁/₂ = ln(2) / λ  (Half-life decay)
- NPP = (IP - FV) / FV × 100  (Narrative Premium)
- HDS = Data Density / Emotional Manipulation  (Hype Discipline)
- AAR = Correct / Total × 100  (Analyst Accuracy)
- ARB = (α₀ + successes) / (α₀ + β₀ + total) × 100  (Bayesian Reliability)
"""

import pytest
import math
import re
from datetime import datetime, timedelta


class TestHalfLifeFormula:
    """
    Tests for Patent Formula: t₁/₂ = ln(2) / λ

    This is the core decay formula from Patent #2.
    """

    def test_half_life_basic_calculation(self):
        """
        Test: t₁/₂ = ln(2) / λ

        If λ = 0.05, then t₁/₂ = ln(2) / 0.05 ≈ 13.86 days
        """
        lambda_decay = 0.05
        expected_half_life = math.log(2) / lambda_decay

        # Calculate
        half_life = math.log(2) / lambda_decay

        assert abs(half_life - expected_half_life) < 0.01
        assert abs(half_life - 13.86) < 0.1

    def test_half_life_from_sentiment_decay(self):
        """
        Test deriving λ from sentiment data then calculating half-life.

        Given: S₀ = 100, Sₙ = 50 (after 12 days)
        λ = -ln(Sₙ/S₀) / n = -ln(0.5) / 12 = ln(2) / 12

        Then: t₁/₂ = ln(2) / λ = 12 days
        """
        s0 = 100.0
        sn = 50.0
        days = 12

        # Calculate lambda
        lambda_decay = -math.log(sn / s0) / days

        # Calculate half-life using patent formula
        half_life = math.log(2) / lambda_decay

        # Should equal the number of days it took to reach 50%
        assert abs(half_life - 12.0) < 0.01

    def test_half_life_deepseek_case_study(self):
        """
        Test based on DeepSeek case study from patent.

        Starting sentiment: 100
        After 7 days sentiment value that gives ~12.5 day half-life

        For t₁/₂ = 12.5: λ = ln(2)/12.5 = 0.0555
        After 7 days: S = 100 × e^(-0.0555 × 7) = 100 × 0.678 = 67.8
        """
        s0 = 100.0
        sn = 67.8  # Value after 7 days for 12.5-day half-life
        days = 7

        # Calculate lambda
        lambda_decay = -math.log(sn / s0) / days

        # Calculate half-life
        half_life = math.log(2) / lambda_decay

        # Should be approximately 12.5 days
        assert 11 <= half_life <= 14, f"Expected ~12.5 days, got {half_life}"

    def test_decay_rate_calculation(self):
        """
        Test linear decay rate: (S₀ - Sₙ) / n

        Given: S₀ = 100, Sₙ = 65, n = 7 days
        Decay rate = (100 - 65) / 7 = 5 points/day
        """
        s0 = 100.0
        sn = 65.0
        days = 7

        decay_rate = (s0 - sn) / days

        assert abs(decay_rate - 5.0) < 0.01

    def test_exponential_decay_simulation(self):
        """
        Simulate exponential decay and verify half-life.

        S(t) = S₀ × e^(-λt)
        At t = t₁/₂: S(t₁/₂) = S₀ × 0.5
        """
        s0 = 100.0
        target_half_life = 10.0  # days

        # Calculate lambda for this half-life
        lambda_decay = math.log(2) / target_half_life

        # Simulate decay
        sentiments = []
        for day in range(20):
            sentiment = s0 * math.exp(-lambda_decay * day)
            sentiments.append(sentiment)

        # At day 10, sentiment should be ~50
        assert abs(sentiments[10] - 50.0) < 1.0

        # At day 20, sentiment should be ~25
        assert abs(sentiments[20 - 1] - 25.0) < 2.0


class TestNarrativePremiumFormula:
    """
    Tests for Patent Formula: NPP = (IP - FV) / FV × 100

    This calculates how much the current price deviates from fair value.
    """

    def test_npp_overcorrection_case_study(self):
        """
        Test Case Study from Patent:
        - Implied Price (IP): $95
        - Fair Value (FV): $128
        - NPP = (95 - 128) / 128 × 100 = -25.78% (Overcorrection)
        """
        implied_price = 95.0
        fair_value = 128.0

        npp = ((implied_price - fair_value) / fair_value) * 100

        assert abs(npp - (-25.78)) < 0.1

    def test_npp_premium(self):
        """
        Test when stock is at premium to fair value.

        IP = $150, FV = $100
        NPP = (150 - 100) / 100 × 100 = 50%
        """
        implied_price = 150.0
        fair_value = 100.0

        npp = ((implied_price - fair_value) / fair_value) * 100

        assert npp == 50.0

    def test_npp_fair_valued(self):
        """
        Test when stock is at fair value.

        IP = FV = $100
        NPP = 0%
        """
        implied_price = 100.0
        fair_value = 100.0

        npp = ((implied_price - fair_value) / fair_value) * 100

        assert npp == 0.0

    def test_fair_value_from_pe(self):
        """
        Test fair value calculation from P/E ratio.

        Fair Value = EPS × Fair P/E
        Given: EPS = $5, Fair P/E = 17
        FV = $85
        """
        eps = 5.0
        fair_pe = 17

        fair_value = eps * fair_pe

        assert fair_value == 85.0


class TestHypeDisciplineScore:
    """
    Tests for HDS = Data Density / Emotional Manipulation

    High HDS = data-rich, disciplined reporting
    Low HDS = hype-heavy, emotionally manipulative
    """

    HYPE_WORDS = [
        'wipeout', 'collapse', 'foundation shaking', 'unprecedented',
        'massive', 'catastrophic', 'revolutionary', 'game-changer',
        'disaster', 'crisis', 'crash', 'plunge', 'soar', 'skyrocket',
        'devastate', 'obliterate', 'dominate', 'breakthrough'
    ]

    NUMERIC_PATTERNS = [
        r'\d+\.?\d*%',           # Percentages
        r'\$\d+\.?\d*[BMK]?',    # Dollar amounts
        r'\d+\.?\d*\s*billion',  # Billions
        r'\d+\.?\d*\s*million',  # Millions
        r'\d{1,3}(,\d{3})*'      # Large numbers with commas
    ]

    def calculate_hds(self, text: str) -> int:
        """Calculate HDS score (0-100)"""
        if not text:
            return 50

        text_lower = text.lower()

        # Count hype words
        hype_count = sum(text_lower.count(word) for word in self.HYPE_WORDS)

        # Count numeric anchors
        numeric_anchors = sum(
            len(re.findall(p, text, re.IGNORECASE))
            for p in self.NUMERIC_PATTERNS
        )

        # Calculate score
        if numeric_anchors > 0:
            data_to_hype_ratio = numeric_anchors / (hype_count + 1)
            hds = min(100, int(data_to_hype_ratio * 20))
        else:
            hds = 0

        # Bonus for data-rich content
        if numeric_anchors > hype_count * 3:
            hds = min(100, hds + 20)

        return hds

    def test_hds_data_rich_article(self):
        """Test HDS for data-rich article with minimal hype"""
        text = """
        Revenue increased 15% to $22.1 billion. EPS was $5.16.
        Gross margin expanded 200 basis points to 76.7%.
        The company guided Q1 revenue of $24.0 billion.
        Data center revenue reached $18.4 billion.
        """

        hds = self.calculate_hds(text)

        # High data density, minimal hype = high HDS
        assert hds >= 60, f"Expected HDS >= 60, got {hds}"

    def test_hds_hype_heavy_article(self):
        """Test HDS for hype-heavy article with no data"""
        text = """
        This revolutionary game-changer will cause a massive wipeout!
        The unprecedented collapse is catastrophic for the industry.
        Investors face devastating losses as the crisis deepens.
        """

        hds = self.calculate_hds(text)

        # High hype, no data = low HDS
        assert hds <= 30, f"Expected HDS <= 30, got {hds}"

    def test_hds_mixed_content(self):
        """Test HDS for mixed data and hype"""
        text = """
        Revenue soared 114% in a revolutionary quarter.
        EPS of $5.16 crushed estimates in this game-changing performance.
        The massive $500 billion opportunity is unprecedented.
        """

        hds = self.calculate_hds(text)

        # Mixed = moderate HDS
        assert 20 <= hds <= 70, f"Expected moderate HDS, got {hds}"


class TestAnalystAccuracyFormulas:
    """
    Tests for analyst accuracy formulas:
    - AAR = Correct / Total × 100
    - ARB = (α₀ + successes) / (α₀ + β₀ + total) × 100
    """

    def test_aar_perfect_accuracy(self):
        """Test AAR with 100% accuracy"""
        correct = 10
        total = 10

        aar = (correct / total) * 100

        assert aar == 100.0

    def test_aar_partial_accuracy(self):
        """Test AAR with 70% accuracy"""
        correct = 7
        total = 10

        aar = (correct / total) * 100

        assert aar == 70.0

    def test_arb_bayesian_formula(self):
        """
        Test ARB Bayesian formula:
        ARB = (α₀ + successes) / (α₀ + β₀ + total) × 100

        With prior α₀ = β₀ = 2 (weak prior)
        """
        alpha_0 = 2
        beta_0 = 2
        successes = 8
        failures = 2
        total = successes + failures

        arb = ((alpha_0 + successes) / (alpha_0 + beta_0 + total)) * 100

        # Expected: (2 + 8) / (2 + 2 + 10) × 100 = 71.43%
        expected = (10 / 14) * 100
        assert abs(arb - expected) < 0.1

    def test_arb_prior_smoothing_effect(self):
        """
        Test that Bayesian prior smooths extreme results.

        With only 1 success and 0 failures:
        - Simple AAR would be 100%
        - ARB with prior pulls toward 50%
        """
        alpha_0 = 2
        beta_0 = 2
        successes = 1
        failures = 0

        # Simple accuracy
        simple_aar = (successes / (successes + failures)) * 100 if (successes + failures) > 0 else 50

        # Bayesian
        total = successes + failures
        arb = ((alpha_0 + successes) / (alpha_0 + beta_0 + total)) * 100

        # ARB should be lower than simple AAR due to prior
        assert arb < simple_aar
        assert abs(arb - 60.0) < 0.1  # (2+1)/(2+2+1) = 60%


class TestOverreactionRatio:
    """
    Tests for OR = Price Velocity / Fundamental Velocity

    Case Study: -17% price / +114% revenue
    """

    def test_or_case_study(self):
        """
        Test Overreaction Ratio from case study:
        Price dropped 17%, Revenue grew 114%

        OR = |-17%| / |+114%| = 0.149
        """
        price_velocity = -17  # percent
        fundamental_velocity = 114  # percent

        or_ratio = abs(price_velocity) / abs(fundamental_velocity)

        assert abs(or_ratio - 0.149) < 0.01

    def test_or_extreme_overreaction(self):
        """
        Test extreme overreaction (OR > 4.0 = EXTREME flag)

        Price dropped 50%, Revenue grew 10%
        OR = 50 / 10 = 5.0 (EXTREME)
        """
        price_velocity = -50
        fundamental_velocity = 10

        or_ratio = abs(price_velocity) / abs(fundamental_velocity)

        assert or_ratio > 4.0

    def test_or_normal_reaction(self):
        """
        Test normal market reaction (OR ~ 1.0)

        Price up 10%, Revenue up 10%
        OR = 1.0
        """
        price_velocity = 10
        fundamental_velocity = 10

        or_ratio = abs(price_velocity) / abs(fundamental_velocity)

        assert abs(or_ratio - 1.0) < 0.01


class TestCoordinationMetrics:
    """
    Tests for Coordination Score calculation
    """

    def test_timing_within_hour(self):
        """Test detection of 3+ articles within 1 hour"""
        base_time = datetime(2025, 1, 15, 10, 0, 0)

        timestamps = [
            base_time,
            base_time + timedelta(minutes=20),
            base_time + timedelta(minutes=45),
        ]

        # Check if any 3 consecutive are within 1 hour
        timestamps_sorted = sorted(timestamps)
        within_hour = False

        for i in range(len(timestamps_sorted) - 2):
            diff = (timestamps_sorted[i + 2] - timestamps_sorted[i]).total_seconds()
            if diff < 3600:  # 1 hour
                within_hour = True
                break

        assert within_hour is True

    def test_text_similarity(self):
        """Test text similarity for identical phrasing detection"""
        from difflib import SequenceMatcher

        text1 = "The AI bubble is bursting and investors should be worried"
        text2 = "The AI bubble is bursting and investors need to be cautious"
        text3 = "Apple reported strong quarterly earnings beating estimates"

        sim_1_2 = SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
        sim_1_3 = SequenceMatcher(None, text1.lower(), text3.lower()).ratio()

        # Similar texts should have high ratio
        assert sim_1_2 > 0.7, f"Expected similarity > 0.7, got {sim_1_2}"

        # Unrelated texts should have low ratio
        assert sim_1_3 < 0.3, f"Expected similarity < 0.3, got {sim_1_3}"


class TestPriceTargetExtraction:
    """Tests for extracting price targets from text"""

    PRICE_TARGET_PATTERNS = [
        r'(?:price target|target price|target)\s+(?:of|to|at|raised to|lowered to)\s+\$(\d+(?:\.\d{2})?)',
        r'\$(\d+(?:\.\d{2})?)\s+(?:price target|target price)',
        r'(?:raises|lowers|maintains|sets)\s+target\s+(?:to|at)\s+\$(\d+(?:\.\d{2})?)'
    ]

    def extract_price_target(self, text: str):
        """Extract price target from text"""
        for pattern in self.PRICE_TARGET_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                price = float(match.group(1))
                if 1 <= price <= 10000:
                    return price
        return None

    @pytest.mark.parametrize("text,expected", [
        ("price target of $150", 150.0),
        ("target price to $200", 200.0),
        ("raises target to $175", 175.0),
        ("$250 price target", 250.0),
        ("lowers target to $85", 85.0),
        ("sets target to $99.50", 99.50),
    ])
    def test_price_target_extraction(self, text, expected):
        """Test extraction of various price target patterns"""
        result = self.extract_price_target(text)
        assert result == expected, f"Expected {expected}, got {result}"

    def test_no_price_target(self):
        """Test returns None when no price target present"""
        text = "The company beat earnings expectations"
        result = self.extract_price_target(text)
        assert result is None
