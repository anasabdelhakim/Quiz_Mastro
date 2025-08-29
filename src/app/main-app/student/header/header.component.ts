import { Component } from '@angular/core';
import { RouterLinkActive, RouterLink } from '@angular/router';
import {
  BrnPopover,
  BrnPopoverContent,
  BrnPopoverTrigger,
} from '@spartan-ng/brain/popover';
import { HlmButton } from '@spartan-ng/helm/button';
import {  HlmPopoverContent } from '@spartan-ng/helm/popover';
@Component({
  selector: 'app-header',
  imports: [

    HlmPopoverContent,
    RouterLink,
    RouterLinkActive,

    BrnPopover,
    BrnPopoverContent,
    BrnPopoverTrigger,
    HlmButton,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {}
