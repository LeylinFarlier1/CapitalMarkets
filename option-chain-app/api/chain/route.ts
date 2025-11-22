import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const underlying = searchParams.get('underlying') || 'NVDA';
    const expiration = searchParams.get('expiration') || '';

    // Ruta al directorio del servidor Python
    const serverDir = path.join(process.cwd(), '..', '..', 'Server');

    // Construye comando Python
    let pythonScript = `
import sys
sys.path.insert(0, r'${serverDir}')
from core.option_service import get_chain
from datetime import date
import json

try:
    underlying = '${underlying}'
    expiration_str = '${expiration}' if '${expiration}' else None
    
    if expiration_str:
        chain = get_chain(underlying, expiration_str)
    else:
        from core.yf_client import get_option_chain
        chain = get_option_chain(underlying)
    
    # Serializa dates a strings
    def serialize(obj):
        if isinstance(obj, date):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")
    
    print(json.dumps(chain, default=serialize))
except Exception as e:
    import traceback
    print(json.dumps({'error': str(e), 'traceback': traceback.format_exc()}))
`;

    // Ejecuta Python
    const output = execSync(`python -c "${pythonScript.replace(/"/g, '\\"')}"`, {
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