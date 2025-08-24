import { Event } from '../entities/event.entity';
import { PaymentStatus, ParticipationStatus } from '../entities/event-participation.entity';

export class EventWithCalendarDto {
  id: string;
  title: string;
  description: string;
  location: string;
  date: Date;
  price: number;
  max_participants: number;
  type_event: string;
  image_url?: string;
  payment_status: PaymentStatus;
  status: string;
  calendar_link?: string;

  constructor(event: Event, participation: any) {
    this.id = event.id;
    this.title = event.title;
    this.description = event.description;
    this.location = event.location;
    this.date = event.date;
    this.price = event.price;
    this.max_participants = event.max_participants;
    this.type_event = event.type_event;
    this.image_url = event.image_url;
    this.payment_status = participation?.payment_status;
    this.status = participation?.status;
    
    // Générer le lien du calendrier seulement si le paiement est effectué
    if (participation?.payment_status === PaymentStatus.PAID) {
      this.calendar_link = this.generateCalendarLink(event);
    }
  }

  private generateCalendarLink(event: Event): string {
    const startDate = new Date(event.date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 heures par défaut
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      details: event.description,
      location: event.location,
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`
    });

    return `https://www.google.com/calendar/render?${params.toString()}`;
  }
} 