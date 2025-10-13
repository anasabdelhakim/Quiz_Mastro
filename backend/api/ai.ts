import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS from your frontend
  res.setHeader(
    'Access-Control-Allow-Origin',
    'https://quiz-mastro-c5vv.vercel.app'
  );
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, description, mcq, written } = req.body;

  const prompt = `
Create a quiz on "${topic}".
Description: "${description}"
MCQ: Easy ${mcq.easy}, Medium ${mcq.medium}, Hard ${mcq.hard}
Written: Easy ${written.easy}, Medium ${written.medium}, Hard ${written.hard}
Return only a JSON array of questions.
`;

  try {
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

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
}
