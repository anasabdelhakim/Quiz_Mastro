import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for your Angular frontend (Dynamic origin required when Allow-Credentials is true)
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

CRITICAL INSTRUCTION: You MUST respond ONLY with a valid JSON array of question objects. Do NOT include any conversational text, markdown formatting, or \`\`\`json wrappers. Output pure JSON only.`;

    // Check for Google Gemini API Key (Configured securely in Vercel Environment Variables)
    const geminiKey = process.env['GEMINI_API_KEY'];
    if (!geminiKey) {
      console.error('❌ GEMINI_API_KEY environment variable is missing in Vercel settings.');
      return res.status(500).json({ error: 'API Key configuration missing on Vercel server.' });
    }

    console.log('🚀 Using Google Gemini API for real AI Quiz Generation...');
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
    const geminiBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 }
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`❌ Google Gemini API failed with status ${geminiResponse.status}:`, errorText);
      return res.status(geminiResponse.status).json({ error: `Gemini API error: ${errorText}` });
    }

    const data = await geminiResponse.json();
    let aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
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
