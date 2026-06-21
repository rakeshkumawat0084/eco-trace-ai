import type { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateCarbonFootprint } from '../src/lib/calculations';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Allow OPTIONS for CORS if needed, but Vercel handles this mostly
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const data = calculateCarbonFootprint(req.body);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('[API CALCULATE ERROR]:', error);
    res.status(400).json({ success: false, error: 'Calculation failed', message: error.message });
  }
}
