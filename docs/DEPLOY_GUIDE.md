# FlowSpace 배포·운영 가이드

FlowSpace(https://myflowspace.cloud)를 어떻게 배포하고 운영하는지 정리한 문서예요.
서버를 **처음부터 새로 만들 때**는 [SERVER_SETUP_GUIDE.md](SERVER_SETUP_GUIDE.md)를 보세요.

| 보고 싶은 것 | 장 |
| --- | --- |
| 전체 구조가 어떻게 생겼나 | [1. 전체 구조](#1-전체-구조) |
| 코드를 고쳐서 올리는 방법 | [2. 평소 작업 순서](#2-평소-작업-순서) |
| 사이트가 이상할 때 | [3. 장애 대응(런북)](#3-장애-대응런북) |
| 어떤 키·계정이 있고 어디서 관리하나 | [4. 계정과 키 목록](#4-계정과-키-목록) |
| 다른 컴퓨터에서 이어서 작업 | [5. 새 컴퓨터에서 이어가기](#5-새-컴퓨터에서-이어가기) |

---

## 1. 전체 구조

### 서비스 구조

```
사용자 브라우저
     │  https
     ▼
┌─────────────── AWS EC2 (Ubuntu, 시드니 리전) ───────────────┐
│  nginx (80/443, HTTPS 인증서: certbot)                      │
│    ├─ /            → /var/www/flowspace   (React 빌드 결과)  │
│    └─ /api, /ws, /uploads, /covers → Spring Boot (127.0.0.1:8080) │
│                                         │                   │
│  systemd 서비스 "flowspace" (Java 21)    ▼                   │
│    설정값: /etc/flowspace/flowspace.env  MySQL (flow_space)  │
│    업로드: /var/flowspace/uploads        백업: cron(매일 03시) │
└─────────────────────────────────────────────────────────────┘
```

- 프론트: React 19 + Vite. 빌드하면 정적 파일(`dist`)이 되고 nginx가 그대로 내려줘요.
- 백엔드: Spring Boot 4 / Java 21. 한 개의 jar로 `systemd`가 실행해요(`flowspace.jar`).
- DB: MySQL. 서버는 `ddl-auto: validate`라서 **표를 스스로 만들거나 고치지 않아요**(구조가 다르면 앱이 켜지지 않아요).
- 한 도메인으로 묶어서 CORS 문제가 없고, 인증서도 하나예요.

### 배포 흐름 (GitHub Actions: `.github/workflows/ci-cd.yml`)

```
내 PC ──push/PR──> GitHub
                     │  PR을 열면:   Backend(테스트·빌드) + Frontend(검사·빌드)  ← 배포는 안 해요
                     │  main에 병합: 위 둘이 통과하면 "서버에 배포" 실행
                     ▼
              GitHub 실행기(러너)
                1) AWS 보안 그룹 22번 포트를 러너 IP에만 잠깐 열기
                2) jar + dist.tgz + server-deploy.sh 를 서버로 전송(scp)
                3) 서버에서 server-deploy.sh 실행
                4) (성공/실패와 상관없이) 22번 포트 다시 닫기
```

`deploy/server-deploy.sh`가 서버에서 하는 일:

1. 현재 jar를 `flowspace.jar.prev`로 **백업**한 뒤 새 jar로 교체하고 `flowspace`를 재시작해요.
2. `/api/auth/me`가 **401 또는 200**이면 정상으로 봐요(최대 약 90초 기다려요).
3. 정상이 아니면 로그 마지막 40줄을 출력하고 **이전 jar로 자동 롤백**한 뒤, 배포를 실패로 끝내요(프론트는 교체하지 않아요).
4. 정상이면 프론트 파일을 `/var/www/flowspace`에 교체하고 끝내요.

### AI 기능 구조 (내 PC의 Ollama를 서버가 빌려 쓰는 방식)

```
브라우저 ─> 서버(Spring) ─> 서버의 127.0.0.1:11434 ═(SSH 리버스 터널)═> 내 PC의 Ollama(qwen3.6:27b)
```

- 서버에는 AI 모델이 없어요. 내 PC에서 `deploy\ai-tunnel.bat`을 실행해 두면 서버가 그 PC의 Ollama를 써요.
- 터널이 끊기거나 PC가 꺼지면 사이트의 AI 기능은 "현재 이용할 수 없어요"로 보여요(정상 동작이에요).
- 서버 환경변수 `FLOWSPACE_AI_ENABLED=true`(`/etc/flowspace/flowspace.env`)일 때만 AI 메뉴가 나타나요.

---

## 2. 평소 작업 순서

### 코드를 고쳐서 올리기

1. `main`에서 새 브랜치를 만들어요(예: `feat/기능이름`).
2. 코드를 고치고 커밋·push해요.
3. GitHub에서 **Pull Request**를 열어요. 자동으로 `Backend (테스트·빌드)`, `Frontend (검사·빌드)`가 돌아요.
4. 둘 다 초록색이면 **Merge**해요. (빨간색이면 병합하지 말고 `Details`에서 원인을 확인해요.)
5. 병합하면 `서버에 배포`가 자동으로 돌아요. 보통 몇 분 걸려요. 초록색이면 사이트에 반영된 거예요(브라우저는 `Ctrl+Shift+R`로 새로고침).

> `서버에 배포`가 건너뛰어짐(skipped)으로 보이는 건 PR에서는 정상이에요. 배포는 `main`에 들어간 뒤에만 돌아요.

### 다시 배포만 하고 싶을 때

GitHub 저장소 → **Actions** → `CI/CD` → **Run workflow**(main 선택)를 누르면 같은 코드를 다시 배포해요.

### DB 구조를 바꿀 때 (순서가 중요해요)

서버는 `ddl-auto: validate`라서 **코드보다 DB를 먼저** 바꿔야 해요.

1. 변경 직전에 DB를 백업해요(→ [3장 DB 복구](#db-백업과-복구)의 백업 명령).
2. 서버에서 `ALTER` 등을 먼저 실행해요(`USE flow_space;` 후).
3. 그다음 코드를 PR로 병합해요.
4. 실행한 SQL은 날짜와 함께 `docs/db-changes.md`에 적어 둬요(나중에 서버를 다시 만들 때 필요해요).
5. 새 컬럼은 `NULL` 허용이나 기본값을 주면, 배포가 롤백돼도 앱이 죽지 않아요.

### 알아 둘 점

- 프론트 코드 스타일 검사(`npm run lint`)는 **참고용**이에요. 실패해도 배포는 막지 않아요.
- 백엔드의 `contextLoads` 테스트는 DB가 필요해서 CI에서는 건너뛰어요(`CI=true`일 때). 나머지 테스트는 모두 돌아요.
- Windows에서 개발하고 리눅스에서 빌드하므로 **파일명 대소문자**가 클래스명과 같아야 해요(예: `SubTask.java` ↔ `class SubTask`).
- `main`에는 브랜치 보호 규칙(Settings → Rules)을 걸어 직접 push를 막고 PR로만 병합하게 하는 걸 권장해요. 필수 검사 이름은 Actions에 보이는 그대로(`Backend (테스트·빌드)`, `Frontend (검사·빌드)`)로 하고, `서버에 배포`는 필수 검사에 넣지 않아요(병합 뒤에만 돌아서 넣으면 병합이 영원히 막혀요).

---

## 3. 장애 대응(런북)

먼저 **어디서 문제인지**부터 나눠요. 아래 명령은 모두 **서버에 SSH 접속한 뒤**(프롬프트 `ubuntu@...$`) 입력해요. 접속법은 [4장 SSH](#ssh-접속)를 보세요.

| 증상 | 가장 먼저 볼 것 |
| --- | --- |
| 사이트가 아예 안 열림 | `sudo systemctl status nginx`, 서버(EC2)가 켜져 있는지 AWS 콘솔 |
| `502 Bad Gateway` | 백엔드가 꺼짐 → `sudo systemctl status flowspace`, `journalctl -u flowspace -n 100` |
| 로그인·저장이 안 됨 | 백엔드 로그에서 `ERROR`, DB 연결(`Access denied`) |
| 배포 후 이상함 | 아래 "수동 롤백" |
| AI 메뉴가 안 보이거나 "이용 불가" | 아래 "AI가 안 될 때" |
| 디스크 가득(`No space left`) | `df -h`, 오래된 백업·로그 삭제 |

### 로그와 상태 보기

```bash
sudo systemctl status flowspace            # active (running)이면 정상, failed면 실패(나가기: q)
journalctl -u flowspace -n 100             # 백엔드 로그 마지막 100줄
journalctl -u flowspace -f                 # 실시간 로그(Ctrl+C로 종료)
journalctl -u flowspace --since "10 min ago"
sudo tail -n 50 /var/log/nginx/error.log   # nginx 오류 로그
df -h                                      # 디스크(Use%가 90% 넘으면 위험)
free -h                                    # 메모리
curl -I http://127.0.0.1:8080/api/auth/me  # 401이 오면 백엔드는 살아 있는 거예요
```

원인은 보통 로그의 `ERROR`, `Caused by:`, `Exception` 근처에 있어요. 도움을 요청할 때는 해당 부분만 복사하고, 비밀번호가 보이면 가려 주세요.

### 서비스 재시작

```bash
sudo systemctl restart flowspace           # 백엔드 재시작(설정·환경변수를 바꾼 뒤에도 필요)
sudo nginx -t && sudo systemctl reload nginx   # nginx 설정 검사 후 다시 읽기
```

환경변수(`/etc/flowspace/flowspace.env`)를 고쳤다면 반드시 `restart` 해야 반영돼요. 서비스가 켜지자마자 꺼지면 환경변수 누락·오타가 가장 흔한 원인이에요(`journalctl`의 마지막 오류를 확인).

### 수동 롤백 (배포는 성공했는데 사용 중 문제가 발견됐을 때)

가장 안전한 방법은 **GitHub에서 문제가 된 PR을 Revert**하는 거예요(PR 화면의 `Revert` 버튼 → 새 PR 병합 → 자동 배포). 프론트까지 함께 되돌아가요.

급하게 **백엔드만** 되돌려야 하면 서버에서:

```bash
ls -l /opt/flowspace/                      # flowspace.jar 와 flowspace.jar.prev 가 있는지 확인
sudo install -o flowspace -g flowspace -m 644 /opt/flowspace/flowspace.jar.prev /opt/flowspace/flowspace.jar
sudo systemctl restart flowspace
sudo systemctl status flowspace
```

- `flowspace.jar.prev`는 **직전 배포 이전 버전** 하나뿐이에요. 배포가 자동 롤백됐다면 `.prev`와 현재 jar가 같은 파일이에요.
- 프론트는 서버에 백업이 없어요. Revert 후 재배포하거나, GitHub Actions의 `frontend-dist` 보관 파일(7일)을 받아 쓸 수 있어요.
- DB를 바꾼 배포였다면 jar만 되돌리면 안 돼요. DB 구조가 맞는지 확인하세요(새 컬럼이 `NULL` 허용이면 대개 괜찮아요).

### 배포 자체가 실패했을 때

1. GitHub → Actions → 실패한 실행 → `서버에 배포`의 빨간 단계 로그를 봐요.
2. 단계별 원인:
   - `SSH 임시 열기` 실패: AWS 권한 문제(`UnauthorizedOperation`). IAM 정책의 리소스(계정 ID·보안 그룹 ID)와 Secrets를 확인해요.
   - `업로드와 배포`에서 `새 버전이 켜지지 않았어요`: 로그에 백엔드 오류가 같이 출력돼요. 자동으로 이전 버전이 복구돼 있어요.
3. 배포 중간에 실패해도 `SSH 닫기`가 실행돼요. 그래도 AWS 콘솔 → 보안 그룹 인바운드 규칙에 설명이 `github-actions-deploy`인 22번 규칙이 남아 있으면 **지워 주세요**.

### AI가 안 될 때

1. 내 PC에서 Ollama가 켜져 있는지, `deploy\ai-tunnel.bat` 창이 열려 있는지 확인해요(창을 닫으면 끊겨요).
2. 서버에서 `curl -s http://127.0.0.1:11434/api/tags` 를 실행해 모델 목록이 나오는지 봐요. 안 나오면 터널이 끊긴 거예요.
3. 터널이 계속 접속에 실패하면, 보안 그룹의 22번 포트에 **현재 내 IP**가 허용돼 있는지 확인해요(장소·네트워크가 바뀌면 IP도 바뀌어요).
4. `FLOWSPACE_AI_ENABLED=true`가 `/etc/flowspace/flowspace.env`에 있는지 확인하고, 바꿨다면 `sudo systemctl restart flowspace`.

### DB 백업과 복구

백업은 서버 cron이 매일 새벽 3시에 `/var/backups/flowspace/`에 만들어요(DB: `db-날짜.sql.gz`, 업로드: `uploads-날짜.tgz`). 실제 설정은 `sudo crontab -l` 로 확인해요. **이 폴더는 서버 안**이라, 서버가 사라지면 같이 사라져요. 가끔 내 PC나 다른 저장소로 복사해 두세요.

```bash
# 지금 즉시 백업(DB 구조를 바꾸기 전에도 이렇게 해요)
sudo mysqldump --single-transaction flow_space | gzip > ~/db-$(date +%F-%H%M).sql.gz
```

**DB 복구** (잘못된 데이터 삭제·변경이 있었을 때):

```bash
ls -lh /var/backups/flowspace/                          # 복구할 날짜 파일 확인
sudo systemctl stop flowspace                           # 백엔드 중지
sudo mysqldump --single-transaction flow_space | gzip > ~/before-restore.sql.gz    # 복구 전 현재 상태도 보관
gunzip -c /var/backups/flowspace/db-2026-10-15.sql.gz | sudo mysql flow_space  # ← 날짜를 실제 파일명으로
sudo systemctl start flowspace
```

복구하면 그 백업 시각 이후의 데이터는 사라져요. 복구 후에는 사이트에서 로그인과 데이터가 정상인지 확인하세요.

**업로드 파일 복구:**

```bash
sudo tar xzf /var/backups/flowspace/uploads-2026-10-15.tgz -C /var/flowspace
sudo chown -R flowspace:flowspace /var/flowspace
```

> 복구는 한 번 연습해 보지 않으면 급할 때 못 해요. 가끔 `~/before-restore.sql.gz` 같은 임시 파일로 내용이 열리는지(`gunzip -c 파일 | head`)만이라도 확인해 두세요.

---

## 4. 계정과 키 목록

**값은 이 문서에 적지 않아요.** 아래는 "무엇이 있고, 어디에 있고, 언제 만료되나"만 정리한 거예요. 값을 채팅·메일·이슈에 붙여 넣지 마세요.

### GitHub Secrets (저장소 → Settings → Secrets and variables → Actions)

| 이름 | 용도 | 어디서 발급·확인 | 만료·주의 |
| --- | --- | --- | --- |
| `EC2_HOST` | 서버 주소(고정 IP) | AWS EC2 → Elastic IP | 서버를 새로 만들면 바뀜 |
| `AWS_SG_ID` | 서버의 보안 그룹 ID(`flowspace-sq`) | AWS EC2 → 보안 그룹 | 보안 그룹을 새로 만들면 바뀜 |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | 배포 때 SSH 포트를 열고 닫는 AWS 키 | AWS IAM → 사용자 `flowspace-github-actions` → 보안 자격 증명 | 만료 없음. 유출 의심 시 **키 비활성화 후 재발급** |
| `EC2_SSH_KEY` | 서버 접속용 개인키(배포 전용 ed25519) | PC의 `C:\Users\USER1\.ssh\flowspace-deploy` | 첫 줄 `-----BEGIN OPENSSH PRIVATE KEY-----`부터 끝 줄까지 전체를 넣어요 |

### AWS

- **IAM 사용자 `flowspace-github-actions`**: 정책 `flowspace-gha-sg-access` 하나만 가져요. 허용 범위는 **이 보안 그룹 한 개에 대한 22번 규칙 추가/삭제**뿐이에요(최소 권한). 정책의 리소스 ARN에는 **서버가 있는 계정**의 ID가 들어가야 해요(조직의 관리 계정 ID와 다를 수 있어요).
- **보안 그룹**: 80·443은 공개, 3306·8080은 닫음, 22는 평소에 **내 IP만** 허용해요. 배포 중에만 GitHub 러너 IP가 임시로 열리고 닫혀요.
- 리전: 시드니(`ap-southeast-2`).

### SSH 접속

- **배포 전용 키** `flowspace-deploy`: 공개키는 서버 `~/.ssh/authorized_keys`에, 개인키는 PC와 GitHub Secret에 있어요.
- **처음 서버 만들 때 받은 키** `flowspace-key.pem`: 비상용이에요. 안전한 곳에 보관하세요.
- 서버에 직접 접속(내 PC PowerShell):
  ```
  ssh -i "$env:USERPROFILE\.ssh\flowspace-deploy" ubuntu@<서버IP>
  ```
  접속이 멈추면(`timed out`) 대부분 보안 그룹 22번에 **현재 내 IP가 없는 것**이에요.

### 서버 안의 비밀 파일 (git에 없음)

| 위치 | 내용 |
| --- | --- |
| `/etc/flowspace/flowspace.env` (권한 600, 소유자 root) | DB 비밀번호, JWT 키, 소셜 로그인 ID, Gmail 앱 비밀번호, 프론트 주소, AI 켜기 값 |
| MySQL 계정 `flowspace` | 앱 전용 DB 계정(SELECT/INSERT/UPDATE/DELETE만) |

### 외부 서비스·만료일

| 항목 | 만료·갱신 |
| --- | --- |
| GitHub 개인 액세스 토큰(PAT, `repo`+`workflow`) | **90일마다 만료** → 만료 전에 새로 만들어 SourceTree/Git에 다시 저장 |
| HTTPS 인증서(certbot) | 자동 갱신(약 90일 주기). 확인: 서버에서 `sudo certbot renew --dry-run` |
| 도메인(`myflowspace.cloud`) | 도메인 업체에서 연간 갱신일 확인 |
| Google / Microsoft 로그인 | 각 콘솔에 운영 주소가 등록돼 있어야 해요(Google은 앱 "게시" 상태 확인) |
| Gmail 앱 비밀번호 | Google 계정의 2단계 인증이 켜져 있어야 유효. 하루 발송 한도 약 500통 |

> 키가 유출됐다고 의심되면: 해당 키를 **즉시 폐기하고 새로 발급**해서 Secrets/서버 파일에 교체하고, 서버를 재시작하세요.

---

## 5. 새 컴퓨터에서 이어가기

GitHub에 올라간 코드만 옮겨져요. "push 확인 → clone → git에 없는 파일만 따로 옮기기" 순서예요.

### 1) 지금 쓰던 컴퓨터에서 (떠나기 전)

1. 프로젝트 폴더에서 `git status`를 실행해요.
2. `Changes not staged`나 `Untracked files`가 있으면 커밋하고 push해요(아직 PR 전이면 브랜치만 push해도 돼요).
3. GitHub 저장소 페이지에서 그 브랜치가 보이는지 확인해요.

### 2) git에 없어서 따로 챙길 것

- **서버 접속 키** `flowspace-deploy`: 서버 직접 접속·AI 터널에만 필요해요(자동 배포는 GitHub Secrets를 써서 필요 없어요). **USB로만** 옮기고, 공용(학교) 컴퓨터에서는 쓴 뒤 지워요. 키를 못 옮기면 새로 만들어 서버 `authorized_keys`에 추가해도 돼요.
- **로컬 설정·비밀 파일**: `.gitignore`에 들어 있는 `application-secret.yaml`, `.env` 등. `git status --ignored`로 목록을 볼 수 있어요.
- **로컬 DB 데이터**: 필요하면 `mysqldump`로 파일을 만들어 옮겨요.
- **Ollama 모델**: AI 기능을 이 컴퓨터에서 쓰려면 모델(`qwen3.6:27b`)이 있어야 해요. 용량이 커서 새로 받으면 오래 걸리고 PC 사양도 필요해요.

### 3) 새 컴퓨터에서

1. **설치**: Git, JDK 21, Node.js(LTS), MySQL(개발용), SourceTree 또는 VS Code.
2. **코드 받기**: `git clone https://github.com/SangWook1199/Flowspace.git` (로그인 창이 뜨면 PAT 사용 — 권한 `repo`+`workflow`).
3. **브랜치 이동**: `git fetch` 후 `git switch 브랜치이름`.
4. **비밀 파일 넣기**: 2)에서 챙긴 파일을 같은 위치에 둬요.
5. **실행 확인**:
   - 백엔드: `cd backend` → `.\gradlew.bat test` (통과 확인) → 개발 서버 실행
   - 프론트: `cd frontend` → `npm install` → `npm run dev`

### 4) 서버·AI를 이 컴퓨터에서 쓸 때

- 보안 그룹 22번에 **이 컴퓨터의 현재 IP**를 추가해요(AWS 콘솔 → EC2 → 보안 그룹 → 인바운드 규칙 편집 → SSH, 소스 `내 IP`). 작업이 끝나면 임시 IP는 지워요.
- 코드 배포는 어느 컴퓨터에서든 **push → PR → 병합**이면 자동이에요(서버 접속 불필요).
- AI는 Ollama와 모델이 있는 컴퓨터에서 `deploy\ai-tunnel.bat`을 켜야 해요.
- 공용 컴퓨터를 떠날 때: SourceTree에 저장된 GitHub 로그인, `.ssh` 폴더의 키, 저장된 비밀번호를 지워요.
