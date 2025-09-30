import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Quiz, QuizStatus, Question, Option } from './quiz.model';
import { ConnectionService } from '../layout/connections/connection.service';
import { DataStoreService } from '../layout/connections/data-store.service';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root',
})
export class QuizDataService {
  private quizzesSubject = new BehaviorSubject<Quiz[]>([]);
  quizzes$ = this.quizzesSubject.asObservable();
  // Per-student submissions keyed by quizId -> studentId
  private submissions: {
    [quizId: string]: {
      [studentId: number]: {
        startedAt?: Date;
        timeSpent?: number;
        studentAnswers?: { [questionId: string]: string };
        status?: QuizStatus; // derived when read; persisted for simplicity
        grade?: number;
        teacherGraded?: boolean;
      };
    };
  } = {};

  // Per-student grading state and explanations
  private gradingState: {
    [quizId: string]: {
      [studentId: number]: {
        questionScores: { [questionId: string]: number };
        manualScores: { [questionId: string]: number };
      };
    };
  } = {};
  private currentQuiz: Quiz | null = null;

  constructor(
    private connectionService: ConnectionService,
    private authService: AuthService,
    private dataStore: DataStoreService
  ) {
    const savedQuizzes = localStorage.getItem('quizzes');
    if (savedQuizzes) {
      const parsed: Quiz[] = JSON.parse(savedQuizzes).map((q: any) => ({
        ...q,
        startTime: new Date(q.startTime),
        timeSpent: q.timeSpent ?? 0,
        teacherId: q.teacherId ?? 0, // Default to 0 if no teacherId (will be filtered out)
      }));
      this.quizzesSubject.next(parsed.map((q) => this.evaluateQuizStatus(q)));
    }

    const savedSubmissions = localStorage.getItem('quiz_submissions');
    if (savedSubmissions) {
      try {
        const parsed = JSON.parse(savedSubmissions);
        // revive dates
        Object.keys(parsed || {}).forEach((quizId) => {
          Object.keys(parsed[quizId] || {}).forEach((studentId) => {
            if (parsed[quizId][studentId]?.startedAt) {
              parsed[quizId][studentId].startedAt = new Date(
                parsed[quizId][studentId].startedAt
              );
            }
          });
        });
        this.submissions = parsed;
      } catch {
        this.submissions = {};
      }
    }

    const savedGrading = localStorage.getItem('quiz_grading_state');
    if (savedGrading) {
      try {
        this.gradingState = JSON.parse(savedGrading);
      } catch {
        this.gradingState = {};
      }
    }

    const savedCurrentQuiz = localStorage.getItem('currentQuiz');
    if (savedCurrentQuiz) {
      const parsed = JSON.parse(savedCurrentQuiz);
      this.currentQuiz = {
        ...parsed,
        startTime: new Date(parsed.startTime),
        timeSpent: parsed.timeSpent ?? 0,
        teacherId: parsed.teacherId ?? 0, // Default to 0 if no teacherId
      };
      if (this.currentQuiz) {
        this.currentQuiz = this.evaluateQuizStatus(this.currentQuiz);
      }
    }
  }

  // ---------------- Teacher Methods ----------------
  addQuiz(quiz: Quiz) {
    quiz.status = 'unpublished';
    const updatedQuizzes = [...this.quizzesSubject.value, quiz];
    this.quizzesSubject.next(updatedQuizzes);
    this.saveQuizzes(updatedQuizzes);
  }

  publishQuiz(quizId: string) {
    this.updateQuiz(quizId, { status: 'published' });
  }

  // Automatically transition quiz to grading status when time expires
  checkAndUpdateQuizStatus(quizId: string) {
    const quiz = this.getQuizById(quizId);
    if (!quiz) return;

    const now = Date.now();
    const end = quiz.startTime.getTime() + quiz.duration * 60000;

    // If quiz is published and time has expired, set to grading regardless of submissions
    if (quiz.status === 'published' && now > end) {
      this.updateQuiz(quizId, { status: 'grading' });

      // Set all connected students to grading status if they haven't submitted
      const teacherId = quiz.teacherId;
      if (teacherId) {
        const connectedStudents = this.getAllConnectedStudentsForQuiz(
          quizId,
          teacherId
        );
        connectedStudents.forEach((student) => {
          if (!student.hasSubmission) {
            this.setGradingForStudent(quizId, student.studentId);
          }
        });
      }
    }
  }

  // Check and update all quiz statuses automatically
  checkAllQuizStatuses() {
    const quizzes = this.quizzesSubject.value;
    quizzes.forEach((quiz) => {
      // If a quiz is already finished, keep it finished
      if (quiz.status === 'finished') return;
      // If a quiz is in grading, verify completion persistently
      if (quiz.status === 'grading') {
        this.checkQuizCompletionStatus(quiz.id);
        return;
      }
      this.checkAndUpdateQuizStatus(quiz.id);
    });
  }

  // Check if all students are graded and update quiz status accordingly
  checkQuizCompletionStatus(quizId: string) {
    const quiz = this.getQuizById(quizId);
    if (!quiz) return;

    const teacherId = quiz.teacherId;
    if (!teacherId) return;

    // Get all connected students for this quiz
    const connectedStudents = this.getAllConnectedStudentsForQuiz(
      quizId,
      teacherId
    );

    // Check if all students who submitted are graded
    const submittedStudents = connectedStudents.filter(
      (student) => student.hasSubmission
    );
    const gradedStudents = submittedStudents.filter((student) => {
      const submission = this.getStudentSubmission(quizId, student.studentId);
      return submission?.teacherGraded === true;
    });

    // If all submitted students are graded, mark quiz as finished
    if (
      submittedStudents.length > 0 &&
      submittedStudents.length === gradedStudents.length
    ) {
      // Only update if not already finished
      if (quiz.status !== 'finished') {
        this.updateQuiz(quizId, { status: 'finished' });
      }
      return;
    }

    // Additional safeguard: if there are no submissions and the quiz is past end time,
    // keep it in grading but do not regress a finished quiz (handled above)
  }

  gradeQuiz(quiz: Quiz, grade: number) {
    this.updateQuiz(quiz.id, {
      status: 'finished',
      grade,
      teacherGraded: true,
    });
  }

  // ---------------- Student Methods ----------------
  submitQuizForStudent(
    quiz: Quiz,
    studentId: number,
    answers: { [questionId: string]: string },
    timeSpent?: number
  ) {
    const now = new Date();
    if (!this.submissions[quiz.id]) this.submissions[quiz.id] = {};
    this.submissions[quiz.id][studentId] = {
      ...(this.submissions[quiz.id][studentId] || {}),
      studentAnswers: { ...answers },
      startedAt: this.submissions[quiz.id][studentId]?.startedAt || now,
      timeSpent: timeSpent ?? this.submissions[quiz.id][studentId]?.timeSpent,
      status: 'grading',
    };
    this.saveSubmissions();

    // Check if quiz should transition to grading status
    this.checkAndUpdateQuizStatus(quiz.id);
  }

  setGradingForStudent(quizId: string, studentId: number) {
    if (!this.submissions[quizId]) this.submissions[quizId] = {};
    const entry = this.submissions[quizId][studentId] || {};
    this.submissions[quizId][studentId] = {
      ...entry,
      status: 'grading',
      startedAt: entry.startedAt || new Date(),
    };
    this.saveSubmissions();
  }

  startQuizForStudent(quizId: string, studentId: number) {
    if (!this.submissions[quizId]) this.submissions[quizId] = {};
    const entry = this.submissions[quizId][studentId] || {};
    this.submissions[quizId][studentId] = {
      ...entry,
      startedAt: entry.startedAt || new Date(),
    };
    this.saveSubmissions();
  }
  // ---------------- Shared Methods ----------------
  getQuizzes(role: 'teacher' | 'student'): Quiz[] {
    const updated = this.quizzesSubject.value.map((q) =>
      this.evaluateQuizStatus(q, role)
    );

    if (role === 'student') {
      const studentId = this.authService.getUserId();
      if (!studentId) return [];

      // Get connected teacher IDs for this student
      const connections =
        this.connectionService.getConnectionsByStudent(studentId);
      const connectedTeacherIds = connections.map((c) => c.teacherId);

      return updated
        .filter((q) => q.status !== 'unpublished')
        .filter((q) => connectedTeacherIds.includes(q.teacherId))
        .map((q) => this.withStudentDerivedStatus(q, studentId));
    }

    if (role === 'teacher') {
      const teacherId = this.authService.getUserId();
      if (!teacherId) return [];

      // Only show quizzes created by this teacher
      const teacherQuizzes = updated.filter((q) => q.teacherId === teacherId);
      // Ensure grading quizzes are checked for completion on retrieval
      teacherQuizzes.forEach((q) => {
        if (q.status === 'grading') {
          this.checkQuizCompletionStatus(q.id);
        }
      });
      return teacherQuizzes;
    }

    return updated;
  }
  getQuizById(id: string): Quiz | undefined {
    return this.quizzesSubject.value.find((q) => q.id === id);
  }

  setCurrentQuiz(quiz: Quiz) {
    this.currentQuiz = this.evaluateQuizStatus(quiz);
    // Don't modify the global quiz object with student-specific data
    localStorage.setItem(
      'currentQuiz',
      JSON.stringify({
        ...quiz,
        startTime: quiz.startTime.toISOString(),
      })
    );
  }

  getCurrentQuiz(): Quiz | null {
    if (!this.currentQuiz) return null;
    this.currentQuiz = this.evaluateQuizStatus(this.currentQuiz);
    return this.currentQuiz;
  }

  getStudentQuizData(quizId: string, studentId: number): Quiz | null {
    const quiz = this.getQuizById(quizId);
    if (!quiz) return null;

    const submission = this.getStudentSubmission(quizId, studentId);
    if (!submission) return quiz;

    // Return quiz with student-specific data for display purposes
    return {
      ...quiz,
      studentAnswers: submission.studentAnswers,
      startedAt: submission.startedAt,
      timeSpent: submission.timeSpent,
      grade: submission.grade,
      status:
        submission.status || this.getStudentDerivedStatus(quiz, studentId),
    };
  }

  clearCurrentQuiz() {
    this.currentQuiz = null;
    localStorage.removeItem('currentQuiz');
  }

  // ---------------- Status Evaluation ----------------
  private evaluateQuizStatus = (
    quiz: Quiz,
    role?: 'teacher' | 'student'
  ): Quiz => {
    const now = Date.now();
    const start = quiz.startTime.getTime();
    const end = start + quiz.duration * 60000;

    let status: QuizStatus = quiz.status;

    // For teachers, show unpublished, published, grading, and completed statuses
    if (role === 'teacher') {
      // Never regress a finished quiz
      if (status === 'finished') {
        return { ...quiz, status };
      }
      if (
        ['unpublished', 'published', 'grading', 'finished'].includes(status)
      ) {
        return { ...quiz, status };
      }

      // Check if quiz time has finished and there are student submissions
      if (status === 'published' && now > end) {
        // Automatically transition to grading status when time expires
        return { ...quiz, status: 'grading' };
      }

      // If quiz is published, keep it as published
      if (status === 'published') {
        return { ...quiz, status: 'published' };
      }
      // If quiz was previously in other states, convert to published
      return { ...quiz, status: 'published' };
    }

    // For students, show the full range of statuses
    if (['unpublished', 'published'].includes(status)) {
      // Students should not see unpublished quizzes, and published should be evaluated
      if (status === 'unpublished') {
        return { ...quiz, status: 'unpublished' }; // This will be filtered out in getQuizzes
      }
      // Evaluate published quiz for student status
      if (quiz.grade !== undefined) status = 'finished';
      else if (now < start) status = 'scheduled';
      else if (now >= start && now <= end) status = 'active';
      else if (now > end) status = 'expired';
    } else {
      // Global quiz object no longer reflects per-student state
      if (quiz.grade !== undefined) status = 'finished';
      else if (now < start) status = 'scheduled';
      else if (now >= start && now <= end) status = 'active';
      else if (now > end) status = 'expired';
    }

    return { ...quiz, status, startTime: new Date(quiz.startTime) };
  };

  // ---------------- Persistence Helpers ----------------
  updateQuiz(quizId: string, updatedQuiz: Partial<Quiz>) {
    const updated = this.quizzesSubject.value.map((q) =>
      q.id === quizId ? { ...q, ...updatedQuiz } : q
    );
    this.quizzesSubject.next(updated);
    this.saveQuizzes(updated);

    if (this.currentQuiz && this.currentQuiz.id === quizId) {
      this.currentQuiz = { ...this.currentQuiz, ...updatedQuiz };
      localStorage.setItem(
        'currentQuiz',
        JSON.stringify({
          ...this.currentQuiz,
          startTime: this.currentQuiz.startTime.toISOString(),
        })
      );
    }
  }
  updateStudentAnswerForStudent(
    quizId: string,
    studentId: number,
    questionId: string,
    answer: string
  ) {
    if (!this.submissions[quizId]) this.submissions[quizId] = {};
    const existing = this.submissions[quizId][studentId] || {};
    this.submissions[quizId][studentId] = {
      ...existing,
      studentAnswers: {
        ...(existing.studentAnswers || {}),
        [questionId]: answer,
      },
    };
    this.saveSubmissions();
  }
  deleteQuiz(quizId: string) {
    const updated = this.quizzesSubject.value.filter((q) => q.id !== quizId);
    this.quizzesSubject.next(updated);
    this.saveQuizzes(updated);

    if (this.currentQuiz && this.currentQuiz.id === quizId) {
      this.clearCurrentQuiz();
    }
  }
  private saveQuizzes(quizzes: Quiz[]) {
    const saveable = quizzes.map((q) => ({
      ...q,
      startTime: q.startTime.toISOString(),
    }));
    localStorage.setItem('quizzes', JSON.stringify(saveable));
  }
  private explanations: {
    [quizId: string]: { [studentId: number]: { [questionId: string]: string } };
  } = {};

  saveExplanations(
    quizId: string,
    studentId: number,
    data: { [questionId: string]: string }
  ) {
    if (!this.explanations[quizId]) this.explanations[quizId] = {} as any;
    this.explanations[quizId][studentId] = { ...data };
  }
  getExplanations(quizId: string, studentId: number) {
    return this.explanations[quizId]?.[studentId]
      ? { ...this.explanations[quizId][studentId] }
      : {};
  }

  saveGradingState(
    quizId: string,
    studentId: number,
    questionScores: { [questionId: string]: number },
    manualScores: { [questionId: string]: number }
  ) {
    if (!this.gradingState[quizId]) this.gradingState[quizId] = {} as any;
    this.gradingState[quizId][studentId] = {
      questionScores: { ...questionScores },
      manualScores: { ...manualScores },
    };
    localStorage.setItem(
      'quiz_grading_state',
      JSON.stringify(this.gradingState)
    );
  }
  // Get grading state
  getGradingState(quizId: string, studentId: number) {
    if (!this.gradingState[quizId]?.[studentId]) {
      return { questionScores: {}, manualScores: {} };
    }
    return {
      questionScores: {
        ...this.gradingState[quizId][studentId].questionScores,
      },
      manualScores: { ...this.gradingState[quizId][studentId].manualScores },
    };
  }

  // ---------------- Per-student helpers ----------------
  getStudentSubmission(quizId: string, studentId: number) {
    return this.submissions[quizId]?.[studentId];
  }

  hasStudentSubmissions(quizId: string): boolean {
    const quizSubmissions = this.submissions[quizId];
    if (!quizSubmissions) return false;

    return Object.values(quizSubmissions).some(
      (submission) =>
        submission.studentAnswers &&
        Object.keys(submission.studentAnswers).length > 0
    );
  }

  getStudentDerivedStatus(quiz: Quiz, studentId: number): QuizStatus {
    const sub = this.getStudentSubmission(quiz.id, studentId);
    const now = Date.now();
    const start = quiz.startTime.getTime();
    const end = start + quiz.duration * 60000;
    if (sub?.grade !== undefined) return 'finished';
    if (sub?.studentAnswers) return 'grading';
    if (now < start) return 'scheduled';
    if (now >= start && now <= end) return 'active';
    return 'expired';
  }

  private withStudentDerivedStatus(quiz: Quiz, studentId: number): Quiz {
    const derived = this.getStudentDerivedStatus(quiz, studentId);
    const submission = this.getStudentSubmission(quiz.id, studentId);
    return {
      ...quiz,
      status: derived,
      grade: submission?.grade,
    };
  }

  gradeQuizForStudent(quiz: Quiz, studentId: number, grade: number) {
    if (!this.submissions[quiz.id]) this.submissions[quiz.id] = {};
    const existing = this.submissions[quiz.id][studentId] || {};
    this.submissions[quiz.id][studentId] = {
      ...existing,
      grade,
      status: 'finished',
      teacherGraded: true,
    };
    this.saveSubmissions();

    // Emit update to notify components
    this.quizzesSubject.next([...this.quizzesSubject.value]);
  }

  private saveSubmissions() {
    const serializable: any = {};
    Object.keys(this.submissions).forEach((quizId) => {
      serializable[quizId] = {};
      Object.keys(this.submissions[quizId]).forEach((sid) => {
        const studentId = Number(sid);
        const entry = this.submissions[quizId][studentId];
        serializable[quizId][studentId] = {
          ...entry,
          startedAt: entry.startedAt
            ? entry.startedAt.toISOString()
            : undefined,
        };
      });
    });
    localStorage.setItem('quiz_submissions', JSON.stringify(serializable));
  }

  // ---------------- Display helpers ----------------
  getTeacherName(teacherId: number): string {
    const teacher = this.dataStore
      .getTeachers()
      .find((t) => t.id === teacherId);
    return teacher ? teacher.name : `Teacher #${teacherId}`;
  }

  getStudentName(studentId: number): string {
    const student = this.dataStore
      .getStudents()
      .find((s) => s.id === studentId);
    return student ? student.name : `Student #${studentId}`;
  }

  // Calculate total possible points for a quiz
  getTotalPoints(quiz: Quiz): number {
    return quiz.questions.reduce(
      (total, question) => total + question.points,
      0
    );
  }

  getGradingStudentsForQuiz(
    quizId: string,
    teacherId: number
  ): { studentId: number; name: string }[] {
    const teacherConnections =
      this.connectionService.getConnectionsByTeacher(teacherId);
    const connected = new Set(teacherConnections.map((c) => c.studentId));
    const students = Object.entries(this.submissions[quizId] || {})
      .map(([sid, entry]) => ({ studentId: Number(sid), entry }))
      .filter(
        ({ studentId, entry }) =>
          connected.has(studentId) && entry.status === 'grading'
      )
      .map(({ studentId }) => ({
        studentId,
        name: this.getStudentName(studentId),
      }));
    return students;
  }

  getAllConnectedStudentsForQuiz(
    quizId: string,
    teacherId: number
  ): {
    studentId: number;
    name: string;
    status: string;
    hasSubmission: boolean;
  }[] {
    const teacherConnections =
      this.connectionService.getConnectionsByTeacher(teacherId);
    const connected = new Set(teacherConnections.map((c) => c.studentId));
    const quiz = this.getQuizById(quizId);
    if (!quiz) return [];

    const now = Date.now();
    const end = quiz.startTime.getTime() + quiz.duration * 60000;

    const students = Array.from(connected).map((studentId) => {
      const submission = this.getStudentSubmission(quizId, studentId);
      let derivedStatus = this.getStudentDerivedStatus(quiz, studentId);

      // If quiz time has expired and student hasn't submitted, set to grading
      if (
        now > end &&
        !submission?.studentAnswers &&
        quiz.status === 'grading'
      ) {
        derivedStatus = 'grading';
      }

      return {
        studentId,
        name: this.getStudentName(studentId),
        status: derivedStatus,
        hasSubmission: !!submission?.studentAnswers,
      };
    });

    return students;
  }

  // Get all students for grading view with detailed status
  getAllStudentsForGrading(
    quizId: string,
    teacherId: number
  ): {
    studentId: number;
    name: string;
    status: string;
    hasSubmission: boolean;
    isGraded: boolean;
    grade?: number;
    totalPoints: number;
    percentage?: number;
  }[] {
    const teacherConnections =
      this.connectionService.getConnectionsByTeacher(teacherId);
    const connected = new Set(teacherConnections.map((c) => c.studentId));
    const quiz = this.getQuizById(quizId);
    if (!quiz) return [];

    const now = Date.now();
    const end = quiz.startTime.getTime() + quiz.duration * 60000;
    const totalPoints = this.getTotalPoints(quiz);

    const students = Array.from(connected).map((studentId) => {
      const submission = this.getStudentSubmission(quizId, studentId);
      let derivedStatus = this.getStudentDerivedStatus(quiz, studentId);

      // If quiz time has expired and student hasn't submitted, set to grading
      if (
        now > end &&
        !submission?.studentAnswers &&
        quiz.status === 'grading'
      ) {
        derivedStatus = 'grading';
      }

      const isGraded = submission?.teacherGraded === true;
      const grade = submission?.grade ?? 0;
      const percentage =
        totalPoints > 0 ? Math.round((grade / totalPoints) * 100) : 0;

      return {
        studentId,
        name: this.getStudentName(studentId),
        status: derivedStatus,
        hasSubmission: !!submission?.studentAnswers,
        isGraded,
        grade,
        totalPoints,
        percentage,
      };
    });

    return students;
  }
}

export type { Quiz, QuizStatus, Question, Option };
