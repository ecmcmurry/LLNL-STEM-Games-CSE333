require('dotenv').config();
import handler from '../api/hint.js';

// fake req/res to call the handler directly without a server
function mockReqRes({ method = 'POST', body = {} } = {}) {
    const req = { method, body };
    const res = {_status: null, _body: null, status(code) { this._status = code; return this; },
    json(data) { this._body  = data; return this; },
    };
    return {req, res};
}

//testing our hint API endpoint
describe('POST /api/hint — integration tests', () => {

    //the hint button only sends POST so anything else should get blocked
    test('Incorrect method call will return a 405', async () => {
        const { req, res } = mockReqRes({ method: 'GET' });
        await handler(req, res);
        expect(res._status).toBe(405);
        expect(res._body).toEqual({ error: 'Method not allowed' });
    });

    //if the hint button fires but theres no level data attached it shouldnt call Claude
    test('returns 400 when there is no available data to grab', async () => {
        const {req, res} = mockReqRes({ body: {} });
        await handler(req, res);
        expect(res._status).toBe(400);
        expect(res._body).toEqual({ error: 'Missing context' });
    });

    //runs through the actual handler with a real level context
    test('returns 200 with a real hint from Claude when valid context is sent', async () => {
        const {req, res} = mockReqRes({ body: { context: 'Student is on level 1. Goal: current Formula: I = V / R. They have not tried anything yet.' } });
        await handler(req, res);
        expect(res._status).toBe(200);
        expect(res._body).toHaveProperty('hint');
        expect(typeof res._body.hint).toBe('string');
        //real claude response is always a full sentence, not a short fallback
        expect(res._body.hint.length).toBeGreaterThan(40);
    }, 15000);

    //making sure the game doesnt crash if claude goes down mid session
    test('returns 500 when an API call fails', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
        const {req, res} = mockReqRes({ body: { context: 'Hint please' } });
        await handler(req, res);
        expect(res._status).toBe(500);
        expect(res._body).toEqual({ error: 'Something went wrong' });
    });
});
