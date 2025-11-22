# core/option_service.py
from __future__ import annotations

from datetime import date
from typing import List
from core.yf_client import get_expirations as yf_get_expirations

from models.option_types import OptionChain
from core.yf_client import get_option_chain


def get_chain(
    underlying: str,
    expiration: str,  # ← ahora es OBLIGATORIO y string
) -> OptionChain:
    """
    Obtiene la cadena de opciones para un vencimiento específico.
    
    Parámetros:
        underlying: str     → ej: "AAPL"
        expiration: str     → ej: "2025-12-19" (formato YYYY-MM-DD)
    """
    exp_date = date.fromisoformat(expiration)
    return get_option_chain(underlying, exp_date)


def get_expirations_service(underlying: str) -> List[str]:
    """
    Envuelve get_expirations de YF y devuelve las fechas en formato ISO (YYYY-MM-DD)
    para que viajen bien como JSON/MCP.
    """
    dates: List[date] = yf_get_expirations(underlying)
    return [d.isoformat() for d in dates]

