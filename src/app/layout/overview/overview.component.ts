import { Component, OnInit } from '@angular/core';
import { DataStoreService } from '../connections/data-store.service';
import { ConnectionService } from '../connections/connection.service';
import { CommonModule } from '@angular/common';
import { ActivityService, ActivityFilter } from '../../activity.service';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogFooter,
  HlmDialogHeader,
} from '@spartan-ng/helm/dialog';
import { toast } from 'ngx-sonner';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { BrnDialogContent, BrnDialogTrigger } from '@spartan-ng/brain/dialog';
@Component({
  selector: 'app-overview',
  imports: [
    CommonModule,
    RouterLink,
    HlmButton,
    HlmDialog,
    HlmDialogContent,
    HlmDialogFooter,
    HlmDialogHeader,
    BrnDialogContent,
    BrnSelectImports,
    HlmSelectImports,
    BrnDialogTrigger,
  ],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit {
  studentsCount = 0;
  teachersCount = 0;
  assignmentsCount = 0;
  relationshipsCount = 0;

  recentActivities: any[] = [];
  showFilterOptions = false;
  currentFilter: ActivityFilter = 'all';

  constructor(
    private store: DataStoreService,
    private connections: ConnectionService,
    private activityService: ActivityService
  ) {}

  ngOnInit(): void {
    this.updateStats();

    // Get activities from service
    this.recentActivities = this.activityService.getFilteredActivities();
    this.currentFilter = this.activityService.getCurrentFilter();

    // Subscribe to future activity updates
    this.activityService.filteredActivities$.subscribe((activities) => {
      this.recentActivities = activities;
    });
  }

  updateStats(): void {
    this.studentsCount = this.store.getStudents().length;
    this.teachersCount = this.store.getTeachers().length;
    this.assignmentsCount = this.connections.getAllConnections().length;

    // For relationships, count unique student-teacher pairs
    const connections = this.connections.getAllConnections();
    const relationshipSet = new Set();

    connections.forEach((conn) => {
      relationshipSet.add(`${conn.studentId}-${conn.teacherId}`);
    });

    this.relationshipsCount = relationshipSet.size;
  }

  calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  toggleFilterOptions() {
    this.showFilterOptions = !this.showFilterOptions;
  }

  applyFilter(filter: ActivityFilter) {
    this.activityService.applyFilter(filter);
    this.currentFilter = filter;
    this.showFilterOptions = false;
  }
  onFilterChange(event: string | string[] | undefined) {
    if (typeof event === 'string') {
      this.applyFilter(event as ActivityFilter);
    }
  }

  getFilterButtonText(): string {
    switch (this.currentFilter) {
      case 'student':
        return 'Students';
      case 'teacher':
        return 'Teachers';
      case 'connection':
        return 'Connections';
      default:
        return 'All Activities';
    }
  }

  clearActivities() {
    this.activityService.clearActivities();
    this.recentActivities = [];
    toast.success('All activities cleared successfully!');
  }
}
