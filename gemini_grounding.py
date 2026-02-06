"""
Gemini Grounding with Google Search Integration
Connects Gemini model to real-time web content for financial news discovery
and stores citations in Supabase for source tracking.
"""

import os
import logging
from datetime import datetime
from typing import List, Dict, Optional
import google.generativeai as genai
from supabase import Client

logger = logging.getLogger(__name__)

# Gemini API configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')


class GeminiGroundingSearcher:
    """
    Search for financial news using Gemini with Google Search Grounding.
    Grounding connects Gemini to real-time web content and works with all languages.
    """

    def __init__(self, api_key: Optional[str] = None, supabase_client: Optional[Client] = None):
        self.api_key = api_key or GEMINI_API_KEY
        self.db = supabase_client
        self.model = None

        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                # Use Gemini 2.0 Flash with Google Search grounding
                self.model = genai.GenerativeModel(
                    model_name='gemini-2.0-flash',
                    tools='google_search'
                )
                logger.info("✓ Gemini Grounding with Google Search initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
                self.model = None
        else:
            logger.warning("No GEMINI_API_KEY found - Gemini Grounding disabled")

    def search_news(self, ticker: str, stock_info: Dict, max_results: int = 3) -> List[Dict]:
        """
        Search for relevant financial news using Gemini with Google Search grounding.
        Returns articles with citations from grounded search results.
        """
        if not self.model:
            logger.warning("Gemini model not initialized")
            return []

        company_name = stock_info['name']
        industry = stock_info.get('industry', '')
        keywords = stock_info.get('keywords', [])

        try:
            # Construct search prompt for financial news
            prompt = f"""Find the {max_results} most recent and relevant financial news articles about {company_name} (stock ticker: {ticker}).

Focus on:
- Earnings reports and financial results
- Analyst ratings and price target changes
- Major business developments and announcements
- Market-moving news and investor sentiment
- {industry} industry news affecting {ticker}

For each article found, provide:
1. Article title
2. Source/publication name
3. Publication date (if available)
4. URL to the article
5. Brief summary (2-3 sentences) focusing on the financial impact

Keywords to consider: {', '.join(keywords[:5]) if keywords else company_name}

Return the information in a structured format."""

            # Generate with grounding enabled
            response = self.model.generate_content(prompt)

            # Extract grounding metadata and citations
            articles = self._parse_grounded_response(response, ticker, company_name)

            # Save citations to Supabase
            if self.db and articles:
                self._save_citations(articles, ticker)

            logger.info(f"Gemini Grounding found {len(articles)} articles for {ticker}")
            return articles[:max_results]

        except Exception as e:
            logger.error(f"Gemini Grounding search error for {ticker}: {e}")
            return []

    def _parse_grounded_response(self, response, ticker: str, company_name: str) -> List[Dict]:
        """Parse Gemini response and extract grounding citations."""
        articles = []

        try:
            # Get the response text
            response_text = response.text if hasattr(response, 'text') else str(response)

            # Extract grounding metadata if available
            grounding_metadata = None
            citations = []

            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'grounding_metadata'):
                    grounding_metadata = candidate.grounding_metadata

                    # Extract search entry point if available
                    if hasattr(grounding_metadata, 'search_entry_point'):
                        logger.debug(f"Search entry: {grounding_metadata.search_entry_point}")

                    # Extract grounding chunks (citations)
                    if hasattr(grounding_metadata, 'grounding_chunks'):
                        for chunk in grounding_metadata.grounding_chunks:
                            if hasattr(chunk, 'web'):
                                citations.append({
                                    'uri': chunk.web.uri if hasattr(chunk.web, 'uri') else None,
                                    'title': chunk.web.title if hasattr(chunk.web, 'title') else None
                                })

                    # Extract grounding supports for inline citations
                    if hasattr(grounding_metadata, 'grounding_supports'):
                        for support in grounding_metadata.grounding_supports:
                            if hasattr(support, 'grounding_chunk_indices'):
                                logger.debug(f"Support indices: {support.grounding_chunk_indices}")

            # Create article entries from citations
            for idx, citation in enumerate(citations):
                if citation.get('uri'):
                    articles.append({
                        'url': citation['uri'],
                        'title': citation.get('title', f'{company_name} News'),
                        'description': self._extract_description_for_url(response_text, citation['uri']),
                        'published_at': datetime.now().isoformat(),
                        'source': self._extract_domain(citation['uri']),
                        'ticker': ticker,
                        'company_name': company_name,
                        'grounding_source': 'gemini_google_search',
                        'citation_index': idx
                    })

            # If no structured citations, try to parse from response text
            if not articles:
                articles = self._parse_text_response(response_text, ticker, company_name)

        except Exception as e:
            logger.error(f"Error parsing grounded response: {e}")

        return articles

    def _parse_text_response(self, response_text: str, ticker: str, company_name: str) -> List[Dict]:
        """Fallback parser for response text when structured citations unavailable."""
        articles = []

        # Look for URLs in the response
        import re
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, response_text)

        for url in urls[:5]:  # Limit to 5 URLs
            # Skip non-article URLs
            if any(skip in url for skip in ['google.com/search', 'javascript:', '.pdf']):
                continue

            articles.append({
                'url': url,
                'title': f'{company_name} Financial News',
                'description': '',
                'published_at': datetime.now().isoformat(),
                'source': self._extract_domain(url),
                'ticker': ticker,
                'company_name': company_name,
                'grounding_source': 'gemini_google_search',
                'citation_index': len(articles)
            })

        return articles

    def _extract_domain(self, url: str) -> str:
        """Extract domain name from URL for source attribution."""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.netloc.replace('www.', '')
            return domain
        except:
            return 'Unknown'

    def _extract_description_for_url(self, response_text: str, url: str) -> str:
        """Try to extract description/summary related to a specific URL from response."""
        # Simple heuristic: find text near the URL mention
        try:
            url_idx = response_text.find(url)
            if url_idx > 0:
                # Get surrounding context
                start = max(0, url_idx - 200)
                end = min(len(response_text), url_idx + 200)
                context = response_text[start:end]
                # Clean up
                context = ' '.join(context.split())
                return context[:300]
        except:
            pass
        return ''

    def _save_citations(self, articles: List[Dict], ticker: str):
        """Save grounding citations to Supabase for tracking and attribution."""
        if not self.db:
            return

        try:
            for article in articles:
                citation_data = {
                    'ticker': ticker,
                    'source_url': article['url'],
                    'source_title': article.get('title', ''),
                    'source_domain': article.get('source', ''),
                    'grounding_source': article.get('grounding_source', 'gemini_google_search'),
                    'citation_index': article.get('citation_index', 0),
                    'retrieved_at': datetime.now().isoformat(),
                    'context_snippet': article.get('description', '')[:500]
                }

                # Upsert to avoid duplicates
                self.db.table('grounding_citations').upsert(
                    citation_data,
                    on_conflict='source_url,ticker'
                ).execute()

            logger.info(f"  ✓ Saved {len(articles)} citations for {ticker}")

        except Exception as e:
            logger.error(f"Error saving citations: {e}")

    def search_with_context(self, query: str, context: str = "") -> Dict:
        """
        Perform a grounded search with custom query and optional context.
        Useful for follow-up questions or specific research queries.
        """
        if not self.model:
            return {'error': 'Gemini model not initialized', 'results': []}

        try:
            full_prompt = f"{context}\n\n{query}" if context else query
            response = self.model.generate_content(full_prompt)

            # Extract citations
            citations = []
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'grounding_metadata'):
                    gm = candidate.grounding_metadata
                    if hasattr(gm, 'grounding_chunks'):
                        for chunk in gm.grounding_chunks:
                            if hasattr(chunk, 'web'):
                                citations.append({
                                    'uri': getattr(chunk.web, 'uri', None),
                                    'title': getattr(chunk.web, 'title', None)
                                })

            return {
                'response': response.text if hasattr(response, 'text') else str(response),
                'citations': citations,
                'grounded': len(citations) > 0
            }

        except Exception as e:
            logger.error(f"Grounded search error: {e}")
            return {'error': str(e), 'results': []}


# SQL schema for grounding_citations table (run once in Supabase)
CITATIONS_TABLE_SQL = """
-- Grounding Citations Table
-- Stores citations from Gemini Google Search grounding for source tracking

CREATE TABLE IF NOT EXISTS grounding_citations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    source_url TEXT NOT NULL,
    source_title TEXT,
    source_domain VARCHAR(255),
    grounding_source VARCHAR(50) DEFAULT 'gemini_google_search',
    citation_index INTEGER DEFAULT 0,
    retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context_snippet TEXT,
    article_id UUID REFERENCES articles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate citations for same URL and ticker
    UNIQUE(source_url, ticker)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_grounding_citations_ticker ON grounding_citations(ticker);
CREATE INDEX IF NOT EXISTS idx_grounding_citations_retrieved ON grounding_citations(retrieved_at);
CREATE INDEX IF NOT EXISTS idx_grounding_citations_domain ON grounding_citations(source_domain);

-- Enable RLS
ALTER TABLE grounding_citations ENABLE ROW LEVEL SECURITY;

-- Policy for service role access
CREATE POLICY "Service role can manage citations" ON grounding_citations
    FOR ALL USING (true);

COMMENT ON TABLE grounding_citations IS 'Stores citations from Gemini Grounding with Google Search for source attribution and tracking';
"""


def get_citations_schema() -> str:
    """Return the SQL schema for the grounding_citations table."""
    return CITATIONS_TABLE_SQL
