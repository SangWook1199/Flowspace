# FlowSpace 개발 규칙

## 백엔드

- Service에 주석 필수
- Controller는 @Operation(summary="")
- DTO는 // @formatter:off
- OAuth Service 분리 금지 → AuthService 내부 private 메서드
- Repository/DTO 패턴 유지

## 프론트

- Axios 공통 인스턴스 + api 모듈
- React Context 사용
- 컴포넌트는 JSX, api/util은 JS
- 기존 디자인 변경 금지

## UX

- 회원가입 2단계
- 가입 즉시 로그인
- 개인 워크스페이스 자동 생성
- 프로필 없으면 이니셜 표시
