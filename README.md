# MarketScholar: Patent-Based Financial Narrative Intelligence

An automated system implementing two provisional patents for tracking financial analyst credibility and narrative lifecycle decay.

## 🎯 What This Does

This system automatically:

1. **Scrapes financial news** from Google News for major tech stocks
2. **Analyzes articles** using OpenAI to extract narratives and sentiment
3. **Tracks narrative decay** over time using exponential decay physics
4. **Monitors pre-publication activity** to detect potential market manipulation
5. **Calculates analyst credibility** across 8 dimensions
6. **Predicts narrative exhaustion** before it happens

## 🔬 Patent Implementation

### Patent #1: Analyst Credibility Assessment
- **Application #**: 63/971,470
- **Title**: System and Method for Multi-Dimensional Financial Analyst Credibility Assessment with Pre-Publication Activity Monitoring

**Implements**:
- 8-dimensional credibility scoring
- Pre-publication market activity monitoring (30-day lookback)
- Narrative propagation coordination detection
- Historical panic pattern matching

### Patent #2: Narrative Lifecycle Tracking  
- **Application #**: 63/971,478
- **Title**: System and Method for Tracking Financial Narrative Lifecycle with Decay Monitoring and Fair Value Stress Testing

**Implements**:
- Narrative decay rate calculation
- Half-life prediction using exponential decay model
- Fair value stress testing
- Exhaustion confidence scoring
- Status classification (ACTIVE, EXHAUSTED, FAILED, VALIDATED)

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                            │
│  (Runs 2x daily: 7 AM & 2 PM UTC)                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├──> 1. Article Scraper (marketscholar_scraper.py)
                 │    ├─ Google News search
                 │    ├─ Article text extraction
                 │    ├─ OpenAI analysis
                 │    └─ Save to Supabase
                 │
                 └──> 2. Decay Monitor (decay_engine.py)
                      ├─ Calculate decay rates
                      ├─ Predict exhaustion
                      ├─ Update narrative status
                      └─ Calculate correlations
                           │
                           ▼
                 ┌─────────────────┐
                 │   Supabase DB   │
                 │  (PostgreSQL)   │
                 │                 │
                 │ • articles      │
                 │ • narratives    │
                 │ • analysts      │
                 │ • snapshots     │
                 └─────────────────┘
```

## 📊 Database Schema

11 tables implementing patent requirements:

- **articles** - Raw article data
- **narratives** - Narrative lifecycle tracking
- **narrative_daily_snapshots** - Time-series data
- **narrative_prerequisites** - Testable conditions
- **analysts** - Analyst profiles and scores
- **analyst_calls** - Individual predictions
- **pre_publication_tracking** - 30-day market data
- **historical_panics** - Pattern database
- **narrative_propagation** - Coordination detection
- **narrative_types** - Reference data
- **Views & Functions** - Automated calculations

## 🚀 Quick Start

### Prerequisites

- GitHub account
- Supabase account (free tier OK)
- OpenAI API key (~$3-10/month)

### Setup (10 minutes)

1. **Clone this repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/marketscholar-scraper.git
   cd marketscholar-scraper
   ```

2. **Set up Supabase**
   - Create project at [supabase.com](https://supabase.com)
   - Run `database_schema.sql` in SQL Editor
   - Copy URL and service_role key

3. **Get OpenAI API key**
   - Visit [platform.openai.com](https://platform.openai.com)
   - Create new secret key
   - Add payment method

4. **Configure GitHub Secrets**
   - Go to repo Settings → Secrets → Actions
   - Add three secrets:
     - `OPENAI_API_KEY`
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`

5. **Test the system**
   ```bash
   # Local test (optional)
   python test_setup.py
   
   # Or trigger GitHub Action manually
   # Go to Actions tab → Run workflow
   ```

📖 **Full setup guide**: See [SETUP_GUIDE.md](SETUP_GUIDE.md)

## 📈 Example Outputs

### Narrative Tracking

```sql
-- Active narratives with decay metrics
SELECT 
    ticker,
    narrative_name,
    days_elapsed,
    decay_rate,
    half_life_days,
    status,
    exhaustion_confidence
FROM narratives
WHERE status = 'ACTIVE'
ORDER BY exhaustion_confidence DESC;
```

Example output:
```
ticker | narrative_name              | days_elapsed | decay_rate | half_life | status | exhaustion_conf
-------|----------------------------|--------------|------------|-----------|--------|----------------
NVDA   | DeepSeek AI threatens...   | 14           | -3.2       | 12.8      | FAILED | 78%
TSLA   | Deliveries miss estimates  | 7            | -2.1       | 18.5      | ACTIVE | 35%
```

### Analyst Performance

```sql
-- Top performing analysts
SELECT 
    name,
    total_calls,
    directional_accuracy_pct,
    composite_credibility_score,
    credibility_verdict
FROM analysts
WHERE total_calls >= 5
ORDER BY composite_credibility_score DESC
LIMIT 10;
```

## 🔧 Key Files

| File | Purpose |
|------|---------|
| `marketscholar_scraper.py` | Main scraping & analysis engine |
| `decay_engine.py` | Narrative decay calculations |
| `database_schema.sql` | Complete Supabase schema |
| `requirements.txt` | Python dependencies |
| `.github/workflows/daily-scraper.yml` | Automation config |
| `test_setup.py` | Diagnostic tool |
| `SETUP_GUIDE.md` | Step-by-step instructions |

## 💰 Cost Breakdown

**Monthly costs** (assuming 2 runs/day, 10 tickers, 3 articles each):

- **Supabase**: $0 (free tier: 500MB, 2GB bandwidth)
- **OpenAI**: $3-10 (60 articles/day × $0.002 = $3.60/month)
- **GitHub Actions**: $0 (2,000 free minutes/month, uses ~100)

**Total**: ~$3-10/month

## 📚 Technical Details

### Narrative Decay Formula

```python
# Exponential decay model (Patent #2 Claim 4)
E(t) = E₀ × e^(-λt)

where:
  E(t) = narrative energy at time t
  E₀ = initial sentiment × reach
  λ = decay constant
  t = time in days

# Half-life calculation
t_half = ln(2) / λ
```

### Credibility Score Calculation

```python
# 8-Dimensional weighted composite (Patent #1 Claim 1)
composite_score = (
    identity_provenance * 0.10 +
    claim_structure * 0.15 +
    historical_accuracy * 0.30 +
    narrative_consistency * 0.15 +
    crowd_divergence * 0.10 +
    incentive_alignment * 0.10 +
    language_quality * 0.10 +
    source_discipline * 0.10
)
```

## 🐛 Troubleshooting

### "No articles found"
Google may be blocking requests. This is normal and will retry on next run. For production, consider:
- [Serper API](https://serper.dev) (2,500 free searches/month)
- [ScraperAPI](https://www.scraperapi.com) (handles blocks)

### "Database connection failed"
- Verify Supabase project isn't paused
- Check you're using `service_role` key (not `anon` key)
- Run `database_schema.sql` in SQL Editor

### "OpenAI API error 401"
- Verify API key is correct
- Check billing is set up
- Ensure usage limits aren't exceeded

Run diagnostics:
```bash
python test_setup.py
```

## 🔮 Roadmap

- [ ] Add historical panic pattern matching
- [ ] Implement full analyst credibility calculation
- [ ] Build web dashboard (Streamlit/Next.js)
- [ ] Add Discord/Slack notifications
- [ ] Integrate alternative news sources
- [ ] Add options activity tracking
- [ ] Expand to more tickers (50+)

## 📄 License

Proprietary - Patent Pending

**Patent Applications**:
- 63/971,470 - Analyst Credibility Assessment
- 63/971,478 - Narrative Lifecycle Tracking

## 🤝 Contributing

This is a patent-pending system. For collaboration inquiries:
- Email: [your-email]
- GitHub Issues: Bug reports only

## ⚖️ Legal Notice

This system is for research and educational purposes. Not financial advice. The methods implemented are subject to provisional patent applications filed with the USPTO.

## 🎓 Citation

If you reference this work:

```
Walsh, T. K. (2026). MarketScholar: Multi-Dimensional Financial Analyst 
Credibility Assessment and Narrative Lifecycle Tracking. 
Patent Applications 63/971,470 & 63/971,478.
```

---

**Built with**: Python 3.11 • Supabase • OpenAI • GitHub Actions • yfinance

**Author**: Tara K. Walsh  
**Patent Filing Date**: January 29, 2026
