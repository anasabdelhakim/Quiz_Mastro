import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  // =======================================================================
  // 🔒 SECURE AI SETUP
  // The Angular app calls /api/ai — our own Vercel Serverless Function.
  // The API key lives ONLY in Vercel Environment Variables (never in the browser).
  // To add your key: Vercel Dashboard → Project → Settings → Environment Variables
  //   → Name: GEMINI_API_KEY  Value: your key
  // =======================================================================

  constructor(private http: HttpClient) {}

  createQuizAdvanced(
    topic: string,
    description: string,
    mcq: { easy: number; medium: number; hard: number },
    written: { easy: number; medium: number; hard: number }
  ): Observable<string | null> {
    const body = { topic, description, mcq, written };

    console.log('🚀 Sending request to /api/ai serverless function...', body);

    return this.http.post<any>('/api/ai', body).pipe(
      map((res) => {
        console.log('✅ /api/ai response:', res);
        const aiContent = res?.output || '';
        if (!aiContent) {
          throw new Error('AI function returned an empty response.');
        }
        return aiContent;
      }),
      catchError((err) => {
        console.error('❌ AI request error:', err);
        return throwError(() => err);
      })
    );
  }
}
