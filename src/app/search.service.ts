import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DataStoreService } from './layout/connections/data-store.service';
import { ConnectionService } from './layout/connections/connection.service';

export interface SearchResult {
  type: 'student' | 'teacher' | 'connection' | 'page';
  id?: number;
  title: string;
  description: string;
  route: string;
  icon: string;
  // Add highlighted title for search matching
  highlightedTitle?: string;
  highlightedDescription?: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private allPages: SearchResult[] = [
    { 
      type: 'page', 
      title: 'Overview', 
      description: 'Dashboard overview page', 
      route: '/home', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>' 
    },
    { 
      type: 'page', 
      title: 'Students', 
      description: 'Manage students', 
      route: '/student', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' 
    },
    { 
      type: 'page', 
      title: 'Teachers', 
      description: 'Manage teachers', 
      route: '/teacher', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>' 
    },
    { 
      type: 'page', 
      title: 'Connections', 
      description: 'Manage student-teacher connections', 
      route: '/connections', 
      icon: '<span class="material-symbols-outlined">link</span>' 
    },
    { 
      type: 'page', 
      title: 'Relationship Map', 
      description: 'View relationship map', 
      route: '/relashion-map', 
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>' 
    }
  ];

  constructor(
    private store: DataStoreService,
    private connectionService: ConnectionService,
    private router: Router
  ) {}

  getAllPages(): SearchResult[] {
    return this.allPages;
  }

  search(query: string): SearchResult[] {
    if (!query) {
      // Return all pages when search is empty
      return this.getAllPages();
    }
    
    const term = query.toLowerCase().trim();
    const results: SearchResult[] = [];
    
    // Add matching pages
    this.allPages.forEach(page => {
      if (page.title.toLowerCase().includes(term) || page.description.toLowerCase().includes(term)) {
        const highlightedPage = {...page};
        highlightedPage.highlightedTitle = this.highlightText(page.title, term);
        highlightedPage.highlightedDescription = this.highlightText(page.description, term);
        results.push(highlightedPage);
      }
    });
    
    // Search students
    this.store.getStudents().forEach(student => {
      if (
        student.name.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.grade.toLowerCase().includes(term) ||
        (student.phone && student.phone.toLowerCase().includes(term))
      ) {
        const result: SearchResult = {
          type: 'student',
          id: student.id,
          title: student.name,
          description: `Student - Grade ${student.grade}`,
          route: '/student',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
        };
        result.highlightedTitle = this.highlightText(student.name, term);
        result.highlightedDescription = this.highlightText(`Student - Grade ${student.grade}`, term);
        results.push(result);
      }
    });
    
    // Search teachers
    this.store.getTeachers().forEach(teacher => {
      if (
        teacher.name.toLowerCase().includes(term) ||
        teacher.email.toLowerCase().includes(term) ||
        teacher.subject.toLowerCase().includes(term) ||
        teacher.phone.toLowerCase().includes(term)
      ) {
        const result: SearchResult = {
          type: 'teacher',
          id: teacher.id,
          title: teacher.name,
          description: `Teacher - ${teacher.subject}`,
          route: '/teacher',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>'
        };
        result.highlightedTitle = this.highlightText(teacher.name, term);
        result.highlightedDescription = this.highlightText(`Teacher - ${teacher.subject}`, term);
        results.push(result);
      }
    });
    
    // Search connections
    this.connectionService.getAllConnections().forEach(connection => {
      const students = this.store.getStudents();
      const teachers = this.store.getTeachers();
      
      const student = students.find(s => s.id === connection.studentId);
      const teacher = teachers.find(t => t.id === connection.teacherId);
      
      if (student && teacher) {
        const studentMatch = student.name.toLowerCase().includes(term);
        const teacherMatch = teacher.name.toLowerCase().includes(term) || 
                            teacher.subject.toLowerCase().includes(term);
        
        if (studentMatch || teacherMatch) {
          const title = `${student.name} ↔ ${teacher.name}`;
          const description = `Connection - ${teacher.subject}`;
          
          const result: SearchResult = {
            type: 'connection',
            id: connection.id,
            title: title,
            description: description,
            route: '/connections',
            icon: '<span class="material-symbols-outlined">link</span>'
          };
          result.highlightedTitle = this.highlightText(title, term);
          result.highlightedDescription = this.highlightText(description, term);
          results.push(result);
        }
      }
    });
    
    return results;
  }
  
  // Helper method to highlight matching text
  private highlightText(text: string, term: string): string {
    if (!term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  }
  
  navigateToResult(result: SearchResult): void {
    this.router.navigate([result.route]);
  }
}