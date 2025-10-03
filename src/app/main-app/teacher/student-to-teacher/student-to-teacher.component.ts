import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { QuizDataService, Quiz } from '../../quiz.service';
import { DataStoreService } from '../../../layout/connections/data-store.service';
import { ConnectionService } from '../../../layout/connections/connection.service';
import { ActivityService } from '../../../activity.service';
import { toast } from 'ngx-sonner';
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogFooter,
  HlmDialogHeader,
} from '@spartan-ng/helm/dialog';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { BrnDialogContent, BrnDialogTrigger } from '@spartan-ng/brain/dialog';
@Component({
  selector: 'app-student-to-teacher',
  imports: [
    CommonModule,
    FormsModule,
    HlmButton,
    HlmInput,
    HlmDialog,
    HlmDialogContent,
    HlmDialogFooter,
    HlmDialogHeader,
    BrnDialogContent,
    BrnDialogTrigger,
    HlmSelectImports,
    BrnSelectImports,
  ],
  templateUrl: './student-to-teacher.component.html',
  styleUrl: './student-to-teacher.component.css',
})
export class StudentToTeacherComponent implements OnInit {
  attendances: any[] = [];
  filteredAttendances: any[] = [];
  quizzes: Quiz[] = [];
  searchTerm = '';
  selectedQuizId = '';
  selectedStatus = '';
  currentPage = 1;
  itemsPerPage = 10;
  statusOptions = [
    'not-started',
    'scheduled',
    'active',
    'completed',
    'graded',
    'expired',
  ];

  // For teacher notes modal
  showNotesModal = false;
  currentAttendance: any | null = null;
  attendanceNotes: { [attendanceId: string]: string } = {};
  teacherNotes = '';
  isEditingNotes = false;
  constructor(
    private quizService: QuizDataService,
    private activityService: ActivityService,
    private store: DataStoreService,
    private connections: ConnectionService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loadQuizzes();
    this.loadAttendanceData();
  }

  private loadQuizzes(): void {
    this.quizzes = this.quizService.getQuizzes('teacher');
  }

  private loadAttendanceData(): void {
    // Determine current teacher from auth (fallback to single teacher in store)
    const authTeacherId = (this.quizService as any)[
      'authService'
    ]?.getUserId?.();
    const teachers = this.store.getTeachers();
    const teacherId =
      authTeacherId ?? (teachers.length === 1 ? teachers[0].id : null);

    // If teacher identity is ambiguous or missing, do not load any data
    if (teacherId == null) {
      this.attendances = [];
      this.filteredAttendances = [];

      return;
    }

    // Get assigned students for this teacher
    const assignedConnections =
      this.connections.getConnectionsByTeacher(teacherId);
    const studentIds = new Set(assignedConnections.map((c) => c.studentId));
    const allStudents = this.store.getStudents();
    const assignedStudents = allStudents.filter((s) => studentIds.has(s.id));

    // Build attendance rows: assigned students x quizzes
    const quizzes = this.quizService.getQuizzes('teacher');
    const rows: any[] = [];
    let rowIdx = 0;
    // If there are no quizzes yet, still show connected students with a default "not-started" status
    if (quizzes.length === 0) {
      for (const student of assignedStudents) {
        rows.push({
          id: `att-${++rowIdx}`,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          quizId: '',
          quizTitle: 'No Quiz',
          startedAt: null,
          submittedAt: null,
          timeSpent: 0,
          totalGrade: NaN,
          pointsEarned: 0,
          totalPoints: 0,
          percentage: 0,
          status: 'not-started',
          gradingStatus: 'No quiz',
          answers: {},
          teacherNotes: '',
        });
      }
      this.attendances = rows;
      this.filteredAttendances = [...this.attendances];
      return;
    }
    for (const student of assignedStudents) {
      for (const q of quizzes) {
        // Derive per-student status
        const derivedStatus = this.quizService.getStudentDerivedStatus(
          q,
          student.id
        );
        const status:
          | 'not-started'
          | 'scheduled'
          | 'active'
          | 'completed'
          | 'graded'
          | 'expired' =
          derivedStatus === 'finished'
            ? 'graded'
            : derivedStatus === 'grading'
            ? 'completed'
            : derivedStatus === 'active'
            ? 'active'
            : derivedStatus === 'scheduled'
            ? 'scheduled'
            : derivedStatus === 'expired'
            ? 'expired'
            : 'not-started';

        const submission = this.quizService.getStudentSubmission(
          q.id,
          student.id
        );

        // Add grading status information
        const isGrading = derivedStatus === 'grading';
        const isGraded = derivedStatus === 'finished';
        const gradingStatus = isGrading
          ? 'Awaiting Grading'
          : isGraded
          ? 'Graded'
          : submission?.studentAnswers
          ? 'Submitted'
          : 'Not Submitted';
        const startedAt = submission?.startedAt || q.startTime;
        const submittedAt = submission?.studentAnswers
          ? new Date(startedAt.getTime() + q.duration * 60000)
          : new Date(q.startTime.getTime() + q.duration * 60000);

        const totalPoints = this.quizService.getTotalPoints(q);
        const pointsEarned = submission?.grade ?? 0;
        const percentage =
          totalPoints > 0 ? Math.round((pointsEarned / totalPoints) * 100) : 0;

        rows.push({
          id: `att-${++rowIdx}`,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          quizId: q.id,
          quizTitle: q.title,
          startedAt,
          submittedAt,
          timeSpent: Math.round(
            (submission?.timeSpent ?? q.duration * 60) / 60
          ),
          totalGrade: submission?.grade ?? NaN,
          pointsEarned,
          totalPoints,
          percentage,
          status,
          gradingStatus,
          answers: submission?.studentAnswers ?? {},
          teacherNotes: (q as any).teacherNotes,
        });
      }
    }

    this.attendances = rows;

    this.filteredAttendances = [...this.attendances];
  }

  filterAttendances(): void {
    this.filteredAttendances = this.attendances.filter((attendance) => {
      const matchesSearch =
        attendance.studentName
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        attendance.studentEmail
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase());
      const matchesQuiz = this.selectedQuizId
        ? attendance.quizId === this.selectedQuizId
        : true;
      const matchesStatus = this.selectedStatus
        ? attendance.status === this.selectedStatus
        : true;

      return matchesSearch && matchesQuiz && matchesStatus;
    });

    this.currentPage = 1;
  }

  filterByQuiz(): void {
    this.filterAttendances();
  }

  filterByStatus(): void {
    this.filterAttendances();
  }

  getQuizTitle(quizId: string): string {
    const quiz = this.quizzes.find((q) => q.id === quizId);
    return quiz ? quiz.title : 'Unknown Quiz';
  }

  viewDetails(attendance: any): void {
    if (attendance.status === 'grading' || attendance.status === 'finished') {
      this.router.navigate(['grading-quiz', attendance.quizId], {
        queryParams: {
          studentId: attendance.studentId,
          attendanceId: attendance.id,
        },
      });
    } else {
      toast.info('This quiz has not been completed yet and cannot be graded.');
    }
  }

  addTeacherNotes(attendance: any, editMode = false): void {
    this.currentAttendance = { ...attendance };
    this.teacherNotes = ''; // always start fresh
    this.isEditingNotes = editMode;
    this.showNotesModal = true;
  }

  saveTeacherNotes(): void {
    if (this.currentAttendance) {
      this.quizService.updateQuiz(this.currentAttendance.quizId, {
        teacherNotes: this.teacherNotes,
      } as any);

      // Reflect changes in local state
      const idx = this.attendances.findIndex(
        (a) => a.id === this.currentAttendance!.id
      );
      if (idx !== -1) {
        this.attendances[idx].teacherNotes = this.teacherNotes;
      }
      this.filterAttendances();

      toast.success('Teacher notes saved successfully!');

      this.activityService.addActivity(
        'teacher',
        this.currentAttendance.teacherNotes ? 'Updated Notes' : 'Added Notes',
        `${this.isEditingNotes ? 'Updated' : 'Added'} notes for ${
          this.currentAttendance.studentName
        }'s ${this.getQuizTitle(this.currentAttendance.quizId)} quiz`
      );
    }

    this.teacherNotes = '';

    this.closeNotesModal();
  }

  closeNotesModal(): void {
    this.showNotesModal = false;
    this.currentAttendance = null;
    this.teacherNotes = '';
    this.isEditingNotes = false;
  }
  getNotes(attendanceId: string) {
    return this.attendanceNotes[attendanceId] || 'No notes available.';
  }
  exportToCSV(): void {
    const headers = [
      'Student Name',
      'Student Email',
      'Quiz Title',
      'Started At',
      'Submitted At',
      'Time Spent (min)',
      'Grade',
      'Status',
      'Teacher Notes',
    ];
    const csvData = this.filteredAttendances.map((att) => [
      att.studentName,
      att.studentEmail,
      att.quizTitle,
      att.startedAt ? att.startedAt.toLocaleString() : 'No quiz yet',
      att.submittedAt ? att.submittedAt.toLocaleString() : 'No submission',
      att.timeSpent,
      att.totalGrade
        ? `${att.pointsEarned}/${att.totalPoints} (${att.percentage}%)`
        : 'N/A',
      att.status,
      att.teacherNotes || '',
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quiz-attendance-${
      new Date().toISOString().split('T')[0]
    }.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast.success('Attendance data exported to CSV!');
    this.activityService.addActivity(
      'teacher',
      'Exported Data',
      'Exported attendance data to CSV'
    );
  }

  nextPage(): void {
    if (
      this.currentPage * this.itemsPerPage <
      this.filteredAttendances.length
    ) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  get paginatedAttendances(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredAttendances.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredAttendances.length / this.itemsPerPage);
  }

  goBack(): void {
    this.location.back();
  }
}
