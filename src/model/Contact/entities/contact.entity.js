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
exports.Contact = exports.ContactStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../User/entities/user.entity");
var ContactStatus;
(function (ContactStatus) {
    ContactStatus["PENDING"] = "pending";
    ContactStatus["ACCEPTED"] = "accepted";
    ContactStatus["REFUSED"] = "refused";
})(ContactStatus || (exports.ContactStatus = ContactStatus = {}));
let Contact = class Contact {
};
exports.Contact = Contact;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Contact.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.contacts, { eager: true }),
    __metadata("design:type", user_entity_1.User)
], Contact.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: true }),
    __metadata("design:type", user_entity_1.User)
], Contact.prototype, "contact", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ContactStatus, default: ContactStatus.PENDING }),
    __metadata("design:type", String)
], Contact.prototype, "status", void 0);
exports.Contact = Contact = __decorate([
    (0, typeorm_1.Entity)('contacts'),
    (0, typeorm_1.Unique)(['owner', 'contact'])
], Contact);
//# sourceMappingURL=contact.entity.js.map