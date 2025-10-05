"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventParticipation = exports.PaymentStatus = exports.ParticipationStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../User/entities/user.entity");
const event_entity_1 = require("./event.entity");
var ParticipationStatus;
(function (ParticipationStatus) {
    ParticipationStatus["PENDING"] = "PENDING";
    ParticipationStatus["APPROVED"] = "APPROVED";
    ParticipationStatus["CONFIRMED"] = "CONFIRMED";
    ParticipationStatus["REJECTED"] = "REJECTED";
    ParticipationStatus["CANCELLED"] = "CANCELLED";
    ParticipationStatus["ADDED_TO_AGENDA"] = "ADDED_TO_AGENDA";
})(ParticipationStatus || (exports.ParticipationStatus = ParticipationStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["FREE"] = "FREE";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
let EventParticipation = class EventParticipation {
};
exports.EventParticipation = EventParticipation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], EventParticipation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => event_entity_1.Event, event => event.participations),
    (0, typeorm_1.JoinColumn)({ name: 'eventId' }),
    __metadata("design:type", event_entity_1.Event)
], EventParticipation.prototype, "event", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EventParticipation.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'participantId' }),
    __metadata("design:type", user_entity_1.User)
], EventParticipation.prototype, "participant", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EventParticipation.prototype, "participantId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ParticipationStatus,
        default: ParticipationStatus.PENDING
    }),
    __metadata("design:type", String)
], EventParticipation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], EventParticipation.prototype, "payment_intent_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING
    }),
    __metadata("design:type", String)
], EventParticipation.prototype, "payment_status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], EventParticipation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], EventParticipation.prototype, "added_to_agenda_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], EventParticipation.prototype, "last_payment_attempt_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], EventParticipation.prototype, "payment_attempts_count", void 0);
exports.EventParticipation = EventParticipation = __decorate([
    (0, typeorm_1.Entity)('event_participations')
], EventParticipation);
//# sourceMappingURL=event-participation.entity.js.map