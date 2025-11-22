from __future__ import annotations   #Hace que todas las anotaciones de tipo (type hints) se guarden como strings en vez de evaluarse inmediatamente
from typing import Literal, TypedDict, List, Optional #Importa herramientas modernas de tipado estático.
from datetime import date #Importa la clase date (solo fecha, sin hora).
from decimal import Decimal #Importa el tipo numérico de precisión arbitraria.


# --------------------------------------------------------------------------- #
# Core literals
# --------------------------------------------------------------------------- #
OptionType = Literal['call', 'put']  #Define un tipo literal para opciones: 'call' o 'put'.
OptionStyle = Literal["american", "european"] #Define un tipo literal para estilos de opciones: 'american' o 'european'.


# --------------------------------------------------------------------------- #
# TypedDicts #Total=False permite que todos los campos sean opcionales.
# --------------------------------------------------------------------------- #
class OptionQuote(TypedDict, total=False):    
    symbol: str                     #Símbolo del activo subyacente.
    underlying: str                   #Nombre del activo subyacente.
    type: OptionType               #Tipo de opción: 'call' o 'put'.
    spot: Optional[float]
    strike: Decimal                #Precio de ejercicio de la opción.
    expiration: date               #Fecha de vencimiento de la opción, en vez de string.
    last: Decimal | None                #Último precio negociado de la opción.
    bid: Decimal  | None              #Precio de compra actual.
    ask: Decimal  | None                 #Precio de venta actual.
    mark: Decimal | None         #Precio de mercado estimado.
    volume: int  | None                  #Volumen de negociación del día.
    open_interest: int  | None           #Interés abierto total.
    implied_volatility: float | None     #Volatilidad implícita.
    delta: float | None                 #Sensibilidad del precio de la opción al precio del subyacente.
    gamma: float | None                 #Sensibilidad de delta al precio del subyacente.
    theta: float | None                 #Sensibilidad del precio de la opción al paso del tiempo.
    vega: float | None                  #Sensibilidad del precio de la opción a la volatilidad del subyacente.
    rho: float | None                   #Sensibilidad del precio de la opción a la tasa de interés.
    currency: str | None                #Moneda en la que se cotiza la opción.
    exchange: str | None                #Bolsa donde se negocia la opción.
    multiplier: Decimal | None            #Multiplicador del contrato de la opción.
    
class OptionChain(TypedDict, total=False):
    underlying: str
    as_of: date  #cuando se obtuvo la cadena de opciones
    timezone: str  #zona horaria de la cadena de opciones e.g 'America/New_York'
    expirations: List[date]  #fechas de vencimiento disponibles
    strikes: List[Decimal]  #precios de ejercicio disponibles
    options: List[OptionQuote]  #lista de opciones disponibles
    
    
DEFAULT_TIMEZONE = "America/New_York"
DEFAULT_CURRENCY = "USD"
DEFAULT_MULTIPLIER = Decimal("100")  # típico equity option