import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatSession } from '../../services/history.service';

@Component({
  selector: 'app-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailsModalComponent {
  session = input.required<ChatSession>();
  close = output<void>();

  lastActivity = computed(() => {
    const session = this.session();
    if (!session.openLog || session.openLog.length === 0) {
      return session.createdAt;
    }
    const lastLog = session.openLog[session.openLog.length - 1];
    return lastLog.closedAt ?? session.updatedAt ?? lastLog.openedAt;
  });
}
