import yfinance as yf
import json

def debug_news():
    symbol = "^GSPC"
    print(f"Fetching news for {symbol}...")
    try:
        ticker = yf.Ticker(symbol)
        news = ticker.news
        if news and len(news) > 0:
            with open("debug_news.json", "w") as f:
                json.dump(news[0], f, indent=2)
            print("Wrote first item to debug_news.json")
        else:
            print("No news found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_news()
