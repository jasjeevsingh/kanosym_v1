import yfinance as yf
import pandas as pd
import numpy as np
from typing import Optional, List


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


def fetch_correlation_matrix(symbols: List[str], start: str, end: str, frequency: str = '1d') -> Optional[List[List[float]]]:
    """
    Fetch historical prices for all symbols and compute the correlation matrix of returns.
    Returns a 2D list (matrix) or None on error.
    """
    try:
        # Download price data for all symbols
        data = yf.download(symbols, start=start, end=end, interval=frequency, progress=False, group_by='ticker', auto_adjust=True)
        # If only one symbol, data is a DataFrame, else it's a MultiIndex DataFrame
        if len(symbols) == 1:
            prices = data['Close'].to_frame()
            prices.columns = symbols
        else:
            # yfinance returns columns like ('AAPL', 'Close'), ('GOOG', 'Close'), ...
            closes = []
            for sym in symbols:
                if (sym, 'Close') in data.columns:
                    closes.append(data[(sym, 'Close')])
                else:
                    closes.append(pd.Series(index=data.index, dtype=float))
            prices = pd.concat(closes, axis=1)
            prices.columns = symbols
        # Drop rows with all NaNs
        prices = prices.dropna(how='all')
        # Compute returns
        returns = prices.pct_change().dropna()
        # Compute correlation matrix
        corr = returns.corr().values
        return corr.tolist()
    except Exception as e:
        print(f"Error fetching correlation matrix: {e}")
        return None 