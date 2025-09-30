import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuizDataService, Quiz } from '../../quiz.service';
import { AuthService } from '../../../auth.service';
import { HlmButton } from '@spartan-ng/helm/button';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, HlmButton, RouterLink],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.css'],
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {
  quizzes: Quiz[] = [];
  loading = true;
  private statusCheckInterval: any;
  private quizSubscription: Subscription = new Subscription();

  gradingQueue: { [quizId: string]: { studentId: number; name: string }[] } =
    {};
  allConnectedStudents: {
    [quizId: string]: {
      studentId: number;
      name: string;
      status: string;
      hasSubmission: boolean;
    }[];
  } = {};

  constructor(
    private quizService: QuizDataService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadQuizzes();

    // Subscribe to quiz updates for real-time changes
    this.quizSubscription = this.quizService.quizzes$.subscribe(() => {
      this.loadQuizzes();
    });

    // Check quiz statuses every 30 seconds
    this.statusCheckInterval = setInterval(() => {
      this.quizService.checkAllQuizStatuses();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    if (this.quizSubscription) {
      this.quizSubscription.unsubscribe();
    }
  }

  loadQuizzes() {
    this.loading = true;

    this.quizzes = this.quizService.getQuizzes('teacher');
    const teacherId = this.auth.getUserId();
    if (teacherId) {
      this.gradingQueue = {};
      this.allConnectedStudents = {};
      this.quizzes.forEach((q) => {
        // Check and update quiz status automatically
        this.quizService.checkAndUpdateQuizStatus(q.id);

        // Ensure completion is enforced so finished quizzes don't appear as grading
        this.quizService.checkQuizCompletionStatus(q.id);

        this.gradingQueue[q.id] = this.quizService.getGradingStudentsForQuiz(
          q.id,
          teacherId
        );
        this.allConnectedStudents[q.id] =
          this.quizService.getAllConnectedStudentsForQuiz(q.id, teacherId);
      });
    }
    setTimeout(() => {
      this.loading = false;
    }, 2000);
  }

  // ---------------- Actions ----------------
  publishQuiz(quiz: Quiz) {
    if (quiz.status === 'unpublished') {
      this.quizService.publishQuiz(quiz.id);

      this.loadQuizzes();
    }
  }

  gradeQuiz(quiz: Quiz, studentId?: number) {
    if (quiz.status === 'grading') {
      const extras = studentId ? { queryParams: { studentId } } : undefined;
      this.router.navigate(['/grading-quiz', quiz.id], extras);
    }
  }

  // ---------------- Status helpers ----------------
  canPublish(quiz: Quiz): boolean {
    return quiz.status === 'unpublished';
  }

  canView(quiz: Quiz): boolean {
    return ['published', 'grading', 'finished'].includes(quiz.status);
  }

  canGrade(quiz: Quiz): boolean {
    return quiz.status === 'grading';
  }

  isFinished(quiz: Quiz): boolean {
    return quiz.status === 'finished';
  }

  // Check if a student has been graded
  isStudentGraded(quizId: string, studentId: number): boolean {
    const submission = this.quizService.getStudentSubmission(quizId, studentId);
    return submission?.teacherGraded === true;
  }
}
