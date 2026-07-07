import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StudentService, Student } from '../../services/student.service';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './students.component.html',
  styleUrl: './students.component.css'
})
export class StudentsComponent implements OnInit {
  students: Student[] = [];
  filteredStudents: Student[] = [];

  studentForm: FormGroup;
  isEditMode = false;
  selectedStudentId: string | null = null;
  searchText = '';

  constructor(
    private studentService: StudentService,
    private fb: FormBuilder
  ) {
    this.studentForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      level: ['', Validators.required],
      domain: ['', Validators.required],
      skills: ['']
    });
  }

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.studentService.getStudents().subscribe({
      next: (data) => {
        this.students = data;
        this.filteredStudents = data;
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  saveStudent(): void {
    if (this.studentForm.invalid) {
      return;
    }

    const raw = this.studentForm.value;
    const payload: Student = {
      ...raw,
      skills: this.parseSkills(raw.skills)
    };

    if (this.isEditMode && this.selectedStudentId) {
      this.studentService.updateStudent(this.selectedStudentId, payload).subscribe({
        next: () => {
          this.resetForm();
          this.loadStudents();
        }
      });
    } else {
      this.studentService.createStudent(payload).subscribe({
        next: () => {
          this.resetForm();
          this.loadStudents();
        }
      });
    }
  }

  editStudent(student: Student): void {
    this.isEditMode = true;
    this.selectedStudentId = student._id || null;

    this.studentForm.patchValue({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      level: student.level,
      domain: student.domain,
      skills: (student.skills || []).join(', ')
    });
  }

  deleteStudent(id?: string): void {
    if (!id) return;

    if (confirm('Voulez-vous vraiment supprimer cet étudiant ?')) {
      this.studentService.deleteStudent(id).subscribe({
        next: () => {
          this.loadStudents();
        }
      });
    }
  }

  searchStudents(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();

    this.filteredStudents = this.students.filter(
      (student) =>
        student.firstName.toLowerCase().includes(value) ||
        student.lastName.toLowerCase().includes(value) ||
        student.email.toLowerCase().includes(value) ||
        student.level.toLowerCase().includes(value) ||
        student.domain.toLowerCase().includes(value) ||
        (student.skills || []).join(' ').toLowerCase().includes(value)
    );
  }

  resetForm(): void {
    this.studentForm.reset();
    this.isEditMode = false;
    this.selectedStudentId = null;
  }

  // "Angular, Docker, Git" -> ["Angular", "Docker", "Git"]
  private parseSkills(value: string): string[] {
    return (value || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
