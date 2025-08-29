// src/app/auth.service.ts
import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedIn = false;
  private role: 'student' | 'teacher' | 'super' | null = null;

  constructor() {
    const savedLoggedIn = localStorage.getItem('loggedIn');
    const savedRole = localStorage.getItem('role');

    this.loggedIn = savedLoggedIn === 'true';
    this.role = savedRole as 'student' | 'teacher' | 'super' | null;
  }

  isLoggedIn(): boolean {
    return this.loggedIn;
  }

  getRole(): 'student' | 'teacher' | 'super' | null {
    return this.role;
  }

  login(
    username: string,
    password: string
  ): 'student' | 'teacher' | 'super' | null {
    if (username.startsWith('student@') && password.startsWith('student#')) {
      this.loggedIn = true;
      this.role = 'student';
    } else if (
      username.startsWith('teacher@') &&
      password.startsWith('teacher#')
    ) {
      this.loggedIn = true;
      this.role = 'teacher';
    } else if (username.startsWith('super@') && password.startsWith('super#')) {
      this.loggedIn = true;
      this.role = 'super';
    } else {
      this.loggedIn = false;
      this.role = null;
    }

    localStorage.setItem('loggedIn', this.loggedIn.toString());
    localStorage.setItem('role', this.role ?? '');

    return this.role;
  }

  logout() {
    this.loggedIn = false;
    this.role = null;
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('role');
  }
}
