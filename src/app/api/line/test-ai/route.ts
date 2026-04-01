import { NextResponse } from 'next/server'

export async function GET() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ 
      error: 'GEMINI_API_KEY not set',
      env: Object.keys(process.env).filter(k => k.includes('GEMINI'))
    })
  }
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: '你好' }] }]
        })
      }
    )
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      hasApiKey: true,
      response: data
    })
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      hasApiKey: true
    })
  }
}
