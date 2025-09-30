import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { QuizDataService, Quiz } from '../../quiz.service';
import { AuthService } from '../../../auth.service';
import { HlmButton } from '@spartan-ng/helm/button';
import { RouterLink } from '@angular/router';
interface StudentGradeInfo {
  studentId: number;
  name: string;
  status: string;
  hasSubmission: boolean;
  isGraded: boolean;
  grade?: number;
  totalPoints: number;
  percentage?: number;
}

@Component({
  selector: 'app-view-student-grades',
  standalone: true,
  imports: [CommonModule, HlmButton, RouterLink],
  templateUrl: './view-student-grades.component.html',
  styleUrls: ['./view-student-grades.component.css'],
})
export class ViewStudentGradesComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  quiz: Quiz | null = null;
  students: StudentGradeInfo[] = [];
  loading = true;
  private routerSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizDataService,
    private auth: AuthService,

  ) {}

  ngOnInit(): void {
    const quizId = this.route.snapshot.paramMap.get('id');
    if (!quizId) {
      this.router.navigate(['/teacher-dashboard']);
      return;
    }

    const quiz = this.quizService.getQuizById(quizId);
    if (!quiz) {
      this.router.navigate(['/teacher-dashboard']);
      return;
    }

    this.quiz = quiz;
    this.loadStudents();

    // Subscribe to router events to refresh data when returning from grading
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.refreshStudents();
      });
  }

  ngAfterViewInit(): void {
    // Check completion status when component is fully loaded
    this.checkAndUpdateQuizCompletion();
  }

  loadStudents(): void {
    if (!this.quiz) return;

    const teacherId = this.auth.getUserId();
    if (!teacherId) return;

    this.students = this.quizService.getAllStudentsForGrading(
      this.quiz.id,
      teacherId
    );

    // Check if all students are graded and update quiz status
    this.checkAndUpdateQuizCompletion();

    this.loading = false;
  }

  checkAndUpdateQuizCompletion(): void {
    if (!this.quiz) return;

    // Check if all students are graded
    const allGraded = this.students.every((student) => student.isGraded);

    if (allGraded && this.students.length > 0) {
      // Update quiz status to finished
      this.quizService.updateQuiz(this.quiz.id, { status: 'finished' });
      this.quiz.status = 'finished';
    }
  }

  gradeStudent(studentId: number): void {
    if (!this.quiz) return;
    this.router.navigate(['/grading-quiz', this.quiz.id], {
      queryParams: { studentId },
    });
  }

  // Method to refresh students list (can be called when returning from grading)
  refreshStudents(): void {
    this.loadStudents();
  }



  getStatusColor(status: string): string {
    switch (status) {
      case 'grading':
        return 'text-warning';
      case 'finished':
        return 'text-success';
      case 'active':
        return 'text-primary';
      case 'expired':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  }

  getStatusBadgeColor(status: string, isGraded: boolean): string {
    if (isGraded) {
      return 'bg-blue-100 text-blue-700';
    }
    switch (status) {
      case 'grading':
        return 'bg-warning-soft text-warning';
      case 'finished':
        return 'bg-success-soft text-success';
      case 'active':
        return 'bg-primary-soft text-primary';
      case 'expired':
        return 'bg-destructive-soft text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }

  getGradeColor(percentage?: number): string {
    if (percentage === undefined) return 'text-muted-foreground';
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-destructive';
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
