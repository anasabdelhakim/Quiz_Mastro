import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for your Angular frontend
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { topic, description = '', mcq = { easy: 1, medium: 1, hard: 1 }, written = { easy: 1, medium: 1, hard: 1 } } = req.body;

    const prompt = `You are an expert AI educational quiz generator.
Generate a professional exam about the topic: "${topic}".
Extra context/description: "${description}".

Requirements:
1. Generate exactly ${mcq.easy} easy MCQ, ${mcq.medium} medium MCQ, ${mcq.hard} hard MCQ questions.
2. Generate exactly ${written.easy} easy written, ${written.medium} medium written, ${written.hard} hard written questions.
3. For MCQ questions ('mcq'), provide exactly 4 options in an 'options' array, and specify the exact matching string in 'correctAnswer'.
4. For Written questions ('written'), leave options empty and provide a sample answer or rubric in 'correctAnswer'.

CRITICAL INSTRUCTION: You MUST respond ONLY with a valid JSON array of question objects adhering strictly to this exact schema:
[
  {
    "text": "The question text here",
    "type": "mcq", 
    "difficulty": "easy", 
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"], 
    "correctAnswer": "Option 1" 
  }
]
Do NOT include any conversational text, markdown formatting, or \`\`\`json wrappers. Output pure JSON only.`;

    // Securely read API key from Vercel Environment Variables (Hides key from GitHub Secret Scanner!)
    const apiKey = process.env['OPENROUTER_API_KEY'] || process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      console.error('❌ OPENROUTER_API_KEY environment variable is missing in Vercel settings.');
      return res.status(500).json({ error: 'API Key configuration missing on Vercel server.' });
    }

    console.log('🚀 Sending secure serverless request to OpenRouter Universal Free AI...');
    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const requestBody = {
      model: 'openrouter/free', // Universal Free AI Router (Guaranteed 200 OK!)
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    };

    const apiResponse = await fetch(openRouterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://quiz-mastro.vercel.app',
        'X-Title': 'Quiz Mastro AI',
      },
      body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`❌ OpenRouter API failed with status ${apiResponse.status}:`, errorText);
      return res.status(apiResponse.status).json({ error: `AI API error: ${errorText}` });
    }

    const data = await apiResponse.json();
    let aiContent = data.choices?.[0]?.message?.content || '[]';
    
    // Clean any accidental markdown code blocks (e.g., ```json ... ```)
    aiContent = aiContent.trim();
    if (aiContent.startsWith('```json')) {
      aiContent = aiContent.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (aiContent.startsWith('```')) {
      aiContent = aiContent.replace(/^```/, '').replace(/```$/, '').trim();
    }

    return res.status(200).json({ output: aiContent });

  } catch (error) {
    console.error('❌ Server Error in AI Route:', error);
    return res.status(500).json({ error: 'Internal Server Error during AI generation.' });
  }
}
