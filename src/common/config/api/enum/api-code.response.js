"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiCodeResponse = void 0;
var ApiCodeResponse;
(function (ApiCodeResponse) {
    ApiCodeResponse["TEST"] = "api.result.test";
    ApiCodeResponse["NO_TOKEN_FOUNDED"] = "api.security.error.token-founded";
    ApiCodeResponse["USER_NOT_FOUND"] = "api.security.error.token-founded";
    ApiCodeResponse["TOKEN_EXPIRED"] = "api.security.error.token-expired";
    ApiCodeResponse["SIGNUP_ERROR"] = "api.credential.error.signup";
    ApiCodeResponse["CREDENTIAL_DELETE_ERROR"] = "api.credential.error.delete";
    ApiCodeResponse["USER_ALREADY_EXIST"] = "api.user.error.already-exist";
    ApiCodeResponse["TOKEN_GEN_ERROR"] = "api.token.error.gen";
})(ApiCodeResponse || (exports.ApiCodeResponse = ApiCodeResponse = {}));
