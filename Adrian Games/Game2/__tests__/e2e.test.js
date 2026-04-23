/**
 * E2E tests — Game 2 server (server.js)
 * Spins up the real server on a test port and fires actual HTTP requests.
 * No extra packages uses Node's built-in http module.
 */
const http   = require('http');
const server = require('../server');

const PORT = 3001;

function request({ method, path, body } = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = http.request({ hostname: 'localhost', port: PORT, path, method,
            headers: { 'Content-Type': 'application/json',
                       ...(payload && { 'Content-Length': Buffer.byteLength(payload) }) }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data || 'null') }));
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

beforeAll(() => new Promise(resolve => server.listen(PORT, resolve)));
afterAll(()  => new Promise(resolve => server.close(resolve)));

//E2E tests below for the game

describe('E2E — Game 2 server (server.js)', () => {

    test('GET / returns 200 and serves HTML', () =>
        new Promise((resolve, reject) => {
            http.get(`http://localhost:${PORT}/`, res => {
                expect(res.statusCode).toBe(200);
                expect(res.headers['content-type']).toContain('text/html');
                res.resume();
                resolve();
            }).on('error', reject);
        })
    );

    //Checking if the API call occurs or if its just an empty string.
    test('POST /api/hint with real context returns a hint from Claude', async () => {
        const res = await request({
            method: 'POST',
            path: '/api/hint',
            body: { context: 'Student is on level 1. Goal: current Formula: I = V / R. They have not tried anything yet.' }
        });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('hint');
        expect(typeof res.body.hint).toBe('string');
        expect(res.body.hint.length).toBeGreaterThan(0);
    }, 15000); //The API is given 15 seconds to respond to the users actions with Onclick

    test('POST /api/hint with malformed JSON returns 500', () =>
        new Promise((resolve, reject) => {
            const payload = 'not-valid-json';
            const req = http.request(
                { hostname: 'localhost', port: PORT, path: '/api/hint', method: 'POST',
                  headers: { 'Content-Type': 'application/json',
                             'Content-Length': Buffer.byteLength(payload) } },
                (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        expect(res.statusCode).toBe(500);
                        expect(JSON.parse(data)).toHaveProperty('error');
                        resolve();
                    });
                }
            );
            req.on('error', reject);
            req.write(payload);
            req.end();
        })
    );
});
