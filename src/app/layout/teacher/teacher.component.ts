import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { z } from 'zod';
import { toast } from 'ngx-sonner';
import { ActivityService, ActivityFilter } from '../../activity.service';

export interface Teacher {
  id: number;
  name: string;
  email: string;
  subject: string;
  gender: string;
  phone?: string;
}

@Component({
  selector: 'app-teacher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher.component.html',
  styleUrls: ['./teacher.component.css'],
})
export class TeacherComponent implements OnInit {
  teachers: Teacher[] = [];
  filteredTeachers: Teacher[] = [];
  currentTeacher: Omit<Teacher, 'id'> & { id: number | null } = {
    id: null,
    name: '',
    email: '',
    subject: '',
    gender: '',
    phone: '',
  };

  showModal = false;
  isEditMode = false;
  searchTerm = '';
  errors: Partial<Record<keyof Teacher, string>> = {};
  formValid = false;
  genderOptions = ['Male', 'Female'];

  teacherSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email').endsWith('@gmail.com', 'Email must end with @gmail.com'),
    subject: z.string().min(2, 'Subject is required'),
    gender: z.string().min(1, 'Gender is required'),
    phone: z.string().regex(/^\d*$/, 'Phone must be numbers only').optional(),
  });

  constructor(private activityService: ActivityService) {}

  ngOnInit() {
    const saved = localStorage.getItem('teachers');
    this.teachers = saved ? JSON.parse(saved) : [];
    this.filteredTeachers = [...this.teachers];
  }

  filterTeachers() {
    if (!this.searchTerm) {
      this.filteredTeachers = [...this.teachers];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredTeachers = this.teachers.filter(
      t =>
        t.name.toLowerCase().includes(term) ||
        t.email.toLowerCase().includes(term) ||
        t.subject.toLowerCase().includes(term) ||
        t.gender.toLowerCase().includes(term) ||
        (t.phone && t.phone.includes(term))
    );
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentTeacher = { id: null, name: '', email: '', subject: '', gender: '', phone: '' };
    this.errors = {};
    this.formValid = false;
    this.showModal = true;
  }

  editTeacher(teacher: Teacher) {
    this.isEditMode = true;
    this.currentTeacher = { ...teacher };
    this.errors = {};
    this.formValid = true;
    this.showModal = true;
  }

  deleteTeacher(id: number) {
    const teacher = this.teachers.find(t => t.id === id);
    if (!teacher) return;

    if (!confirm('Are you sure you want to delete this teacher?')) return;

    this.teachers = this.teachers.filter(t => t.id !== id);
    this.persist();
    this.filterTeachers();

    toast.success('Teacher deleted successfully!');
    this.activityService.addActivity(
      'teacher',
      'Deleted Teacher',
      `Teacher ${teacher.name} was deleted`
    );
  }

  onInputChange() {
    const result = this.teacherSchema.safeParse(this.currentTeacher);
    if (!result.success) {
      this.errors = {};
      result.error.issues.forEach(issue => {
        const key = issue.path[0] as keyof Teacher;
        this.errors[key] = issue.message;
      });
      this.formValid = false;
    } else {
      this.errors = {};
      this.formValid = true;
    }
  }

  addTeacher() {
    if (!this.formValid) return;

    const newId = this.teachers.length ? Math.max(...this.teachers.map(t => t.id)) + 1 : 1;
    const newTeacher: Teacher = { ...this.currentTeacher, id: newId };
    this.teachers.push(newTeacher);
    this.persist();
    this.filterTeachers();

    toast.success('Teacher added successfully!');
    this.activityService.addActivity(
      'teacher',
      'Added Teacher',
      `Teacher ${newTeacher.name} was added`
    );

    this.closeModal();
  }

  updateTeacher() {
    if (!this.formValid) return;

    const index = this.teachers.findIndex(t => t.id === this.currentTeacher.id);
    if (index !== -1) {
      this.teachers[index] = { ...this.currentTeacher, id: this.currentTeacher.id as number };
      this.persist();
      this.filterTeachers();

      toast.success('Teacher updated successfully!');
      this.activityService.addActivity(
        'teacher',
        'Updated Teacher',
        `Teacher ${this.currentTeacher.name} was updated`
      );

      this.closeModal();
    }
  }

  closeModal() {
    this.showModal = false;
  }

  private persist() {
    localStorage.setItem('teachers', JSON.stringify(this.teachers));
  }
}