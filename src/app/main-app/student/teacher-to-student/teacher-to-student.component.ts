import { Component } from '@angular/core';
import emailjs from 'emailjs-com';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';

@Component({
  selector: 'app-teacher-to-student',
  standalone: true,
  imports: [
    HeaderComponent,
    CommonModule,
    ReactiveFormsModule,
    HlmButton,
    HlmInput,
    BrnSelectImports,
    HlmSelectImports,
  ],
  templateUrl: './teacher-to-student.component.html',
  styleUrls: ['./teacher-to-student.component.css'],
})
export class TeacherToStudentComponent {
  contactForm: FormGroup;
  selectedTeacher: string = '';

  // Mock teacher data
  teachers = [
    {
      name: 'Ms. Harper',
      subject: 'Mathematics',
      email: 'heradwwad.math@example.com',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAjwP1fj5uXRgzbTWc_Ip80AAYq8ix1olvsHenRYxq2K4xAOer28yyx070FW3DvMpnoofliuDSRe3_MGcLlfQh2an6EETa6fO5ZQEUBZrmQfFlY-DpLvL99rPH_Sz9niZb1T_fZq3S0RhfoVuKt8VTKKZhsexhJoB1gSge8GmyNZ8oT7qQTd8qa9YQtFIR2X8aes05slEnZyj9Lw-jwKaIpTRGhspYwobfNS3ht5Zmn-6qh4VYyLIH7N5yD8TEjmRmzY8LpbZqAVUI',
    },
    {
      name: 'Mr. Bennett',
      subject: 'Physics',
      email: 'her.math@example.com',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDI4fmojvR_79vvZkrHJaSlRCvJ2jVI__G0DCvNb87smSbAgZCLHpy2OGSOnjO00oEHKWmN2R2-7VVNa0isTmcFQBta4JIqAJMSFjlReh5sV1f5n-YjeLtV9mVY-mp9Lnx_qV8KNm154k5lX1ef84QVscn2sZHROzOWSVC6OpQZF5sUMZrSyJwUBYM1uzjMbS4ZT5uBR07jHheDMFCk0v86-6B23XTg4djknDmYSWHn1GNpjIJemZA_n-UMy_qLHsyr1wSPU2WEaYM',
    },
    {
      name: 'Dr. Carter',
      subject: 'Chemistry',
      email: 'harper.math@example.com',

      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCO8yQbbNIqBInP9byXDRaNd7dMerBn3Cn8Y6K4VrhHp2wjqUf7wNaC5rsxiMZcyXY9SkZ65GLMoYNhV1_wDUfBHoXtzhcJWY_F1uIUPHGOVO9WCCbS2BTZN4Okb42lCmloCvPL91qlKbwR0anQNKtdtzjRe2I4_o94HnxiKpeCn7nMdozHkDzCtyDjHghsyuRmW4XEQ64FwjBvOumDxI57pEJ-mYmav3DDRya1gW3s8oUyP3WXQymdzYOVEd4eC9sIwteNpLmPDwk',
    },
    {
      name: 'Mrs. Davis',
      email: 'bennett.physics@example.com',

      subject: 'Biology',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBioliX2q4ObDC9nzfwhowZZsX71e0_ebQwOVXnYPPIeYMInmH2Yv9IOAYoy1IuYq2JRwQmJbeJkVtuqc5P2jdVeqILn4tSjcv0zK8tFMabTHoJLPIQLPWAW3Z9iwAh81qUoL1oxHxG0GYgJQ0erPRtySQDl0QETQ83ZI6c4IMXL6mU-I26TkBk9kYbsnpUWqHo9LU98Vg5fg7hsb3q2IQsl6pYnlMwv_8KtQpKqF2cq3N_8PrfNNzY5JF1gpJt37OanGevGMM_SQk',
    },
    {
      name: 'Mr. Evans',
      email: 'carter.chem@example.com',
      subject: 'History',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCW3TU0mXQ8gTO9zfdGaEjJBja-40DQw5srcL2QrH5ErL1xCCLYvEvYSqpKM2Zm0_U1nducPpedkN15E2GEzLjS17morA5ukoXr8xklvkF9hQiSZt0hcm_iKT9quzod5GkacB-JFWwXqHwmUsopqQuVpGgodByYxB6sFe5XUE3h1VPGbcDlKrcJ0QpazqO_z6OWxWEAy8z1bgC3xy9wintU5_bF7wZNIyz4AhSLkGU1cHRWLINHfJErwZD_irlaktd2QxvSGUa4E7E',
    },
    {
      email: 'davis.bio@example.com',

      name: 'Ms. Flores',
      subject: 'English',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCiDCPkNf09p8KAEMbNcwg6fcpTBqVX99sv25uiQI2is5PhRA57VFnsAOlkOornDEhERPIOsHXLy_FVRNyhKPvy_GbY8C0wG3q3aQhx43IPsK0bZ_Mq1OH2tl3h7t9j4bQX_74REIFKl0xMc9VJmFQ_vju16X6OqpVj7Qouc-A313SCPH5zDgN2iTOMUYC_TyhIJy2lK2gqD65WH10wzy354hNi19rbr_ou1gbK-9A4D0jSmmUctHo1EdJ9ZzUs_OklQ1pwnwdh0FE',
    },
    {
      email: 'edwards.english@example.com',
      name: 'Mr. Garcia',
      subject: 'Art',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDB2IoJ-BYddGXn8RduaXmVmJuRyDcoY-SDQOfolCAqJ8g6sX8g_hkxX4-TwkM4JHa0UPQ7h7WN-iUzEi0IP0ERaSgm2_CRlHqDesO4BdccZjZe0TYEKx4ZEhx96-1JXnm7sWJUZ30pBRDBUms4V55sUAE3VUS3K5b2S8Bn5vy1_jRSfj07cRfPKAfjWb3z2zfafPofzPSSC_gkEkIvuJkYx6NiX-RPGpuuc4trK4J8B1_5cARNLqgI7z_HyV8DdRpLBRdFF4kYZOo',
    },
    {
      email: 'fernandez.history@example.com',
      name: 'Ms. Hayes',
      subject: 'Music',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDcfrSM27jy9L3uIpfZ4NB9C_3DNLl8Eb1HeHgBKX_dnuGzkhyYah9aiaCaiowv3fxR_GAZidfdCAAHeFHyXtRVY4OpzYt_rvp7FRDk56KtygvcNv1DsfDC7hJ_F_1sKEmT6U46wwN930NYWVpmtEt2uQNcX88TzDugI7LnO4xWz4lhhtip6RXM85EN3kH6BSDNc95bI6tqzlMOgQniMAS9IIXXav5AXIuxZH304q0RM-_0fXA6aRuiJrs1oAZrL_Q8hfAlwyLBtWA',
    },
    {
      name: 'Anas',
      subject: 'Mathematics',
      email: 'anasabdoali22@gmail.com',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDcfrSM27jy9L3uIpfZ4NB9C_3DNLl8Eb1HeHgBKX_dnuGzkhyYah9aiaCaiowv3fxR_GAZidfdCAAHeFHyXtRVY4OpzYt_rvp7FRDk56KtygvcNv1DsfDC7hJ_F_1sKEmT6U46wwN930NYWVpmtEt2uQNcX88TzDugI7LnO4xWz4lhhtip6RXM85EN3kH6BSDNc95bI6tqzlMOgQniMAS9IIXXav5AXIuxZH304q0RM-_0fXA6aRuiJrs1oAZrL_Q8hfAlwyLBtWA',
    },
  ];

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.required],
    });
  }

  isLoading = false;
  sendEmail() {
    if (this.contactForm.invalid || !this.selectedTeacher) return;

    this.isLoading = true;

    // Example: Let's say each teacher has an email property
    const selectedTeacherObj = this.teachers.find(
      (t) => t.name === this.selectedTeacher
    );
    const teacherEmail = selectedTeacherObj?.email || 'fallback@example.com';

    const templateParams = {
      from_name: this.contactForm.value.name,
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
          alert(`Message sent successfully to ${teacherEmail}!`);
          this.contactForm.reset();
          this.selectedTeacher = '';
          this.isLoading = false;
        },
        (err: any) => {
          alert('Failed to send message.');
          console.error(err);
          this.isLoading = false;
        }
      );
  }
}
