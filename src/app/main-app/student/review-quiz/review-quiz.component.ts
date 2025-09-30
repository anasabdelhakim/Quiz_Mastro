import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizDataService, Quiz, Question } from '../../quiz.service';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { Location } from '@angular/common';
import { HlmButton } from '@spartan-ng/helm/button';
import { AuthService } from '../../../auth.service';
@Component({
  selector: 'app-review-quiz',
  standalone: true,
  imports: [CommonModule, HeaderComponent, HlmButton],
  templateUrl: './review-quiz.component.html',
  styleUrls: ['./review-quiz.component.css'],
})
export class ReviewQuizComponent implements OnInit, AfterViewInit, OnDestroy {
  quiz!: Quiz;
  totalScore = 0;
  totalPoints = 0;
  correctCount = 0;
  questionExplanations: { [questionId: string]: string } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizDataService,
    private location: Location,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const quizId = this.route.snapshot.paramMap.get('id');
    if (!quizId) {
      alert('No quiz ID provided');
      this.router.navigate(['/student-dashboard']);
      return;
    }
    console.log(this.quiz?.timeSpent);
    const foundQuiz = this.quizService.getQuizById(quizId);
    if (!foundQuiz) {
      alert('Quiz not found');
      this.router.navigate(['/student-dashboard']);
      return;
    }

    // Get student-specific quiz data
    const studentId = this.auth.getUserId();
    if (!studentId) {
      alert('Not logged in');
      this.router.navigate(['/student-dashboard']);
      return;
    }

    const studentQuizData = this.quizService.getStudentQuizData(
      quizId,
      studentId
    );
    if (!studentQuizData) {
      alert('Quiz not found');
      this.router.navigate(['/student-dashboard']);
      return;
    }

    this.quiz = studentQuizData;

    // Load saved grading state and explanations per student
    const gradingState = this.quizService.getGradingState(quizId, studentId);
    this.quiz.questionScores = { ...gradingState.questionScores };
    this.quiz.manualScores = { ...gradingState.manualScores };
    this.questionExplanations = this.quizService.getExplanations(
      quizId,
      studentId
    );

    // Calculate total points and score
    this.totalPoints = this.getTotalPoints(this.quiz);
    this.totalScore = this.quiz.questions.reduce((sum, q) => {
      const score = this.getQuestionScore(q);
      return sum + score;
    }, 0);

    // Count correct MCQs
    this.correctCount = this.quiz.questions.filter(
      (q) => q.type === 'mcq' && this.studentAnswer(q) === this.correctAnswer(q)
    ).length;
  }

  studentAnswer(q: Question): string {
    const studentId = this.auth.getUserId();
    if (!studentId) return '';

    const submission = this.quizService.getStudentSubmission(
      this.quiz.id,
      studentId
    );
    return submission?.studentAnswers?.[q.id] || '';
  }

  correctAnswer(q: Question): string {
    return q.type === 'mcq'
      ? q.options?.find((o) => o.isCorrect)?.id || ''
      : '';
  }

  isCorrect(q: Question): boolean {
    const score = this.getQuestionScore(q);

    if (q.type === 'mcq') {
      return this.studentAnswer(q) === this.correctAnswer(q);
    }

    if (q.type === 'written') {
      return score >= q.points / 2;
    }

    return false;
  }

  isSelected(q: Question, optionId: string): boolean {
    return this.studentAnswer(q) === optionId;
  }

  getQuestionScore(q: Question): number {
    // Use manual score first if available
    const manual = this.quiz.manualScores?.[q.id];
    if (manual !== undefined && !isNaN(manual)) return manual;

    // Then saved auto or written score
    const saved = this.quiz.questionScores?.[q.id];
    if (saved !== undefined && !isNaN(saved)) return saved;

    // Auto-grade MCQs if no saved score
    if (q.type === 'mcq') {
      return this.studentAnswer(q) === this.correctAnswer(q) ? q.points : 0;
    }

    return 0; // Written question not graded yet
  }

  correctOptionId(q: Question): string {
    return q.options?.find((o) => o.isCorrect)?.id || '';
  }
  getTotalPoints(quiz: Quiz): number {
    return quiz.questions.reduce((sum, q) => sum + q.points, 0);
  }
  get formattedTimeSpent(): string {
    const studentId = this.auth.getUserId();
    if (!studentId) return `${this.quiz.duration}:00`; // fallback

    const submission = this.quizService.getStudentSubmission(
      this.quiz.id,
      studentId
    );

    // ❌ No submission → use quiz duration
    if (!submission) {
      return `${this.quiz.duration}:00`;
    }

    // ❌ Started but no timeSpent recorded → use duration
    if (!submission?.timeSpent) {
      return `${this.quiz.duration}:00`;
    }

    // ✅ Student attempted → use recorded time
    const seconds = submission.timeSpent;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }

  goBack() {
    this.location.back();
  }
  ngAfterViewInit() {
    // Set chatbot config
    (window as any).chtlConfig = { chatbotId: '5726282828' };

    // Inject the Chatling AI script dynamically
    const script = document.createElement('script');
    script.src = 'https://chatling.ai/js/embed.js';
    script.id = 'chtl-script';
    script.async = true;
    script.type = 'text/javascript';
    document.body.appendChild(script);
  }

  ngOnDestroy() {
    // Remove the chatbot script
    const script = document.getElementById('chtl-script');
    if (script) script.remove();

    // Remove iframe (if any)
    const iframe = document.querySelector('iframe[src*="chatling.ai"]');
    if (iframe) iframe.remove();

    // Remove any floating divs injected by the chatbot
    const chatDivs = document.querySelectorAll(
      'div[style*="https://s3-assets.chatling.ai"]'
    );
    chatDivs.forEach((div) => div.remove());

    // Remove global config
    delete (window as any).chtlConfig;
  }
}
