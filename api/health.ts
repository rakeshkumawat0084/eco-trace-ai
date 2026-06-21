export default function handler(req: any, res: any) {
  try {
    res.status(200).json({
      status: 'online',
      timestamp: new Date().toISOString(),
      ai_status: !!process.env.GEMINI_API_KEY ? 'key_configured' : 'key_missing',
      version: '1.1.5-standalone',
      routes: ['/api/chat', '/api/calculate', '/api/health']
    });
  } catch (error) {
    res.status(200).json({ status: 'error', message: String(error) });
  }
}
