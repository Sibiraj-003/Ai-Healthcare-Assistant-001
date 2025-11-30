import { Component, ChangeDetectionStrategy, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSession } from '../../services/history.service';

@Component({
  selector: 'app-rename-chat-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rename-chat-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenameChatModalComponent implements OnInit {
  session = input.required<ChatSession>();
  close = output<void>();
  save = output<string>();

  newTitle = '';

  ngOnInit(): void {
    this.newTitle = this.session().title;
  }

  saveTitle(event: Event): void {
    event.preventDefault();
    const trimmedTitle = this.newTitle.trim();
    if (trimmedTitle && trimmedTitle !== this.session().title) {
      this.save.emit(trimmedTitle);
    }
    this.close.emit();
  }
}
