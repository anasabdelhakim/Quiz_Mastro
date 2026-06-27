import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ActivityService } from '../../activity.service';
import { SearchService, SearchResult } from '../../search.service';
import { AuthService } from '../../auth.service';
import {
  BrnPopover,
  BrnPopoverContent,
  BrnPopoverTrigger,
} from '@spartan-ng/brain/popover';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmPopoverContent } from '@spartan-ng/helm/popover';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BrnPopover,
    BrnPopoverContent,
    BrnPopoverTrigger,
    HlmButton,
    HlmPopoverContent,
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  notificationCount = 0;
  searchTerm = '';
  searchResults: SearchResult[] = [];
  showSearchResults = false;
  isSearchFocused = false;
  showTypingIndicator = false;

  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('searchResultsContainer') searchResultsContainer!: ElementRef;

  constructor(
    private activityService: ActivityService,
    private searchService: SearchService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.notificationCount = this.activityService.getNotificationCount();
    this.activityService.notificationCount$.subscribe((count) => {
      this.notificationCount = count;
    });
  }

  clearNotifications(): void {
    this.activityService.clearNotifications();
  }

  onSearchChange(): void {
    this.showTypingIndicator = true;

    setTimeout(() => {
      this.searchResults = this.searchService.search(this.searchTerm);
      this.showSearchResults = this.isSearchFocused && this.searchResults.length > 0;
      this.showTypingIndicator = false;
    }, 300);
  }

  onSearchFocus(): void {
    this.isSearchFocused = true;
    this.searchResults = this.searchService.search(this.searchTerm);
    this.showSearchResults = this.searchResults.length > 0;
  }

  onSearchBlur(): void {
    setTimeout(() => {
      if (!this.isMouseOverResults()) {
        this.isSearchFocused = false;
        this.showSearchResults = false;
      }
    }, 200);
  }

  isMouseOverResults(): boolean {
    return this.searchResultsContainer?.nativeElement?.matches(':hover') || false;
  }

  selectResult(result: SearchResult): void {
    this.searchService.navigateToResult(result);
    this.searchTerm = '';
    this.searchResults = [];
    this.showSearchResults = false;
    this.isSearchFocused = false;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchResults = [];
    this.showSearchResults = false;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  getAvatar(user: any): string {
    if (!user) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuCO8yQbbNIqBInP9byXDRaNd7dMerBn3Cn8Y6K4VrhHp2wjqUf7wNaC5rsxiMZcyXY9SkZ65GLMoYNhV1_wDUfBHoXtzhcJWY_F1uIUPHGOVO9WCCbS2BTZN4Okb42lCmloCvPL91qlKbwR0anQNKtdtzjRe2I4_o94HnxiKpeCn7nMdozHkDzCtyDjHghsyuRmW4XEQ64FwjBvOumDxI57pEJ-mYmav3DDRya1gW3s8oUyP3WXQymdzYOVEd4eC9sIwteNpLmPDwk';
    }
    return user.gender?.toLowerCase() === 'female'
      ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCU_TnWvtxOoxM0E9Mg7qATAlVWg43mdNFLH7bJHGmUxqB62S1rQfrQ7lLotVa3xci96IRgQtupA4ckNRw6iipWPlDqf5ykHpSD_OpWL_egph0TgFmYewVwdVnfbz42BvrBmENuVIHlMzmZ93ZlZDSBoqX8lptmFo8l5m4TSN8V_p-X2a33Ig1amIXbf91Pf_Z_bf5ucawz3QorQdHJP9zDYvVQBQ0eYv6jIvmeRN8WUFlcuZTsg-jCfr2XUdFoLleY-VLLcEzvs60'
      : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCO8yQbbNIqBInP9byXDRaNd7dMerBn3Cn8Y6K4VrhHp2wjqUf7wNaC5rsxiMZcyXY9SkZ65GLMoYNhV1_wDUfBHoXtzhcJWY_F1uIUPHGOVO9WCCbS2BTZN4Okb42lCmloCvPL91qlKbwR0anQNKtdtzjRe2I4_o94HnxiKpeCn7nMdozHkDzCtyDjHghsyuRmW4XEQ64FwjBvOumDxI57pEJ-mYmav3DDRya1gW3s8oUyP3WXQymdzYOVEd4eC9sIwteNpLmPDwk';
  }

  get firstName(): string {
    const fullName = this.currentUser?.name || 'Super Admin';
    return fullName.split(' ')[0] || 'Admin';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/index']);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.showSearchResults && 
        !this.searchInput.nativeElement.contains(event.target) &&
        !this.searchResultsContainer.nativeElement.contains(event.target)) {
      this.showSearchResults = false;
      this.isSearchFocused = false;
    }
  }
}
