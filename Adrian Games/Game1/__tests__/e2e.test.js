/**
 * Integration tests — Game1 static server (server.js)
 * Spins up the real server and fires actual HTTP requests.
 * No extra packages — uses Node's built-in http module.
 */
const http   = require('http');
const server = require('../server');

const PORT = 3002;

beforeAll(() => new Promise(resolve => server.listen(PORT, resolve)));
afterAll(()  => new Promise(resolve => server.close(resolve)));

describe('Integration — Game1 static server', () => {

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

    test('GET /index.js returns 200 and serves JavaScript', () =>
        new Promise((resolve, reject) => {
            http.get(`http://localhost:${PORT}/index.js`, res => {
                expect(res.statusCode).toBe(200);
                expect(res.headers['content-type']).toContain('application/javascript');
                res.resume();
                resolve();
            }).on('error', reject);
        })
    );

    test('GET /index.css returns 200 and serves CSS', () =>
        new Promise((resolve, reject) => {
            http.get(`http://localhost:${PORT}/index.css`, res => {
                expect(res.statusCode).toBe(200);
                expect(res.headers['content-type']).toContain('text/css');
                res.resume();
                resolve();
            }).on('error', reject);
        })
    );

    test('GET /nonexistent returns 404', () =>
        new Promise((resolve, reject) => {
            http.get(`http://localhost:${PORT}/nonexistent.html`, res => {
                expect(res.statusCode).toBe(404);
                res.resume();
                resolve();
            }).on('error', reject);
        })
    );
});
