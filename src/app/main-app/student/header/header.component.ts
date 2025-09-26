import { Component, OnInit } from '@angular/core';
import {
  Router,
  ActivatedRoute,
  NavigationEnd,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

import { filter } from 'rxjs/operators';

import {
  BrnPopover,
  BrnPopoverContent,
  BrnPopoverTrigger,
} from '@spartan-ng/brain/popover';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmPopoverContent } from '@spartan-ng/helm/popover';
import {
  StoredStudent,
  StoredTeacher,
} from '../../../layout/connections/data-store.service';
import { AuthService } from '../../../auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    HlmPopoverContent,
    RouterLink,
    RouterLinkActive,
    BrnPopover,
    BrnPopoverContent,
    BrnPopoverTrigger,
    HlmButton,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  pageTitle = 'QuizMaster';

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // ✅ run once immediately
    this.updateTitle(this.activatedRoute);

    // ✅ run again on every navigation
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateTitle(this.activatedRoute);
      });
  }

  private updateTitle(route: ActivatedRoute) {
    let child = route;

    // ✅ go down to the deepest child route (works with layouts)
    while (child.firstChild) {
      child = child.firstChild;
    }

    const fullTitle = child.snapshot.data['title'];

    if (fullTitle) {
      // ✅ split BEFORE the dash and take only the first part
      this.pageTitle = fullTitle.split('-')[0].trim();
    } else {
      this.pageTitle = 'QuizMaster';
    }
  }
  get currentUser() {
    return this.authService.getCurrentUser(); // returns StoredStudent | StoredTeacher | null
  }
  getAvatar(user: StoredStudent | StoredTeacher | null): string {
    if (!user) {
      return 'https://example.com/default-avatar.png'; // fallback for null
    }

    return user.gender.toLowerCase() === 'female'
      ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCU_TnWvtxOoxM0E9Mg7qATAlVWg43mdNFLH7bJHGmUxqB62S1rQfrQ7lLotVa3xci96IRgQtupA4ckNRw6iipWPlDqf5ykHpSD_OpWL_egph0TgFmYewVwdVnfbz42BvrBmENuVIHlMzmZ93ZlZDSBoqX8lptmFo8l5m4TSN8V_p-X2a33Ig1amIXbf91Pf_Z_bf5ucawz3QorQdHJP9zDYvVQBQ0eYv6jIvmeRN8WUFlcuZTsg-jCfr2XUdFoLleY-VLLcEzvs60'
      : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCO8yQbbNIqBInP9byXDRaNd7dMerBn3Cn8Y6K4VrhHp2wjqUf7wNaC5rsxiMZcyXY9SkZ65GLMoYNhV1_wDUfBHoXtzhcJWY_F1uIUPHGOVO9WCCbS2BTZN4Okb42lCmloCvPL91qlKbwR0anQNKtdtzjRe2I4_o94HnxiKpeCn7nMdozHkDzCtyDjHghsyuRmW4XEQ64FwjBvOumDxI57pEJ-mYmav3DDRya1gW3s8oUyP3WXQymdzYOVEd4eC9sIwteNpLmPDwk';
  }
  logout() {
    this.authService.logout();
    this.router.navigate(['/index']);
  }
  get firstName(): string {
    const fullName = this.currentUser?.name || '';
    return fullName.split(' ')[0] || 'Admin';
  }
}
