# api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.yf_client import get_option_chain
from datetime import date
import uvicorn

app = FastAPI(title="Option Chain API")

# Permite que tu Next.js (localhost:3000) haga fetch
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://tu-dominio.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/chain")
async def chain(underlying: str = "NVDA", expiration: str | None = None):
    try:
        if expiration:
            exp_date = date.fromisoformat(expiration)
            data = get_option_chain(underlying, exp_date)
        else:
            data = get_option_chain(underlying)
        
        # Añade spot si no está
        if "spot" not in data:
            import yfinance as yf
            ticker = yf.Ticker(underlying)
            data["spot"] = ticker.history(period="1d")["Close"].iloc[-1]
        
        return data
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)