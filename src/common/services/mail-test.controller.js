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
exports.MailTestController = void 0;
const common_1 = require("@nestjs/common");
const mail_service_1 = require("./mail.service");
const swagger_1 = require("@nestjs/swagger");
let MailTestController = class MailTestController {
    constructor(mailService) {
        this.mailService = mailService;
    }
    async getEmailPreviews(res) {
        return res.json(this.mailService.getSentEmails());
    }
    async sendTestEmail(data) {
        try {
            const result = await this.mailService.sendMail(data.to, data.subject, data.message, `<h1>${data.subject}</h1><p>${data.message}</p>`);
            return { success: true, messageId: result.messageId, previewUrl: result.previewUrl };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async getMailtrapUrls() {
        const inboxId = process.env.MAILTRAP_INBOX_ID || 'default';
        return [
            `https://mailtrap.io/inboxes/${inboxId}/messages`,
            `https://mailtrap.io/inboxes/${inboxId}/settings`
        ];
    }
    async testMailConfig() {
        try {
            const isProduction = process.env.NODE_ENV === 'production';
            const mailtrapUser = process.env.MAILTRAP_USER || 'e3a08b3d942033';
            const mailtrapPass = process.env.MAILTRAP_PASS || '65677b6900c8ad';
            return {
                success: true,
                config: {
                    environment: process.env.NODE_ENV || 'development',
                    isProduction,
                    mailtrap: {
                        user: mailtrapUser,
                        pass: mailtrapPass ? '***' : 'NOT_SET',
                        host: 'sandbox.smtp.mailtrap.io',
                        port: 587
                    },
                    sendgrid: {
                        apiKey: process.env.SENDGRID_API_KEY ? 'SET' : 'NOT_SET',
                        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'NOT_SET'
                    }
                },
                message: isProduction ? 'Configuration SendGrid' : 'Configuration Mailtrap'
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
};
exports.MailTestController = MailTestController;
__decorate([
    (0, common_1.Get)('preview'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupère la liste des emails Mailtrap (tableau pur)' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MailTestController.prototype, "getEmailPreviews", null);
__decorate([
    (0, common_1.Post)('send-test'),
    (0, swagger_1.ApiOperation)({ summary: 'Envoie un email de test' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MailTestController.prototype, "sendTestEmail", null);
__decorate([
    (0, common_1.Get)('mailtrap-urls'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupère les URLs Mailtrap récentes' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MailTestController.prototype, "getMailtrapUrls", null);
__decorate([
    (0, common_1.Get)('test-config'),
    (0, swagger_1.ApiOperation)({ summary: 'Teste la configuration Mailtrap' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MailTestController.prototype, "testMailConfig", null);
exports.MailTestController = MailTestController = __decorate([
    (0, swagger_1.ApiTags)('mail-test'),
    (0, common_1.Controller)('mail-test'),
    __metadata("design:paramtypes", [mail_service_1.MailService])
], MailTestController);
//# sourceMappingURL=mail-test.controller.js.map