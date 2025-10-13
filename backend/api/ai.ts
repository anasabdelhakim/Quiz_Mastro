import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ===== CORS Headers =====
  const allowedOrigins = [
    'https://quiz-mastro-c5vv.vercel.app', // your deployed frontend
    'http://localhost:4200', // local Angular dev
    'http://localhost:5173', // optional: if using Vite
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // ===== Handle preflight OPTIONS request =====
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ===== Only allow POST =====
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ===== Validate request body =====
  const { topic, description, mcq, written } = req.body;
  if (!topic || !description || !mcq || !written) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = `
Create a quiz on "${topic}".
Description: "${description}"
MCQ: Easy ${mcq.easy}, Medium ${mcq.medium}, Hard ${mcq.hard}
Written: Easy ${written.easy}, Medium ${written.medium}, Hard ${written.hard}
Return only a JSON array of questions.
`;

  try {
    // ===== Call OpenRouter API =====
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
          messages: [{ role: 'user', content: prompt }],
        }),
      }
    );

    if (!response.ok) {
      console.error(
        '❌ OpenRouter API returned non-OK status:',
        response.status,
        await response.text()
      );
      return res.status(500).json({ error: 'Failed to generate quiz' });
    }

    const data = await response.json();
    console.log('✅ OpenRouter AI response:', data);

    return res.status(200).json(data);
  } catch (err) {
    console.error('❌ AI request error:', err);
    return res.status(500).json({ error: 'Failed to generate quiz' });
  }
}
