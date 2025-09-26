import { Component, OnInit } from '@angular/core';
import emailjs from '@emailjs/browser';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  FormControl,
} from '@angular/forms';
import { toast } from 'ngx-sonner';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { ConnectionService } from '../../../layout/connections/connection.service';
import {
  DataStoreService,
  StoredTeacher,
} from '../../../layout/connections/data-store.service';
import { AuthService } from '../../../auth.service';

@Component({
  selector: 'app-teacher-to-student',
  standalone: true,
  imports: [
    HeaderComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule, // Needed for ngModel
    HlmButton,
    HlmInput,
    BrnSelectImports,
    HlmSelectImports,
  ],
  templateUrl: './teacher-to-student.component.html',
  styleUrls: ['./teacher-to-student.component.css'],
})
export class TeacherToStudentComponent implements OnInit {
  contactForm: FormGroup;
  selectedTeacher: string = '';
  teachers: StoredTeacher[] = [];
  filteredTeachers: StoredTeacher[] = [];
  teacherSearchControl = new FormControl('');
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private connectionService: ConnectionService,
    private dataStore: DataStoreService,
    private authService: AuthService
  ) {
    this.contactForm = this.fb.group({
      title: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadConnectedTeachers();

    // Pre-fill name and email from AuthService (or however you store the user)
    const user = this.authService.getCurrentUser(); // adapt this method if needed
    if (user) {
      this.contactForm.patchValue({
        name: user.name,
        email: user.email,
      });
    }

    this.teacherSearchControl.valueChanges.subscribe((value: string | null) => {
      this.onSearch(value || '');
    });
  }

  loadConnectedTeachers(): void {
    const studentId = this.authService.getUserId();
    if (!studentId) return;

    const connections =
      this.connectionService.getConnectionsByStudent(studentId);
    const allTeachers = this.dataStore.getTeachers();

    // Filter only connected teachers
    this.teachers = allTeachers.filter((teacher) =>
      connections.some((c) => c.teacherId === teacher.id)
    );

    this.filteredTeachers = [...this.teachers];
  }

  onSearch(query: string) {
    const q = query.toLowerCase().trim();
    this.filteredTeachers = !q
      ? [...this.teachers]
      : this.teachers.filter((t) => t.name.toLowerCase().includes(q));
  }

  onTeacherChange(value: string | string[] | undefined) {
    this.selectedTeacher = typeof value === 'string' ? value : '';
    this.teacherSearchControl.setValue('');
    this.filteredTeachers = [...this.teachers];
  }

  sendEmail() {
    if (this.contactForm.invalid || !this.selectedTeacher) return;

    this.isLoading = true;

    const selectedTeacherObj = this.teachers.find(
      (t) => t.name === this.selectedTeacher
    );
    const teacherEmail = selectedTeacherObj?.email || 'mhatem044@gmail.com';

    const templateParams = {
      title: this.contactForm.value.title,
      name: this.contactForm.value.name,
      from_email: this.contactForm.value.email,
      to_email: teacherEmail,
      teacher_name: this.selectedTeacher,
      message: this.contactForm.value.message,
    };

    emailjs
      .send(
        'service_b6je9ts',
        'template_h49v6ug',
        templateParams,
        'iJncH7j5VlcEuvpXm'
      )
      .then(
        () => {
          toast.success(`Message sent successfully to ${teacherEmail}!`);

          // ✅ Reset only editable fields
          this.contactForm.patchValue({
            title: '',
            message: '',
          });

          this.contactForm.markAsPristine();
          this.contactForm.markAsUntouched();

          this.selectedTeacher = '';
          this.isLoading = false;
        },
        (err: any) => {
          toast.error('Failed to send message. Please try again.');
          console.error(err);
          this.isLoading = false;
        }
      );
  }

  focusNext(nextInput?: HTMLTextAreaElement | HTMLInputElement) {
    nextInput?.focus();
  }

  getAvatar(teacher: StoredTeacher) {
    return teacher.gender === 'Female'
      ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCU_TnWvtxOoxM0E9Mg7qATAlVWg43mdNFLH7bJHGmUxqB62S1rQfrQ7lLotVa3xci96IRgQtupA4ckNRw6iipWPlDqf5ykHpSD_OpWL_egph0TgFmYewVwdVnfbz42BvrBmENuVIHlMzmZ93ZlZDSBoqX8lptmFo8l5m4TSN8V_p-X2a33Ig1amIXbf91Pf_Z_bf5ucawz3QorQdHJP9zDYvVQBQ0eYv6jIvmeRN8WUFlcuZTsg-jCfr2XUdFoLleY-VLLcEzvs60'
      : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCO8yQbbNIqBInP9byXDRaNd7dMerBn3Cn8Y6K4VrhHp2wjqUf7wNaC5rsxiMZcyXY9SkZ65GLMoYNhV1_wDUfBHoXtzhcJWY_F1uIUPHGOVO9WCCbS2BTZN4Okb42lCmloCvPL91qlKbwR0anQNKtdtzjRe2I4_o94HnxiKpeCn7nMdozHkDzCtyDjHghsyuRmW4XEQ64FwjBvOumDxI57pEJ-mYmav3DDRya1gW3s8oUyP3WXQymdzYOVEd4eC9sIwteNpLmPDwk';
  }
}
