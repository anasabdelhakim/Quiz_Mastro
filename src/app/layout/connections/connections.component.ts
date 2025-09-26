import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DataStoreService,
  StoredStudent,
  StoredTeacher,
} from './data-store.service';
import { ConnectionService } from './connection.service';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmInput } from '@spartan-ng/helm/input';
@Component({
  selector: 'app-connections',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BrnSelectImports,
    HlmSelectImports,
    HlmInput,
  ],
  templateUrl: './connections.component.html',
  styleUrl: './connections.component.css',
})
export class ConnectionsComponent implements OnInit {
  students: StoredStudent[] = [];
  teachers: StoredTeacher[] = [];

  // Signals
  selectedStudentId = signal<number | null>(null);
  studentSearch = signal<string>(''); // 👈 for student search
  teacherSearch = signal<string>(''); // 👈 for teacher search
  mode = signal<'assign' | 'manage'>('assign');

  onStudentChange(event: number | (number | null)[] | null | undefined) {
    if (typeof event === 'number' || event === null) {
      this.selectedStudentId.set(event);
    } else {
      this.selectedStudentId.set(null);
    }

    this.studentSearch.set('');
  }
  // Computed for student filtering
  filteredStudents = computed(() => {
    const term = this.studentSearch().toLowerCase().trim();
    if (!term) return this.students;
    return this.students.filter((s) => s.name.toLowerCase().includes(term));
  });

  // Computed for teacher filtering
  filteredTeachers = computed(() => {
    const term = this.teacherSearch().toLowerCase().trim();
    if (!term) return this.teachers;
    return this.teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.subject.toLowerCase().includes(term)
    );
  });

  // Expose as properties for easier template use
  get filteredStudentsList(): StoredStudent[] {
    return this.filteredStudents();
  }

  get filteredTeachersList(): StoredTeacher[] {
    return this.filteredTeachers();
  }

  constructor(
    private store: DataStoreService,
    public connections: ConnectionService
  ) {}

  ngOnInit(): void {
    this.students = this.store.getStudents();
    this.teachers = this.store.getTeachers();
    console.log('All connections:', this.connections.getAllConnections());
  }

  // --- Search helpers ---
  onStudentSearch(term: string) {
    this.studentSearch.set(term);
  }

  onTeacherSearch(term: string) {
    this.teacherSearch.set(term);
  }

  // --- Teacher assignment helpers ---
  isTeacherAssigned(teacherId: number): boolean {
    const studentId = this.selectedStudentId();
    if (studentId === null) return false;
    return this.connections
      .getConnectionsByStudent(studentId)
      .some((c) => c.teacherId === teacherId);
  }

  toggleAssignment(teacherId: number, checked: boolean) {
    const studentId = this.selectedStudentId();
    if (studentId === null) return;
    if (checked) {
      if (!this.isTeacherAssigned(teacherId)) {
        this.connections.addConnection(studentId, teacherId);
      }
    } else {
      const existing = this.connections
        .getConnectionsByStudent(studentId)
        .find((c) => c.teacherId === teacherId);
      if (existing) {
        this.connections.removeConnection(existing.id);
      }
    }
  }

  // --- Name lookup helpers ---
  getSelectedStudentName(): string {
    const id = this.selectedStudentId();
    if (id === null) return '';
    return this.getStudentNameById(id);
  }

  getStudentNameById(id: number): string {
    return this.students.find((s) => s.id === id)?.name ?? '';
  }

  getTeacherNameById(id: number): string {
    return this.teachers.find((t) => t.id === id)?.name ?? '';
  }

  getTeacherSubjectById(id: number): string {
    return this.teachers.find((t) => t.id === id)?.subject ?? '';
  }
}
