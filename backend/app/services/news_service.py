import yfinance as yf
import asyncio
from typing import List, Dict, Any
from datetime import datetime

# Curated list of global symbols to fetch news from
GLOBAL_SYMBOLS = [
    "^GSPC",   # S&P 500
    "^DJI",    # Dow Jones
    "^IXIC",   # Nasdaq
    "BTC-USD", # Bitcoin
    "EURUSD=X",# Euro/USD
    "GC=F",    # Gold
    "CL=F",    # Crude Oil
    "^FTSE",   # FTSE 100
    "^N225",   # Nikkei 225
]

class NewsService:
    @staticmethod
    async def fetch_global_news(tickers: List[str] = None) -> List[Dict[str, Any]]:
        """
        Fetches news for major global indices and assets.
        Aggregates and sorts them by recency.
        """
        all_news = []
        
        # Determine which symbols to fetch
        symbols_to_fetch = tickers if tickers else GLOBAL_SYMBOLS
        
        # We can run these in parallel or loop. yfinance calls are sync but fast for metadata.
        # Ideally we'd wrap in run_in_executor if they were blocking IO, 
        # but for this scale sync loop is acceptable or we can optimize later.
        
        # To make it slightly faster and "async-like", we can use a simple loop 
        # as yf.Ticker(...).news is usually a property access or hidden API call
        
        for symbol in symbols_to_fetch:
            try:
                ticker = yf.Ticker(symbol)
                news = ticker.news
                if news:
                    for item in news:
                        # Normalize structural differences
                        # properties often inside 'content' dictionary
                        content = item.get('content', item)
                        
                        # Extract basic fields
                        item_data = {
                            'uuid': content.get('id', item.get('uuid', str(hash(content.get('title', ''))))),
                            'title': content.get('title', item.get('title')),
                            'publisher': content.get('provider', {}).get('displayName', item.get('publisher', 'Unknown')),
                            'link': content.get('clickThroughUrl', {}).get('url', item.get('link')),
                            'type': content.get('contentType', item.get('type', 'STORY')),
                            'thumbnail': content.get('thumbnail', item.get('thumbnail')),
                            'related_symbol': symbol
                        }

                        # Handle Date/Time
                        # yfinance might return 'providerPublishTime' (unix) or 'pubDate' (ISO)
                        pub_time = content.get('providerPublishTime', item.get('providerPublishTime'))
                        if not pub_time and content.get('pubDate'):
                            try:
                                dt = datetime.fromisoformat(content['pubDate'].replace('Z', '+00:00'))
                                pub_time = int(dt.timestamp())
                            except:
                                pub_time = 0
                        
                        item_data['providerPublishTime'] = pub_time

                        all_news.append(item_data)

            except Exception as e:
                print(f"Error fetching news for {symbol}: {e}")
                continue
        
        # Deduplicate
        seen_uuids = set()
        unique_news = []
        for item in all_news:
            uuid = item['uuid']
            if uuid not in seen_uuids:
                seen_uuids.add(uuid)
                unique_news.append(item)
        
        # Sort
        unique_news.sort(key=lambda x: x.get('providerPublishTime', 0), reverse=True)
        
        return unique_news

news_service = NewsService()
