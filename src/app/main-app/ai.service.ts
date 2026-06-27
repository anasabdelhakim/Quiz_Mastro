import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  // =======================================================================
  // 🚀 SECURE PRODUCTION VERCEL SETUP (ZERO API KEYS IN FRONTEND CODE)
  // =======================================================================
  // Calls your secure Vercel serverless backend. This ensures GitHub never
  // blocks your push and API keys are never exposed in public client code!
  private apiUrl = 'https://quiz-mastro.vercel.app/api/ai';

  constructor(private http: HttpClient) {}

  createQuizAdvanced(
    topic: string,
    description: string,
    mcq: { easy: number; medium: number; hard: number },
    written: { easy: number; medium: number; hard: number }
  ): Observable<string | null> {
    const body = { topic, description, mcq, written };
    console.log('🚀 Sending secure request to Vercel AI Backend...', body);

    return this.http.post<any>(this.apiUrl, body).pipe(
      map((res) => {
        console.log('✅ AI raw response from Vercel:', res);
        
        let aiContent = '';
        if (res?.output) {
          aiContent = typeof res.output === 'string' ? res.output : JSON.stringify(res.output);
        } else if (res?.choices?.[0]?.message?.content) {
          aiContent = res.choices[0].message.content;
        }

        if (!aiContent || aiContent === '[]') {
          throw new Error('Vercel AI Backend returned an empty response.');
        }

        return aiContent;
      }),
      catchError((err) => {
        console.error('❌ Vercel AI request error (API Key missing in Vercel settings or server error):', err);
        return throwError(() => err);
      })
    );
  }
}
