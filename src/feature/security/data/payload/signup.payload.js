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
exports.SignupPayload = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class SignupPayload {
}
exports.SignupPayload = SignupPayload;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(6),
    (0, swagger_1.ApiProperty)({ description: 'Username must be at least 6 characters long.' }),
    __metadata("design:type", String)
], SignupPayload.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, swagger_1.ApiProperty)({ description: 'Password field is required.' }),
    __metadata("design:type", String)
], SignupPayload.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, swagger_1.ApiProperty)({ description: 'Email field is required.' }),
    __metadata("design:type", String)
], SignupPayload.prototype, "mail", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, swagger_1.ApiProperty)({ description: 'Nom de famille de l\'utilisateur.' }),
    __metadata("design:type", String)
], SignupPayload.prototype, "nom", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, swagger_1.ApiProperty)({ description: 'Prénom de l\'utilisateur.' }),
    __metadata("design:type", String)
], SignupPayload.prototype, "prenom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)({ required: false, description: 'Google hash is optional.' }),
    __metadata("design:type", String)
], SignupPayload.prototype, "googleHash", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)({ required: false, description: 'Facebook hash is optional.' }),
    __metadata("design:type", String)
], SignupPayload.prototype, "facebookHash", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)({ required: false, description: "Nom de l'entreprise de l'utilisateur." }),
    __metadata("design:type", String)
], SignupPayload.prototype, "entreprise", void 0);
//# sourceMappingURL=signup.payload.js.map