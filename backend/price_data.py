import yfinance as yf
import pandas as pd
import numpy as np
from typing import Optional, List


def fetch_historical_prices(symbol: str, start: str, end: str) -> Optional[pd.Series]:
    """
    Fetch historical daily closing prices for a given symbol between start and end dates.
    Returns a pandas Series indexed by date.
    """
    # Yahoo Finance uses hyphens instead of periods in ticker symbols
    yf_symbol = symbol.replace('.', '-')
    
    try:
        data = yf.download(yf_symbol, start=start, end=end, progress=False, auto_adjust=True)
        if isinstance(data.columns, pd.MultiIndex):
            # Multiple symbols case - extract Close column
            if 'Close' in data.columns.get_level_values(0):
                return data['Close'].squeeze()
        elif 'Close' in data.columns:
            # Single symbol case
            return data['Close']
        return None
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None


def calculate_historical_volatility(prices: pd.Series, window: int = 252) -> Optional[float]:
    """
    Calculate annualized historical volatility from a price series.
    Uses daily log returns and computes std dev over the window.
    """
    if prices is None or len(prices) < 2:
        return None
    returns = np.log(prices / prices.shift(1)).dropna()
    if len(returns) < 1:
        return None
    
    # Use all available returns if less than window size
    actual_window = min(window, len(returns))
    std = returns[-actual_window:].std()
    
    # Annualize the volatility using standard 252 trading days per year
    volatility = std * np.sqrt(252)
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
        # Yahoo Finance uses hyphens instead of periods in ticker symbols
        yf_symbols = [sym.replace('.', '-') for sym in symbols]
        
        # Download price data for all symbols
        data = yf.download(yf_symbols, start=start, end=end, interval=frequency, progress=False, group_by='ticker', auto_adjust=True)
        # If only one symbol, data is a DataFrame, else it's a MultiIndex DataFrame
        if len(symbols) == 1:
            prices = data['Close'].to_frame()
            prices.columns = symbols
        else:
            # yfinance returns columns like ('AAPL', 'Close'), ('GOOG', 'Close'), ...
            closes = []
            for i, sym in enumerate(symbols):
                yf_sym = yf_symbols[i]
                if (yf_sym, 'Close') in data.columns:
                    closes.append(data[(yf_sym, 'Close')])
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