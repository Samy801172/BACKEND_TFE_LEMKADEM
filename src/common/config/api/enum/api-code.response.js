"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiCodeResponse = void 0;
var ApiCodeResponse;
(function (ApiCodeResponse) {
    ApiCodeResponse["TEST"] = "api.result.test";
    ApiCodeResponse["NO_TOKEN_FOUNDED"] = "api.security.token-not-founded";
    ApiCodeResponse["USER_NOT_FOUND"] = "api.security.error.user-not-founded";
    ApiCodeResponse["TOKEN_EXPIRED"] = "api.security.error.token-expired";
    ApiCodeResponse["SIGNUP_ERROR"] = "api.credential.error.signup";
    ApiCodeResponse["CREDENTIAL_DELETE_ERROR"] = "api.credential.error.delete";
    ApiCodeResponse["USER_ALREADY_EXIST"] = "api.user.error.already-exist";
    ApiCodeResponse["TOKEN_GEN_ERROR"] = "api.token.error.gen";
    ApiCodeResponse["PAYLOAD_IS_NOT_VALID"] = "api.payload.error.is.not-valid";
    ApiCodeResponse["PAYLOAD_PARAM_IS_MISSING"] = "api.payload.error.param-is-missing";
    ApiCodeResponse["COMMON_SUCCESS"] = "api.common.success";
    ApiCodeResponse["ACCOUNT_SIGNUP_SUCCESS"] = "api.feature.security.success.signup";
    ApiCodeResponse["USERNAME_IS_NOT_EMPTY"] = "api.feature.security.error.signup.username-is-not-empty";
    ApiCodeResponse["USERNAME_MIN_LENGTH"] = "api.feature.security.error.signup.username-min-length";
    ApiCodeResponse["COMMON_ERROR"] = "COMMON_ERROR";
})(ApiCodeResponse || (exports.ApiCodeResponse = ApiCodeResponse = {}));
//# sourceMappingURL=api-code.response.js.map