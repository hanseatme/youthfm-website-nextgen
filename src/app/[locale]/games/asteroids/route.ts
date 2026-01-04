import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'games', 'asteroids.html')
    const html = await readFile(filePath, 'utf8')
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}

