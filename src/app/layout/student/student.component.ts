import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { z } from 'zod';
import { toast } from 'ngx-sonner';
import { ActivityService, ActivityFilter } from '../../activity.service';

export interface Student {
  id: number;
  name: string;
  email: string;
  gender: string;
  username: string;
  password: string;
  phone?: string;
}

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student.component.html',
})
export class StudentComponent implements OnInit {
  students: Student[] = [];
  filteredStudents: Student[] = [];
  currentStudent: Omit<Student, 'id'> & { id: number | null } = {
    id: null,
    name: '',
    email: '',
    gender: '',
    username: '',
    password: '',
    phone: '',
  };

  showModal = false;
  isEditMode = false;
  searchTerm = '';
  errors: Partial<Record<keyof Student, string>> = {};
  formValid = false;
  genderOptions = ['Male', 'Female'];



  studentSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email').endsWith('@gmail.com', 'Email must end with @gmail.com'),
    gender: z.string().min(1, 'Gender is required'),
    phone: z.string().regex(/^\d*$/, 'Phone must be numbers only').optional(),
    username: z.string().min(4, 'Username must be at least 4 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[\W_]/, 'Password must contain at least one special character')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  });

  constructor(private activityService: ActivityService) { }

  ngOnInit() {
    const saved = localStorage.getItem('students');
    this.students = saved ? JSON.parse(saved) : [];
    this.filteredStudents = [...this.students];
  }

  filterStudents() {
    if (!this.searchTerm) {
      this.filteredStudents = [...this.students];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredStudents = this.students.filter(
      s =>
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.gender.toLowerCase().includes(term) ||
        (s.phone && s.phone.includes(term))
    );
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentStudent = { id: null, name: '', email: '', gender: '', username: '', password: '', phone: '' };
    this.errors = {};
    this.formValid = false;
    this.showModal = true;
  }

  editStudent(student: Student) {
    this.isEditMode = true;
    this.currentStudent = { ...student };
    this.errors = {};
    this.formValid = true;
    this.showModal = true;
  }

  deleteStudent(id: number) {
    const student = this.students.find(s => s.id === id);
    if (!student) return;

    if (!confirm('Are you sure you want to delete this student?')) return;

    this.students = this.students.filter(s => s.id !== id);
    this.persist();
    this.filterStudents();

    toast.success('Student deleted successfully!');
    this.activityService.addActivity(
      'student',
      'Deleted Student',
      `Student ${student.name} was deleted`
    );
  }

  onInputChange() {
    const result = this.studentSchema.safeParse(this.currentStudent);
    if (!result.success) {
      this.errors = {};
      result.error.issues.forEach(issue => {
        const key = issue.path[0] as keyof Student;
        this.errors[key] = issue.message;
      });
      this.formValid = false;
    } else {
      this.errors = {};
      this.formValid = true;
    }
  }


  addStudent() {
    if (!this.formValid) return;

    const newId = this.students.length ? Math.max(...this.students.map(s => s.id)) + 1 : 1;
    const newStudent: Student = { ...this.currentStudent, id: newId };
    this.students.push(newStudent);
    this.persist();
    this.filterStudents();

    toast.success('Student added successfully!');
    this.activityService.addActivity(
      'student',
      'Added Student',
      `Student ${newStudent.name} was added`
    );

    this.closeModal();
  }

  updateStudent() {
    if (!this.formValid) return;

    const index = this.students.findIndex(s => s.id === this.currentStudent.id);
    if (index !== -1) {
      this.students[index] = { ...this.currentStudent, id: this.currentStudent.id as number };
      this.persist();
      this.filterStudents();

      toast.success('Student updated successfully!');
      this.activityService.addActivity(
        'student',
        'Updated Student',
        `Student ${this.currentStudent.name} was updated`
      );

      this.closeModal();
    }
  }

  closeModal() {
    this.showModal = false;
  }

  private persist() {
    localStorage.setItem('students', JSON.stringify(this.students));
  }
}