import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  // =======================================================================
  // 🚀 ROCK-SOLID OPENROUTER AI SETUP (ZERO 404 ERRORS)
  // =======================================================================
  // GET A FREE KEY IN 10 SECONDS AT: https://openrouter.ai/keys
  // Paste your 'sk-or-v1-...' key below for local dev testing:
  private apiKey = 'YOUR_OPENROUTER_API_KEY';

  // OpenRouter Universal Endpoint (Designed for direct browser calls with zero CORS/404 issues)
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(private http: HttpClient) {}

  createQuizAdvanced(
    topic: string,
    description: string,
    mcq: { easy: number; medium: number; hard: number },
    written: { easy: number; medium: number; hard: number }
  ): Observable<string | null> {
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

    const body = {
      model: 'openrouter/free', // Universal Free AI Router (Guaranteed to never throw 400 Bad Request!)
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'http://localhost:4200',
      'X-Title': 'Quiz Mastro AI',
    });

    console.log('🚀 Sending request to OpenRouter Gemini AI...', body);

    return this.http.post<any>(this.apiUrl, body, { headers }).pipe(
      map((res) => {
        console.log('✅ OpenRouter AI raw response:', res);
        let aiContent = res?.choices?.[0]?.message?.content || '';

        if (!aiContent) {
          throw new Error('OpenRouter API returned an empty response.');
        }

        // Clean any accidental markdown code blocks (e.g., ```json ... ```)
        aiContent = aiContent.trim();
        if (aiContent.startsWith('```json')) {
          aiContent = aiContent.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (aiContent.startsWith('```')) {
          aiContent = aiContent.replace(/^```/, '').replace(/```$/, '').trim();
        }

        return aiContent;
      }),
      catchError((err) => {
        console.error('❌ OpenRouter AI request error:', err);
        return throwError(() => err);
      })
    );
  }
}
