import yfinance as yf

ticker = yf.Ticker("AAPL")
print(ticker.options)
import yfinance as yf

ticker = yf.Ticker("AAPL")
chain = ticker.option_chain("2025-11-21")
print(chain.calls.head())
print(chain.puts.head())


print(chain.calls.iloc[0].to_dict())
