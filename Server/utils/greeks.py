# utils/greeks.py
from __future__ import annotations

from datetime import date
from math import log, sqrt, exp, erf
from typing import Literal, TypedDict, Optional

OptionType = Literal["call", "put"]


class Greeks(TypedDict, total=False):
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float


def _norm_cdf(x: float) -> float:
    """Función de distribución acumulativa de la normal estándar."""
    return 0.5 * (1.0 + erf(x / sqrt(2.0)))


def _norm_pdf(x: float) -> float:
    """Densidad de la normal estándar."""
    return (1.0 / sqrt(2.0 * 3.141592653589793)) * exp(-0.5 * x * x)


def bs_greeks(
    option_type: OptionType,
    spot: float,
    strike: float,
    maturity: date,
    valuation_date: date,
    iv: float,
    rate: float = 0.0,
    div_yield: float = 0.0,
) -> Greeks:
    """
    Greeks Black-Scholes-Merton para una opción europea sobre acción.

    - option_type: "call" o "put"
    - spot: precio actual del subyacente
    - strike: strike de la opción
    - maturity: fecha de vencimiento
    - valuation_date: fecha de valuación (hoy)
    - rate: tasa libre de riesgo (en decimales, ej. 0.04 = 4%)
    - iv: volatilidad implícita (en decimales, ej. 0.3 = 30%)
    - div_yield: dividend yield continuo (0 si no se usa)

    Devuelve un dict con delta, gamma, theta, vega, rho (en unidades “standard”).
    """

    days = (maturity - valuation_date).days
    T = days / 365.0

    # sanity checks mínimos
    if T <= 0 or spot <= 0 or strike <= 0 or iv <= 0:
        return {}

    S = float(spot)
    K = float(strike)
    r = float(rate)
    q = float(div_yield)
    sigma = float(iv)

    sqrtT = sqrt(T)
    denom = sigma * sqrtT
    if denom <= 0:
        return {}

    d1 = (log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / denom
    d2 = d1 - sigma * sqrtT

    Nd1 = _norm_cdf(d1)
    Nd2 = _norm_cdf(d2)
    N_minus_d1 = _norm_cdf(-d1)
    N_minus_d2 = _norm_cdf(-d2)
    nd1 = _norm_pdf(d1)

    greeks: Greeks = {}

    # Delta y Rho dependen del tipo
    if option_type == "call":
        greeks["delta"] = exp(-q * T) * Nd1
        greeks["rho"] = T * K * exp(-r * T) * Nd2 / 100.0  # por 1% de cambio en la tasa
        theta_num = (
            -(S * exp(-q * T) * nd1 * sigma) / (2 * sqrtT)
            - r * K * exp(-r * T) * Nd2
            + q * S * exp(-q * T) * Nd1
        )
    else:  # put
        greeks["delta"] = exp(-q * T) * (Nd1 - 1.0)
        greeks["rho"] = -T * K * exp(-r * T) * N_minus_d2 / 100.0
        theta_num = (
            -(S * exp(-q * T) * nd1 * sigma) / (2 * sqrtT)
            + r * K * exp(-r * T) * N_minus_d2
            - q * S * exp(-q * T) * N_minus_d1
        )

    # Gamma, Vega, Theta
    greeks["gamma"] = exp(-q * T) * nd1 / (S * sigma * sqrtT)
    # vega por 1% cambio de vol (dividido 100)
    greeks["vega"] = S * exp(-q * T) * nd1 * sqrtT / 100.0
    # Theta en días (theta_num está en “por año”)
    greeks["theta"] = theta_num / 365.0

    return greeks
