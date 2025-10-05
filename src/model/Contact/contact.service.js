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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const contact_entity_1 = require("./entities/contact.entity");
const user_entity_1 = require("../User/entities/user.entity");
const notification_service_1 = require("../../common/services/notification.service");
let ContactService = class ContactService {
    constructor(contactRepository, userRepository, notificationService) {
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }
    async sendContactRequest(ownerId, contactId) {
        if (ownerId === contactId) {
            throw new common_1.ConflictException('Vous ne pouvez pas vous ajouter vous-même');
        }
        const owner = await this.userRepository.findOne({ where: { id: ownerId } });
        const contact = await this.userRepository.findOne({ where: { id: contactId } });
        if (!owner || !contact) {
            throw new common_1.NotFoundException('Utilisateur non trouvé');
        }
        const existing = await this.contactRepository.findOne({
            where: [
                { owner: { id: ownerId }, contact: { id: contactId } },
                { owner: { id: contactId }, contact: { id: ownerId } }
            ]
        });
        if (existing) {
            throw new common_1.ConflictException('Une demande ou un contact existe déjà');
        }
        const newRequest = this.contactRepository.create({ owner, contact, status: contact_entity_1.ContactStatus.PENDING });
        const savedRequest = await this.contactRepository.save(newRequest);
        try {
            await this.notificationService.sendContactRequestNotification(contactId, `${owner.prenom} ${owner.nom}`, ownerId);
        }
        catch (error) {
            console.error('Erreur lors de l\'envoi de la notification:', error);
        }
        return savedRequest;
    }
    async acceptContactRequest(userId, requestId) {
        const request = await this.contactRepository.findOne({
            where: { id: requestId, contact: { id: userId }, status: contact_entity_1.ContactStatus.PENDING },
            relations: ['owner', 'contact']
        });
        if (!request)
            throw new common_1.NotFoundException('Demande non trouvée ou déjà traitée');
        request.status = contact_entity_1.ContactStatus.ACCEPTED;
        await this.contactRepository.save(request);
        const inverse = await this.contactRepository.findOne({
            where: { owner: { id: userId }, contact: { id: request.owner.id } }
        });
        if (!inverse) {
            const reciprocal = this.contactRepository.create({
                owner: request.contact,
                contact: request.owner,
                status: contact_entity_1.ContactStatus.ACCEPTED
            });
            await this.contactRepository.save(reciprocal);
        }
        return request;
    }
    async refuseContactRequest(userId, requestId) {
        const request = await this.contactRepository.findOne({
            where: { id: requestId, contact: { id: userId }, status: contact_entity_1.ContactStatus.PENDING },
            relations: ['owner', 'contact']
        });
        if (!request)
            throw new common_1.NotFoundException('Demande non trouvée ou déjà traitée');
        request.status = contact_entity_1.ContactStatus.REFUSED;
        return this.contactRepository.save(request);
    }
    async getContacts(ownerId) {
        return this.contactRepository.find({
            where: {
                owner: { id: ownerId },
                status: contact_entity_1.ContactStatus.ACCEPTED
            },
            relations: ['contact']
        });
    }
    async getPendingRequests(userId) {
        return this.contactRepository.find({
            where: {
                contact: { id: userId },
                status: contact_entity_1.ContactStatus.PENDING
            },
            relations: ['owner', 'contact']
        });
    }
    async deleteContact(userId, relationId) {
        await this.contactRepository.manager.transaction(async (manager) => {
            const repo = manager.getRepository(contact_entity_1.Contact);
            const relation = await repo.findOne({
                where: { id: relationId },
                relations: ['owner', 'contact']
            });
            if (!relation) {
                throw new common_1.NotFoundException('Relation de contact non trouvée');
            }
            if (relation.owner.id !== userId && relation.contact.id !== userId) {
                throw new common_1.ForbiddenException('Non autorisé à supprimer cette relation');
            }
            await repo.remove(relation);
            const inverse = await repo.findOne({
                where: {
                    owner: { id: relation.contact.id },
                    contact: { id: relation.owner.id }
                }
            });
            if (inverse)
                await repo.remove(inverse);
        });
        return { success: true, message: 'Contact supprimé avec succès' };
    }
};
exports.ContactService = ContactService;
exports.ContactService = ContactService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(contact_entity_1.Contact)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        notification_service_1.NotificationService])
], ContactService);
//# sourceMappingURL=contact.service.js.map