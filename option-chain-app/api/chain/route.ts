import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const underlying = searchParams.get('underlying') || 'NVDA';
    const expiration = searchParams.get('expiration');

    // Ruta al directorio del servidor Python
    const serverDir = path.join(process.cwd(), '..', '..', 'Server');

    // Usa uv para resolver dependencias declaradas en pyproject/uv.lock (con fallback a python)
    const pythonRunner = process.env.PYTHON_BIN || 'uv run python';

    // Construye comando Python con parámetros seguros
    const pythonScript = `
import sys
import json
import traceback
from datetime import date

try:
    sys.path.insert(0, ${JSON.stringify(serverDir)})
    from core.option_service import get_chain
    from core.yf_client import get_option_chain

    underlying = ${JSON.stringify(underlying)}
    expiration_str = ${JSON.stringify(expiration)}

    if expiration_str:
        chain = get_chain(underlying, expiration_str)
    else:
        chain = get_option_chain(underlying)

    def serialize(obj):
        if isinstance(obj, date):
            return obj.isoformat()
        return obj

    print(json.dumps(chain, default=serialize))
except Exception as e:
    print(json.dumps({'error': str(e), 'traceback': traceback.format_exc()}))
`;

    const command = `${pythonRunner} -c "${pythonScript.replace(/"/g, '\\"')}"`;

    // Ejecuta Python
    const output = execSync(command, {
      cwd: serverDir,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    const result = JSON.parse(output);

    if (result.error) {
      console.error('Python error:', result.error, result.traceback);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API route error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
