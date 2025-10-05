"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.camelToSnake = exports.validationErrorToApiCodeResponse = exports.ValidationException = exports.ApiException = void 0;
const common_1 = require("@nestjs/common");
const enum_1 = require("../enum");
const lodash_1 = require("lodash");
class ApiException extends common_1.HttpException {
    constructor(code, status) {
        const apiResponse = {
            code: code,
            data: null,
            result: false
        };
        super(apiResponse, status);
    }
}
exports.ApiException = ApiException;
class ValidationException extends common_1.HttpException {
    constructor(errors) {
        const apiResponse = {
            code: enum_1.ApiCodeResponse.PAYLOAD_IS_NOT_VALID,
            data: errors.map((e) => (0, exports.validationErrorToApiCodeResponse)(e)).flat(),
            result: false
        };
        super(apiResponse, 499);
    }
}
exports.ValidationException = ValidationException;
const validationErrorToApiCodeResponse = (error) => {
    return Object.keys(error.constraints).map((k) => {
        const code = enum_1.ApiCodeResponse[`${(0, exports.camelToSnake)(error.property)}_${(0, exports.camelToSnake)(k)}`];
        return (0, lodash_1.isNil)(code) ? enum_1.ApiCodeResponse.PAYLOAD_PARAM_IS_MISSING : code;
    });
};
exports.validationErrorToApiCodeResponse = validationErrorToApiCodeResponse;
const camelToSnake = (str) => {
    return str.replace(/([A-Z])/g, " $1").split(' ').join('_').toUpperCase();
};
exports.camelToSnake = camelToSnake;
//# sourceMappingURL=api.exception.js.map