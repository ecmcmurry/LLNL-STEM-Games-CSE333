export default async function handler(req, res) {

    if(req.method !== 'POST'){
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { context } = req.body;

        if(!context){
            return res.status(400).json({ error: 'Missing context' });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type':      'application/json',
                'x-api-key':         process.env.ADRIAN,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model:      'claude-haiku-4-5-20251001',
                max_tokens: 300,
                system:     `You are a friendly circuit tutor in an educational game for students.
                             The student is learning circuit theory through drag and drop puzzles.

                             For hints:
                             NEVER give the direct answer.
                             Ask guiding questions instead.
                             Keep responses under 2 sentences.
                             Be encouraging and positive.

                             For performance reviews:
                             Give a 2 sentence personalized study recommendation.
                             Be specific about what to study.
                             Be encouraging and mention their strengths.`,
                messages: [{ role: 'user', content: context }]
            })
        });

        if(!response.ok){
            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json({ hint: data.content[0].text });

    } catch(err) {
        console.error('[hint] Error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
}
