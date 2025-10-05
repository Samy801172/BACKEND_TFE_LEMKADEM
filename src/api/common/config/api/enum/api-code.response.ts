

export enum ApiCodeResponse{
  TEST='api.result.test',
  NO_TOKEN_FOUNDED='api.security.token-not-founded',
  USER_NOT_FOUND='api.security.error.user-not-founded',
  TOKEN_EXPIRED='api.security.error.token-expired',
  SIGNUP_ERROR='api.credential.error.signup',
  CREDENTIAL_DELETE_ERROR='api.credential.error.delete',
  USER_ALREADY_EXIST='api.user.error.already-exist',
  TOKEN_GEN_ERROR='api.token.error.gen',
  PAYLOAD_IS_NOT_VALID = 'api.payload.error.is.not-valid',
  PAYLOAD_PARAM_IS_MISSING ='api.payload.error.param-is-missing',
  COMMON_SUCCESS = 'api.common.success',


  //SIGNUP PART
  ACCOUNT_SIGNUP_SUCCESS = 'api.feature.security.success.signup',
  USERNAME_IS_NOT_EMPTY = 'api.feature.security.error.signup.username-is-not-empty',
  USERNAME_MIN_LENGTH = 'api.feature.security.error.signup.username-min-length',
  COMMON_ERROR = "COMMON_ERROR",

}