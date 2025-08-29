import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-layout-student',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './layout-student.component.html',
  styleUrl: './layout-student.component.css',
})
export class LayoutStudentComponent {
  constructor() {}
}
