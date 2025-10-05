"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawBodyRequest = void 0;
const common_1 = require("@nestjs/common");
exports.RawBodyRequest = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.rawBody;
});
//# sourceMappingURL=raw-body-request.decorator.js.map