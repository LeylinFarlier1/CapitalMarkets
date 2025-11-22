from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP
from typing import Optional
from core.option_service import get_chain
from core.option_service import get_expirations_service

mcp = FastMCP(
    name="mcp-opciones",
    json_response=True,
)


@mcp.tool()
def options_get_chain(
    underlying: str,
    expiration: Optional[str] = None,
):
    """
    Devuelve la cadena de opciones para un subyacente y expiration date.

    - underlying: ticker del subyacente (ej: "AAPL", "SPY")
    - expiration: fecha de vencimiento en formato 'YYYY-MM-DD' 
    """
    return get_chain(underlying, expiration)

@mcp.tool()
def options_get_expirations(underlying: str) -> dict:
    """
    Devuelve las fechas de expiración disponibles para un subyacente.

    Ejemplo de respuesta:
    {
      "underlying": "AAPL",
      "expirations": ["2025-11-21", "2025-11-28", ...]
    }
    """
    expirations = get_expirations_service(underlying)
    return {
        "underlying": underlying,
        "expirations": expirations,
    }


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()