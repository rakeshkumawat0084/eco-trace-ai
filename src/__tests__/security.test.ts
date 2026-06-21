import request from 'supertest';
import app from '../api';

describe('🚀 Security & Performance Compliance Audit', () => {
    
    test('🛡️ Security Headers: Should contain critical protection headers', async () => {
        const response = await request(app).get('/api/health');
        
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('⚡ Health Check: Endpoint should be responsive and low-latency', async () => {
        const start = Date.now();
        const response = await request(app).get('/api/health');
        const duration = Date.now() - start;
        
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(duration).toBeLessThan(200); // Expecting high efficiency
    });

    test('🚦 Rate Limiting: Should detect configuration (Integration Safety)', async () => {
        // We won't trigger 100 requests in a unit test to be polite, 
        // but we verify the headers are present if standardHeaders: true
        const response = await request(app).get('/api/health');
        expect(response.headers).toHaveProperty('ratelimit-limit');
    });

});
