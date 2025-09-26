// src/app/auth.service.ts
import { Injectable } from '@angular/core';
import {
  DataStoreService,
  StoredStudent,
  StoredTeacher,
} from './layout/connections/data-store.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedIn = false;
  private role: 'student' | 'teacher' | 'super' | null = null;
  private userId: number | null = null;

  constructor(private dataStore: DataStoreService) {
    const savedLoggedIn = localStorage.getItem('loggedIn');
    const savedRole = localStorage.getItem('role');
    const savedUserId = localStorage.getItem('userId');

    this.loggedIn = savedLoggedIn === 'true';
    this.role = savedRole as 'student' | 'teacher' | 'super' | null;
    this.userId = savedUserId ? parseInt(savedUserId) : null;
  }

  isLoggedIn(): boolean {
    return this.loggedIn;
  }

  getRole(): 'student' | 'teacher' | 'super' | null {
    return this.role;
  }

  getUserId(): number | null {
    return this.userId;
  }

  login(
    username: string,
    password: string
  ): 'student' | 'teacher' | 'super' | null {
    // Normalize inputs
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    console.log('AuthService: Attempting login with:', {
      username: normalizedUsername,
      password: normalizedPassword,
    });

    // Check for super admin first (hardcoded for security)
    if (
      normalizedUsername === 'super@admin' &&
      normalizedPassword === 'super#admin'
    ) {
      this.loggedIn = true;
      this.role = 'super';
      this.userId = 0;
      console.log('AuthService: Super admin login successful');
    } else {
      // Check students
      const students = this.dataStore.getStudents();
      console.log('AuthService: Available students:', students);
      const student = students.find(
        (s) =>
          s.email === normalizedUsername && s.password === normalizedPassword
      );

      if (student) {
        this.loggedIn = true;
        this.role = 'student';
        this.userId = student.id;
        console.log('AuthService: Student login successful:', student);
      } else {
        // Check teachers
        const teachers = this.dataStore.getTeachers();
        console.log('AuthService: Available teachers:', teachers);
        const teacher = teachers.find(
          (t) =>
            t.email === normalizedUsername && t.password === normalizedPassword
        );

        if (teacher) {
          this.loggedIn = true;
          this.role = 'teacher';
          this.userId = teacher.id;
          console.log('AuthService: Teacher login successful:', teacher);
        } else {
          this.loggedIn = false;
          this.role = null;
          this.userId = null;
          localStorage.setItem('loggedIn', 'false');
          localStorage.removeItem('userId');
          localStorage.removeItem('role');
          console.log('AuthService: Login failed - no matching user found');
        }
      }
    }
    // Persist login state
    localStorage.setItem('loggedIn', this.loggedIn.toString());
    // Only update role and userId if login succeeds
    if (this.loggedIn) {
      localStorage.setItem('role', this.role ?? '');
      localStorage.setItem('userId', this.userId?.toString() ?? '');
    }
    console.log('AuthService: Final login result:', {
      loggedIn: this.loggedIn,
      role: this.role,
      userId: this.userId,
    });
    return this.role;
  }

  logout() {
    this.loggedIn = false;
    this.role = null;
    this.userId = null;
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
  }
  getCurrentUser(): StoredStudent | StoredTeacher | null {
    if (!this.loggedIn || this.userId === null) return null;
    if (this.role === 'student') {
      return (
        this.dataStore.getStudents().find((s) => s.id === this.userId) ?? null
      );
    }
    if (this.role === 'teacher') {
      return (
        this.dataStore.getTeachers().find((t) => t.id === this.userId) ?? null
      );
    }
    return null; // super admin or unknown
  }
}
