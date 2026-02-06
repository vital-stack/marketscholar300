#!/usr/bin/env python3
"""
Update live market data for top tickers.
Called by GitHub Actions workflow.
"""

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    from market_data_live import LiveMarketDataCollector
    from marketscholar_scraper import TOP_STOCKS

    collector = LiveMarketDataCollector()

    # Process top 20 tickers per run
    for ticker in list(TOP_STOCKS.keys())[:20]:
        try:
            collector.save_ticker_snapshot(ticker)
        except Exception as e:
            logger.error(f"Error on {ticker}: {e}")

    logger.info("Market data update complete")

if __name__ == "__main__":
    main()
