import yfinance as yf
import pandas as pd
import numpy as np
from typing import Optional


def fetch_historical_prices(symbol: str, start: str, end: str) -> Optional[pd.Series]:
    """
    Fetch historical daily closing prices for a given symbol between start and end dates.
    Returns a pandas Series indexed by date.
    """
    try:
        data = yf.download(symbol, start=start, end=end, progress=False)
        if 'Close' in data:
            return data['Close']
        else:
            return None
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None


def calculate_historical_volatility(prices: pd.Series, window: int = 252) -> Optional[float]:
    """
    Calculate annualized historical volatility from a price series.
    Uses daily log returns and computes std dev over the window.
    """
    if prices is None or len(prices) < window:
        return None
    returns = np.log(prices / prices.shift(1)).dropna()
    if len(returns) < window:
        return None
    std = returns[-window:].std()
    volatility = std * np.sqrt(252)  # Annualize
    return float(volatility)


def get_asset_volatility(symbol: str, start: str, end: str, window: int = 252) -> Optional[float]:
    """
    Fetch prices and calculate annualized historical volatility for an asset.
    """
    prices = fetch_historical_prices(symbol, start, end)
    return calculate_historical_volatility(prices, window) 