import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { ConnectionService } from '../../../layout/connections/connection.service';
import {
  DataStoreService,
  StoredTeacher,
} from '../../../layout/connections/data-store.service';
import { AuthService } from '../../../auth.service';

@Component({
  selector: 'app-connect-students',
  imports: [CommonModule, HeaderComponent],
  templateUrl: './connect-students.component.html',
  styleUrl: './connect-students.component.css',
})
export class ConnectStudentsComponent implements OnInit {
  connectedTeachers: StoredTeacher[] = [];

  constructor(
    private connectionService: ConnectionService,
    private dataStore: DataStoreService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadConnectedTeachers();
  }

  private loadConnectedTeachers(): void {
    const studentId = this.authService.getUserId();
    if (!studentId) return;

    // Get connections for this student
    const connections =
      this.connectionService.getConnectionsByStudent(studentId);

    // Get all teachers
    const allTeachers = this.dataStore.getTeachers();

    // Filter to only connected teachers
    this.connectedTeachers = allTeachers.filter((teacher) =>
      connections.some((connection) => connection.teacherId === teacher.id)
    );
  }

  contactTeacher(teacher: StoredTeacher): void {
    // Navigate to the teacher-to-student component with the selected teacher
    // This will open the contact form for that specific teacher
    window.location.href = `/teacher-to-student?teacher=${encodeURIComponent(
      teacher.name
    )}`;
  }

  refreshConnections(): void {
    this.loadConnectedTeachers();
  }
  getAvatar(teacher: StoredTeacher) {
    return teacher.gender === 'Female'
      ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCU_TnWvtxOoxM0E9Mg7qATAlVWg43mdNFLH7bJHGmUxqB62S1rQfrQ7lLotVa3xci96IRgQtupA4ckNRw6iipWPlDqf5ykHpSD_OpWL_egph0TgFmYewVwdVnfbz42BvrBmENuVIHlMzmZ93ZlZDSBoqX8lptmFo8l5m4TSN8V_p-X2a33Ig1amIXbf91Pf_Z_bf5ucawz3QorQdHJP9zDYvVQBQ0eYv6jIvmeRN8WUFlcuZTsg-jCfr2XUdFoLleY-VLLcEzvs60'
      : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCO8yQbbNIqBInP9byXDRaNd7dMerBn3Cn8Y6K4VrhHp2wjqUf7wNaC5rsxiMZcyXY9SkZ65GLMoYNhV1_wDUfBHoXtzhcJWY_F1uIUPHGOVO9WCCbS2BTZN4Okb42lCmloCvPL91qlKbwR0anQNKtdtzjRe2I4_o94HnxiKpeCn7nMdozHkDzCtyDjHghsyuRmW4XEQ64FwjBvOumDxI57pEJ-mYmav3DDRya1gW3s8oUyP3WXQymdzYOVEd4eC9sIwteNpLmPDwk';
  }
}
