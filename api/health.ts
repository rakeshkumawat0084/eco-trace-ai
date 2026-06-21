import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    ai_status: !!process.env.GEMINI_API_KEY ? 'key_configured' : 'key_missing',
    source: 'standalone_health_check'
  });
}
