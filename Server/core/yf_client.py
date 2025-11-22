# core/yf_client.py
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Set
import yfinance as yf
import math  
from models.option_types import (
    OptionChain,
    OptionQuote,
    OptionType,
    DEFAULT_TIMEZONE,
    DEFAULT_CURRENCY,
    DEFAULT_MULTIPLIER,
)
from utils.greeks import bs_greeks


# --------------------------------------------------------------------------- #
# Helpers internos
# --------------------------------------------------------------------------- #

def _parse_expiration_str(raw: str) -> date:
    """Convierte 'YYYY-MM-DD' (formato de yfinance) a date."""
    return datetime.strptime(raw, "%Y-%m-%d").date()

def _to_decimal(value) -> Optional[Decimal]:
    """Convierte un valor numérico a Decimal o None."""
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None
    
def compute_Mark(
    bid: Optional[Decimal],
    ask: Optional[Decimal]
) -> Optional[Decimal]:
    """Calcula el precio de mercado (mark) como el promedio de bid y ask."""
    if bid is not None and ask is not None:
        return (bid + ask) / Decimal("2")
    return bid or ask

def _to_int_or_none(value) -> Optional[int]:
    """Convierte a int o None, manejando NaN/None/grabage."""
    if value is None:
        return None
    try:
        # yfinance a veces da floats tipo 10.0 o NaN
        iv = int(value)
        if iv < 0:
            return None
        return iv
    except Exception:
        return None
def _row_to_option_quote(
    row,
    underlying: str,
    opt_type: OptionType,
    expiration: date,
    spot: float | None,
    valuation_date: date,
) -> OptionQuote:
    symbol = row.get("contractSymbol")

    strike = _to_decimal(row.get("strike"))
    last = _to_decimal(row.get("lastPrice"))
    bid = _to_decimal(row.get("bid"))
    ask = _to_decimal(row.get("ask"))

    volume_raw = row.get("volume")
    open_interest_raw = row.get("openInterest")
    iv_raw = row.get("impliedVolatility")

    currency = row.get("currency") or DEFAULT_CURRENCY

    mark = compute_Mark(bid, ask)

    quote: OptionQuote = {
        "symbol": symbol,
        "underlying": underlying,
        "type": opt_type,
        "spot": spot,
        "strike": strike if strike is not None else Decimal("0"),
        "expiration": expiration,
        "last": last,
        "bid": bid,
        "ask": ask,
        "mark": mark,
        "volume": _to_int_or_none(volume_raw),
        "open_interest": _to_int_or_none(open_interest_raw),
        "implied_volatility": float(iv_raw) if iv_raw is not None else None,
        "delta": None,
        "gamma": None,
        "theta": None,
        "vega": None,
        "currency": currency,
        "exchange": None,
        "multiplier": DEFAULT_MULTIPLIER,
    }

    iv = quote["implied_volatility"]

    # Si tenemos datos suficientes, calculamos griegas
    if (
        spot is not None
        and iv is not None
        and iv > 0.0
        and iv < 5.0
    ):
        try:
            greeks = bs_greeks(
                option_type=opt_type,
                spot=spot,
                strike=float(quote["strike"]),
                maturity=expiration,
                valuation_date=valuation_date,
                iv=iv,
                # no pasamos rate ni div_yield, usan los defaults (0.0)
            )

            if "delta" in greeks:
                quote["delta"] = greeks["delta"]
            if "gamma" in greeks:
                quote["gamma"] = greeks["gamma"]
            if "theta" in greeks:
                quote["theta"] = greeks["theta"]
            if "vega" in greeks:
                quote["vega"] = greeks["vega"]

        except Exception:
            pass

    return quote



# --------------------------------------------------------------------------- #
# API pública del cliente YF
# --------------------------------------------------------------------------- #

def get_option_chain(
    underlying: str,
    expiration: Optional[date] = None,
) -> OptionChain:
    """
    Obtiene la cadena de opciones de un subyacente usando yfinance.

    - Si `expiration` es None → trae TODAS las expiraciones disponibles.
    - Si `expiration` tiene valor → trae solo esa (o levanta ValueError si no existe).

    Devuelve un OptionChain con:
      - underlying
      - as_of (date)
      - timezone (str)
      - expirations (List[date])
      - strikes (List[Decimal])
      - options (List[OptionQuote])
    """
    ticker = yf.Ticker(underlying)
    
    hist = ticker.history(period="1d")
    spot: Optional[float]
    if hist is not None and not hist.empty:
        spot = float(hist["Close"].iloc[-1])
    else:
        spot = None
    valuation_date = date.today()

    raw_expirations: List[str] = list(ticker.options or [])
    if not raw_expirations:
        raise ValueError(f"No hay opciones disponibles para el subyacente: {underlying}")

    all_exp_dates: List[date] = [_parse_expiration_str(e) for e in raw_expirations]
 # Mapeamos date → raw expiration string
    expiration_map: dict[date, str] = {
    exp_date: raw for raw, exp_date in zip(raw_expirations, all_exp_dates)
    }

    available_dates = sorted(expiration_map.keys())

    if expiration is not None:
        # El usuario pidió una expiration específica
        if expiration not in expiration_map:
            raise ValueError(
                f"Expiration {expiration} no disponible para {underlying}. "
                f"Fechas disponibles: {available_dates}"
            )
        target_exp_dates = [expiration]
        target_raw_expirations = [expiration_map[expiration]]
    else:
        target_exp_dates = available_dates
        target_raw_expirations = [expiration_map[d] for d in available_dates]
        
    all_options: List[OptionQuote] = []
    all_strikes: Set[Decimal] = set()
    for exp_str, exp_date in zip(target_raw_expirations, target_exp_dates):
        chain = ticker.option_chain(exp_str)

        # Calls
        for _, row in chain.calls.iterrows():
            opt = _row_to_option_quote(
                row=row,
                underlying=underlying,
                opt_type="call",
                expiration=exp_date,
                spot=spot,
                valuation_date=valuation_date,
            )
            all_options.append(opt)
            strike = opt.get("strike")
            if isinstance(strike, Decimal):
                all_strikes.add(strike)

        # Puts
        for _, row in chain.puts.iterrows():
            opt = _row_to_option_quote(
                row=row,
                underlying=underlying,
                opt_type="put",
                expiration=exp_date,
                spot=spot,
                valuation_date=valuation_date,
            )
            all_options.append(opt)
            strike = opt.get("strike")
            if isinstance(strike, Decimal):
                all_strikes.add(strike)

    sorted_strikes: List[Decimal] = sorted(all_strikes)

    chain_obj: OptionChain = {
        "underlying": underlying,
        "as_of": date.today(),
        "timezone": DEFAULT_TIMEZONE,
        "expirations": target_exp_dates,
        "spot": spot,
        "strikes": sorted_strikes,
        "options": all_options,
    }

    return chain_obj

def get_expirations(underlying: str) -> List[date]:
    """
    Devuelve la lista de expiraciones disponibles para un subyacente
    como objetos date ordenados.
    """
    ticker = yf.Ticker(underlying)

    raw_expirations: List[str] = list(ticker.options or [])
    if not raw_expirations:
        raise ValueError(f"No hay opciones disponibles para el subyacente: {underlying}")

    all_exp_dates: List[date] = [_parse_expiration_str(e) for e in raw_expirations]
    all_exp_dates.sort()
    return all_exp_dates