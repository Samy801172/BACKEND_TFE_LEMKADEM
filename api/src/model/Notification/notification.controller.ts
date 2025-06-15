import { Controller, Post, Param } from '@nestjs/common';
import { NotificationService } from '../../common/services/notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Route pour marquer une notification comme lue (is_read = true)
   * Appelée en POST sur /notifications/:id/read
   */
  @Post(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }
} 