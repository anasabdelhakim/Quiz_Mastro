import { Injectable } from '@angular/core';

export interface StoredStudent {
  id: number;
  name: string;
  email: string;
  grade: string;
  phone?: string;
 
  password: string;
  gender: string;
}

export interface StoredTeacher {
  id: number;
  name: string;
  email: string;
  subject: string;
  phone: string;
  avatar?: string;

  password: string;
  gender: string;
}

@Injectable({ providedIn: 'root' })
export class DataStoreService {
  private students: StoredStudent[] = []; // In-memory list
  private teachers: StoredTeacher[] = []; // In-memory list

  private readonly studentsKey = 'students';
  private readonly teachersKey = 'teachers';

  constructor() {
    // Load teachers from local storage (keep original behavior)
    const storedTeachers = localStorage.getItem(this.teachersKey);
    if (storedTeachers) {
      try {
        this.teachers = JSON.parse(storedTeachers) as StoredTeacher[];
      } catch {}
    }
  }

  // Get students: use in-memory list if it has items; else load from local storage
  getStudents(): StoredStudent[] {
    if (this.students.length > 0) {
      return [...this.students];
    }

    // Fallback to local storage if in-memory is empty
    const storedStudents = localStorage.getItem(this.studentsKey);
    if (storedStudents) {
      try {
        this.students = JSON.parse(storedStudents) as StoredStudent[];
      } catch {
        this.students = [];
      }
    }

    return [...this.students];
  }

  // Save students to in-memory list and local storage
  saveStudents(students: StoredStudent[]): void {
    this.students = [...students];
    localStorage.setItem(this.studentsKey, JSON.stringify(this.students));
  }

  getTeachers(): StoredTeacher[] {
    return [...this.teachers];
  }

  saveTeachers(teachers: StoredTeacher[]): void {
    this.teachers = [...teachers];
    localStorage.setItem(this.teachersKey, JSON.stringify(this.teachers));
  }
}
