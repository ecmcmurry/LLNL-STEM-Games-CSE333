export default async function handler(req, res) {
    
    if(req.method !== 'POST'){
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const referer = req.headers.referer || req.headers.origin || '';
    const allowedDomains = [
        'https://project-i2czj.vercel.app',
        'http://localhost:3000',
    ];

    const isAllowed = allowedDomains.some(domain => referer.startsWith(domain));
    if(!isAllowed){
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const { context } = req.body;

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

        if(!response.ok){
            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json({ hint: data.content[0].text });

    } catch(err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
}