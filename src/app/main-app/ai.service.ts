import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private apiUrl = 'https://quiz-mastro-backend.vercel.app/api/ai'; 

  constructor(private http: HttpClient) {}

  createQuizAdvanced(
    topic: string,
    description: string,
    mcq: { easy: number; medium: number; hard: number },
    written: { easy: number; medium: number; hard: number }
  ): Observable<string | null> {
    const body = { topic, description, mcq, written };
    console.log('Sending to AI API:', body);

    return this.http.post<any>(this.apiUrl, body).pipe(
      map((res) => {
        console.log('✅ AI raw response:', res);
        if (res?.choices?.[0]?.message?.content) {
          return res.choices[0].message.content;
        }
        if (res?.output) {
          return JSON.stringify(res.output);
        }
        return null;
      }),
      catchError((err) => {
        console.error('❌ AI request error:', err);
        return of(null);
      })
    );
  }
}
