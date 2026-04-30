const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const server = http.createServer(async (req, res) => {

    // serve static files
    if(req.method === 'GET'){
        let filePath = '.' + req.url;
        if(filePath === './') filePath = './Home.html';

        const ext = path.extname(filePath);
        const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
        };

        fs.readFile(filePath, (err, data) => {
            if(err){
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
            res.end(data);
        });
    }

    // handle AI hint requests
    if(req.method === 'POST' && req.url === '/api/hint'){
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { context } = JSON.parse(body);

                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': process.env.ADRIAN,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: 'claude-haiku-4-5-20251001',
                        max_tokens: 150,
                        system: `You are a friendly circuit tutor in an educational game for students.
                                 The student is learning circuit theory through drag and drop puzzles.
                                 NEVER give the direct answer.
                                 Ask guiding questions instead.
                                 Keep responses under 2 sentences.
                                 Be encouraging and positive.`,
                        messages: [{ role: 'user', content: context }]
                    })
                });

                const data = await response.json();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ hint: data.content[0].text }));

            } catch(err) {
                console.error('Error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Something went wrong' }));
            }
        });
    }
});

if (require.main === module) {
    server.listen(3000, () => {
        console.log('Server running at http://localhost:3000');
        console.log('API Key loaded:', process.env.ADRIAN ? '✅ Yes' : '❌ No');
    });
}

module.exports = server;