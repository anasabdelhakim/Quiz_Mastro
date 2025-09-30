import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizDataService, Quiz, Question } from '../../quiz.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogFooter,
  HlmDialogHeader,
} from '@spartan-ng/helm/dialog';
import { Location } from '@angular/common';
import { BrnDialogContent, BrnDialogTrigger } from '@spartan-ng/brain/dialog';
@Component({
  selector: 'app-grading-quiz',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HlmInput,
    HlmButton,
    HlmDialog,
    HlmDialogContent,
    HlmDialogFooter,
    HlmDialogHeader,
    BrnDialogContent,
    BrnDialogTrigger,
  ],
  templateUrl: './grading-quiz.component.html',
  styleUrls: ['./grading-quiz.component.css'],
})
export class GradingQuizComponent implements OnInit {
  quiz!: Quiz;
  studentName = '';
  questionScores: { [questionId: string]: number } = {};
  questionExplanations: { [questionId: string]: string } = {};
  manualScores: { [questionId: string]: number } = {};
  showGradeInput: { [questionId: string]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizDataService,
    private location: Location
  ) {}

  ngOnInit(): void {
    const quizId = this.route.snapshot.paramMap.get('id');
    const studentIdParam = this.route.snapshot.queryParamMap.get('studentId');
    if (!quizId) {
      alert('No quiz ID provided');
      this.router.navigate(['/teacher-dashboard']);
      return;
    }

    const foundQuiz = this.quizService.getQuizById(quizId);
    if (!foundQuiz) {
      alert('Quiz not found');
      this.router.navigate(['/teacher-dashboard']);
      return;
    }

    this.quiz = foundQuiz;

    const sid = studentIdParam ? Number(studentIdParam) : NaN;
    if (!sid || isNaN(sid)) {
      // No student specified; leave defaults
    } else {
      // Get student name
      this.studentName = this.quizService.getStudentName(sid);

      const grading = this.quizService.getGradingState(quizId, sid);
      this.questionScores = { ...grading.questionScores };
      this.manualScores = { ...grading.manualScores };
    }

    this.quiz.questions.forEach((q) => {
      // Initialize each question with its own isolated state
      if (this.questionScores[q.id] === undefined) {
        this.questionScores[q.id] = 0;
      }
      if (this.manualScores[q.id] === undefined) {
        this.manualScores[q.id] = 0; // Changed from NaN to 0 for better handling
      }
      if (this.questionExplanations[q.id] === undefined) {
        this.questionExplanations[q.id] = '';
      }
      // Initialize showGradeInput for each question independently
      this.showGradeInput[q.id] = false;
    });
    const savedTabState = localStorage.getItem(
      `grading_tab_state_${quizId}_${sid}`
    );
    if (savedTabState) {
      this.showGradeInput = JSON.parse(savedTabState);
    }
  }

  toggleManualInput(qId: string) {
    this.showGradeInput[qId] = !this.showGradeInput[qId];
  }

  submitGrades() {
    let totalGrade = 0;

    this.quiz.questions.forEach((q) => {
      let score = 0;

      // ✅ Manual grading takes precedence only if teacher entered a value
      if (
        this.manualScores[q.id] !== null &&
        this.manualScores[q.id] !== undefined &&
        this.manualScores[q.id] !== 0
      ) {
        score = this.manualScores[q.id];
      }
      // ✅ Auto-grade MCQs if no manual score
      else if (q.type === 'mcq') {
        score = this.studentAnswer(q) === this.correctAnswer(q) ? q.points : 0;
      }
      // ✅ Written question without manual score → use questionScores input
      else if (q.type === 'written') {
        score = this.questionScores[q.id] || 0;
      }

      this.questionScores[q.id] = score;
      totalGrade += score;
    });

    // Get studentId once
    const studentIdParam = this.route.snapshot.queryParamMap.get('studentId');
    const sid = studentIdParam ? Number(studentIdParam) : NaN;

    if (sid && !isNaN(sid)) {
      // Save total grade
      this.quizService.gradeQuizForStudent(this.quiz, sid, totalGrade);

      // Save explanations
      this.quizService.saveExplanations(
        this.quiz.id,
        sid,
        this.questionExplanations
      );

      // Save manual/written scores
      this.quizService.saveGradingState(
        this.quiz.id,
        sid,
        this.questionScores,
        this.manualScores
      );
      localStorage.setItem(
        `grading_tab_state_${this.quiz.id}_${sid}`,
        JSON.stringify(this.showGradeInput)
      );
    }

    this.router.navigate(['/view-student-grades', this.quiz.id], {
      replaceUrl: true,
    });
  }

  studentAnswer(q: Question) {
    const studentIdParam = this.route.snapshot.queryParamMap.get('studentId');
    const studentId = studentIdParam ? Number(studentIdParam) : null;
    if (!studentId) return '';

    const submission = this.quizService.getStudentSubmission(
      this.quiz.id,
      studentId
    );
    return submission?.studentAnswers?.[q.id] || '';
  }

  correctAnswer(q: Question) {
    return q.type === 'mcq' ? q.options?.find((o) => o.isCorrect)?.id : '';
  }

  isCorrect(q: Question) {
    return q.type === 'mcq' && this.studentAnswer(q) === this.correctAnswer(q);
  }
  goBack() {
    // Use explicit navigation to avoid first-click no-op due to dialog focus/history state
    this.router.navigate(['/view-student-grades', this.quiz.id]);
  }
  correctOptionId(q: Question): string {
    return q.options?.find((o) => o.isCorrect)?.id || '';
  }
  isSelected(q: Question, optionId: string): boolean {
    return this.studentAnswer(q) === optionId;
  }

  trackByQuestionId(index: number, question: Question): string {
    return question.id;
  }

  updateManualScore(questionId: string, value: number): void {
    console.log(`Updating manual score for question ${questionId} to ${value}`);
    this.manualScores[questionId] = value;
    console.log('Current manualScores:', this.manualScores);
  }

  updateQuestionScore(questionId: string, value: number): void {
    console.log(
      `Updating question score for question ${questionId} to ${value}`
    );
    this.questionScores[questionId] = value;
    console.log('Current questionScores:', this.questionScores);
  }

  updateExplanation(questionId: string, value: string): void {
    this.questionExplanations[questionId] = value;
  }
}
