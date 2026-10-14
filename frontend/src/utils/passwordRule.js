// 비밀번호 길이 규칙이에요. 서버(SignupRequest·PasswordChangeRequest·PasswordResetRequest)가 8~20자로 검사해서,
// 가입·변경·재설정 화면이 모두 이 값을 같이 써요.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 20;
export const PASSWORD_RULE_TEXT = `${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자`;
