# CLAUDE.md - AI Assistant Guide for MarketScholar Scraper

## Project Overview

MarketScholar is a patent-pending automated system for tracking financial analyst credibility and narrative lifecycle decay. It implements two provisional patents:

- **Patent #1 (63/971,470)**: Multi-Dimensional Financial Analyst Credibility Assessment with Pre-Publication Activity Monitoring
- **Patent #2 (63/971,478)**: Narrative Lifecycle Tracking with Decay Monitoring and Fair Value Stress Testing
- **Patent #3**: Inference-Time Temporal Unlearning (Divergence Decoding)

The system scrapes financial news, analyzes articles using OpenAI, tracks narrative decay using exponential decay physics, and calculates analyst credibility across 8 dimensions.

## Repository Structure

```
marketscholar-scraper/
├── marketscholar_scraper.py    # Main scraping & analysis engine (entry point)
├── decay_engine.py             # Narrative decay calculations (Patent #2)
├── analyst_tracker.py          # Analyst credibility tracking (Patent #1)
├── daily_calculations.py       # Patent formula calculations (OR, NPP, HDS, etc.)
├── divergence_decoder.py       # Temporal constraint enforcement (Patent #3)
├── config_loader.py            # Configuration management
├── historical_scraper.py       # Historical data collection
├── marketscholar_config.txt    # Configuration file (sentiment ranges, keywords)
├── requirements.txt            # Python dependencies
└── .github/workflows/
    └── daily-scraper.yml       # GitHub Actions automation (runs 2x daily)
```

## Tech Stack

- **Runtime**: Python 3.11+
- **Database**: Supabase (PostgreSQL)
- **AI/ML**: OpenAI API (GPT-4o-mini model)
- **News Source**: NewsAPI
- **Market Data**: yfinance
- **Web Scraping**: BeautifulSoup4, requests
- **Data Analysis**: NumPy, pandas
- **Automation**: GitHub Actions

## Key Components

### 1. Main Scraper (`marketscholar_scraper.py`)

The primary entry point containing:

- `TOP_STOCKS`: Dictionary of 100 tracked stocks organized by industry with keywords
- `ArticleRelevanceChecker`: Filters irrelevant articles
- `NewsAPISearcher`: Searches NewsAPI for financial articles
- `ArticleExtractor`: Extracts content from article URLs
- `MarketDataCollector`: Collects market data via yfinance
- `OpenAIAnalyzer`: Analyzes articles for sentiment (-100 to +100 scale)
- `DatabaseManager`: Handles Supabase operations
- `FormulaCalculator`: Calculates patent formulas
- `MarketScholarScraper`: Main orchestrator class

**Entry point**: `main()` function, calls `run_daily_scrape()`

### 2. Decay Engine (`decay_engine.py`)

Implements Patent #2 narrative lifecycle tracking:

- `NarrativeDecayEngine`: Calculates decay rate and half-life using formula: `t_1/2 = ln(2) / lambda`
- `FairValueCalculator`: Calculates NPP = (IP - FV) / FV x 100
- `NarrativeUpdater`: Updates narrative metrics daily

**Status classification**: ACTIVE, EXHAUSTED, FAILED, VALIDATED

### 3. Analyst Tracker (`analyst_tracker.py`)

Implements Patent #1 analyst credibility:

- `AnalystExtractor`: Extracts analyst name/firm from articles (recognizes 28+ major firms)
- `PrePublicationMonitor`: Detects suspicious pre-publication market activity
- `AnalystTracker`: Main tracking class with call evaluation

### 4. Daily Calculations (`daily_calculations.py`)

Patent formula implementations:

- **AAR**: Analyst Accuracy Rate
- **ARB**: Bayesian Reliability
- **OR**: Overreaction Ratio (Price Velocity / Fundamental Velocity)
- **NPP**: Narrative Premium Percent
- **HDS**: Hype Discipline Score (Data Density / Emotional Manipulation)
- **Coordination Score**: Timing + Identical Phrasing detection

### 5. Divergence Decoder (`divergence_decoder.py`)

Patent #3 temporal constraint enforcement:

- Prevents AI "time travel" using formula: `l_hat_Q = l_P + alpha(l_past - l_future)`
- Generates cryptographic audit trails for litigation-safe proof
- Suppresses future-dependent tokens

### 6. Configuration (`config_loader.py` + `marketscholar_config.txt`)

- Sentiment scoring ranges and criteria
- Stock keywords for each ticker
- News source domain tiers
- API settings and rate limiting
- Narrative type classifications

## Database Schema (Supabase)

11 tables implementing patent requirements:

- `articles` - Raw article data with sentiment
- `narratives` - Narrative lifecycle tracking
- `narrative_snapshots` - Time-series sentiment data (created by scraper)
- `narrative_decay_metrics` - Decay calculations
- `analysts` - Analyst profiles and composite scores
- `analyst_calls` - Individual analyst predictions
- `analyst_scores` - Patent formula scores per analyst
- `pre_publication_tracking` - 30-day market data monitoring
- `historical_panics` - Pattern matching database
- `narrative_propagation` - Coordination detection
- `forensic_audit_trail` - Temporal constraint proofs

## Environment Variables

Required secrets (configured in GitHub Actions):

```
OPENAI_API_KEY          # OpenAI API key
SUPABASE_URL            # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY  # Supabase service role key
NEWSAPI_API_KEY         # NewsAPI key (optional but recommended)
```

## Workflow

### Daily Automation (GitHub Actions)

Runs twice daily at 7 AM UTC and 2 PM UTC:

1. `marketscholar_scraper.py` - Scrapes and analyzes articles
2. `decay_engine.py` - Updates narrative decay metrics

### Processing Flow

```
NewsAPI Search -> Article Extraction -> OpenAI Analysis -> Database Storage
                                           |
                                           v
                              Analyst Tracking (if detected)
                                           |
                                           v
                              Narrative Creation/Update
                                           |
                                           v
                              Daily Snapshot Creation
                                           |
                                           v
                              Decay Metrics Calculation
```

## Code Conventions

### Logging

All modules use Python's logging module with format:
```python
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
```

Log file: `scraper.log`

### Error Handling

- Use try/except blocks around all external API calls
- Continue processing on non-critical errors
- Log errors but don't fail entire runs for single article failures
- Return `None` or empty dict on failures

### Database Operations

- Use upsert with `on_conflict` for idempotent operations
- Always check for existing records before insert
- Use service role key (not anon key) for full access

### Sentiment Scoring

Scale: -100 to +100
- Very Bullish: +70 to +100
- Bullish: +30 to +69
- Slightly Bullish: +1 to +29
- Neutral: 0
- Slightly Bearish: -1 to -29
- Bearish: -30 to -69
- Very Bearish: -70 to -100

### Rate Limiting

- 2-second delay between article processing
- 3-second delay between tickers
- 15-second timeout for HTTP requests
- 30-second timeout for OpenAI calls

## Common Tasks

### Adding a New Stock

Edit `TOP_STOCKS` dict in `marketscholar_scraper.py`:
```python
'TICKER': {'name': 'Company Name', 'industry': 'Industry', 'keywords': ['keyword1', 'keyword2']},
```

### Modifying Sentiment Criteria

Edit `marketscholar_config.txt` under `[sentiment_ranges]` section.

### Running Historical Scrape

```python
from historical_scraper import HistoricalScraper
scraper = HistoricalScraper()
scraper.scrape_date_range('2025-01-01', '2025-01-30', tickers=['NVDA', 'AAPL'])
```

### Testing Analyst Extraction

```bash
python analyst_tracker.py
```

### Running Decay Calculations Only

```bash
python decay_engine.py
```

### Running All Patent Formula Calculations

```bash
python daily_calculations.py
```

## Important Notes for AI Assistants

1. **Patent-Pending Code**: This implements provisional patents. Be careful about suggesting changes that might affect patent claims.

2. **Foreign Key Dependencies**: `analyst_calls` requires `article_id` FK. Always save articles first.

3. **Table Naming**: Scraper creates snapshots in `narrative_snapshots`, decay engine reads from same table.

4. **Sentiment Range**: Always validate sentiment is within -100 to +100.

5. **API Keys**: Never expose or log API keys. They're loaded from environment variables.

6. **NewsAPI Free Tier**: Limited to 100 requests/day, 30-day lookback.

7. **yfinance Rate Limits**: Add delays between stock data requests.

8. **OpenAI JSON Mode**: Analyzer uses `response_format: {"type": "json_object"}` for reliable parsing.

9. **Supabase RLS**: Using service role key bypasses RLS policies.

10. **Audit Trail**: Divergence decoder creates cryptographic hashes for litigation-safe proofs.

## Testing

```bash
# Install test dependencies
pip install pytest pytest-cov

# Run tests (if available)
pytest

# Test setup verification
python test_setup.py  # (mentioned in README, not in repo)
```

## Debugging

Check `scraper.log` for detailed execution logs. GitHub Actions logs also available in workflow artifacts.

Common issues:
- "No articles found" - NewsAPI rate limit or blocking
- "Database connection failed" - Check Supabase credentials, project status
- "OpenAI API error 401" - Invalid or expired API key

## License

Proprietary - Patent Pending (Applications 63/971,470 & 63/971,478)
