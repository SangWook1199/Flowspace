# FlowSpace 서버 처음 구축 가이드

> 서버를 **처음부터 새로 만들 때** 보는 문서예요. 평소 배포·장애 대응·키 관리는 [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)를 보세요.
> (아래 내용 중 "서버로 jar·dist 직접 옮기기"는 지금은 GitHub Actions가 대신 해요.)

이 문서는 "리눅스 서버 1대(Ubuntu) + MySQL + nginx + HTTPS" 한 도메인으로 올리는 가장 흔한 방법 기준이에요.
(예시 도메인: `flowspace.example.com` — 본인 도메인으로 바꿔 읽으세요.)

구조는 이렇게 가요.

```
브라우저 ──https──> nginx ─┬─ /            → 프런트 빌드 결과(dist, 정적 파일)
                           ├─ /api/        → 백엔드(8080)
                           ├─ /ws          → 백엔드(8080, WebSocket)
                           ├─ /uploads/    → 백엔드(8080, 업로드 파일)
                           └─ /covers/     → 백엔드(8080, 기본 커버)
```

한 도메인으로 묶으면 CORS 문제가 없고 HTTPS 인증서도 하나만 있으면 돼요.

---

## 0. 서버에 올리기 전, 내 PC에서 먼저 확인 (필수)

1. 백엔드 테스트: 프로젝트의 `backend` 폴더에서 PowerShell로
   ```
   .\gradlew.bat test
   ```
   `BUILD SUCCESSFUL`이 나와야 해요. 실패하면 배포하지 말고 실패 내용을 알려 주세요.
2. 프런트: `frontend` 폴더에서 `npm run lint`, `npm run build` 둘 다 오류 없이 끝나야 해요.
3. 운영 모드로 한 번 켜 보기(권장): 백엔드를 jar로 만들어서 실행해 봐요.
   ```
   .\gradlew.bat bootJar
   java -jar build\libs\backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=secret,prod --app.frontend-url=http://localhost:5173 --cors.allowed-origins=http://localhost:5173
   ```
   - 켜지고, 로그인이 되고, 페이지의 **커버 갤러리**가 보이면 성공이에요(jar에서 이 목록이 실패하던 문제를 고쳤어요).
   - `http://localhost:8080/swagger-ui/index.html` 이 **열리지 않아야** 해요(운영 모드에서는 닫혀요).
4. 비밀 파일이 git에 올라간 적 없는지 확인: 프로젝트 폴더에서
   ```
   git log --all --oneline -- backend/src/main/resources/application-secret.yaml
   ```
   아무것도 안 나와야 해요. 뭔가 나온다면 그 안의 비밀번호·키는 전부 유출된 것으로 보고 **새로 발급**해야 해요(Google 클라이언트 보안 비밀, Gmail 앱 비밀번호, JWT 비밀키).

---

## 1. 미리 정해둘 것

| 항목 | 설명 |
| --- | --- |
| 도메인 | 서버 IP를 가리키는 A 레코드를 만들어 두세요(도메인 업체 사이트에서). 반영까지 몇 분~몇 시간 걸려요. |
| 서버 | Ubuntu 22.04/24.04 권장. 메모리 2GB 이상(백엔드 + MySQL). 방화벽에서 22, 80, 443 포트만 열어요. **3306(MySQL), 8080(백엔드)은 밖에서 접속 못 하게** 닫아 두세요. |
| AI 기능 | 서버에 Ollama가 없으면 꺼 두세요(기본값이 꺼짐이에요). 켜려면 환경 변수 `FLOWSPACE_AI_ENABLED=true`. |

---

## 1-2. Ubuntu 기초 (처음이면 2번 전에 꼭 읽으세요)

배포 서버는 **Ubuntu**라는 리눅스예요. Windows와 다르게 **마우스·바탕화면이 없고, 글자로 명령을 입력**해서 써요. 처음엔 낯설지만 이 장에 나오는 20여 개 명령만 알면 이 프로젝트 배포는 충분해요.

### A. Ubuntu가 뭐고 왜 쓰나

- 리눅스의 한 종류이고 무료예요. 서버용 OS로 가장 많이 쓰여서 막혔을 때 검색하면 답이 잘 나와요.
- 버전 이름은 `24.04 LTS`처럼 생겼어요. **LTS**는 5년간 보안 업데이트를 해주는 안정 버전이라는 뜻이에요. 서버를 만들 때는 항상 LTS를 고르세요.
- 서버는 화면이 없어서 **내 PC에서 인터넷으로 접속해 글자 명령을 입력**해요. 이 접속 방법이 `ssh`예요.
- 내 PC(Windows)에는 Ubuntu를 설치하지 않아요. Ubuntu는 AWS 같은 **서버 컴퓨터 안**에 있어요.

### B. 서버에 접속하기 (SSH)

Windows 10/11에는 SSH가 이미 들어 있어요. **PowerShell**을 열고 입력해요.

```
ssh -i C:\경로\내키.pem ubuntu@서버공인IP
```

- AWS에서 서버를 만들 때 받은 `.pem` 파일이 "열쇠"예요. **절대 남에게 주거나 git에 올리지 마세요.**
- 사용자 이름: AWS의 Ubuntu 이미지는 `ubuntu`예요. (이 가이드의 `사용자@서버IP`는 모두 `ubuntu@서버IP`로 읽으세요.)
- 처음 접속하면 `Are you sure you want to continue connecting (yes/no)?` 라고 물어요. `yes`를 치고 Enter.
- `.pem` 파일 권한 오류(`UNPROTECTED PRIVATE KEY FILE`)가 나오면 PowerShell에서 한 번만 실행해요.
  ```
  icacls C:\경로\내키.pem /inheritance:r
  icacls C:\경로\내키.pem /grant:r "$($env:USERNAME):(R)"
  ```
- 접속이 되면 이런 글자가 보여요. 이게 "명령을 입력할 준비가 됐다"는 표시(프롬프트)예요.
  ```
  ubuntu@ip-172-31-5-20:~$
  ```
  `ubuntu`(내 이름) @ `ip-172-...`(서버 이름) : `~`(지금 있는 폴더, ~는 내 홈 폴더) `$`(일반 사용자라는 뜻)
- 접속을 끊을 때는 `exit` 입력.
- 접속이 안 되고 멈추면(timeout) 대부분 AWS **보안 그룹**에서 22번 포트가 안 열린 거예요.

> **이 가이드의 "(내 PC)"로 표시된 명령은 내 PowerShell에서, "서버에서"라고 표시된 명령은 SSH로 접속한 창에서 입력하세요.** 둘을 헷갈리는 게 초보자의 가장 흔한 실수예요. 프롬프트가 `PS C:\...>` 이면 내 PC, `ubuntu@...$` 이면 서버예요.

### C. 터미널 기본 사용법

- 명령 입력 후 **Enter**를 눌러야 실행돼요.
- **붙여넣기**: 마우스 오른쪽 클릭(PowerShell) 또는 Ctrl+V(Windows Terminal). 가이드의 명령은 한 줄씩 복사해서 붙여 넣으세요.
- **위 방향키(↑)**: 직전에 친 명령이 나와요. 반복할 때 편해요.
- **Tab 키**: 파일/폴더 이름을 자동완성해요. 긴 이름은 앞 몇 글자만 치고 Tab.
- **Ctrl+C**: 실행 중인 명령을 중단해요. (`journalctl -f`처럼 계속 돌아가는 명령에서 빠져나올 때)
- `clear`: 화면 정리.
- 대소문자를 구분해요. `Flowspace`와 `flowspace`는 다른 이름이에요.
- 명령 뒤에 오는 `-i`, `-r` 같은 글자는 "옵션"이에요. 명령의 동작을 조금 바꿔요.

### D. 폴더·파일 다루기

리눅스의 폴더 구조는 `/`(뿌리)에서 시작해요. 윈도우의 `C:\Users\...`는 `/home/ubuntu/...` 처럼 생겼어요.

| 명령 | 뜻 | 예 |
| --- | --- | --- |
| `pwd` | 지금 내가 있는 폴더 보기 | `/home/ubuntu` |
| `ls` | 폴더 안 목록 | `ls -l` (자세히: 크기·소유자·권한), `ls -a` (숨김 파일 포함) |
| `cd 폴더` | 폴더로 이동 | `cd /opt/flowspace`, `cd ..` (상위), `cd ~` (홈), `cd -` (직전 폴더) |
| `mkdir 폴더` | 폴더 만들기 | `mkdir -p /var/flowspace/uploads` (`-p`: 중간 폴더도 같이) |
| `cp 원본 대상` | 복사 | `cp a.txt b.txt`, 폴더는 `cp -r` |
| `mv 원본 대상` | 이동 / 이름 변경 | `mv a.txt b.txt` |
| `rm 파일` | 삭제 (**휴지통 없음, 복구 불가**) | `rm a.txt`, 폴더는 `rm -r 폴더` |
| `cat 파일` | 파일 내용 출력 | `cat /etc/flowspace/flowspace.env` |
| `less 파일` | 긴 파일을 한 화면씩 보기 | `q`로 나가기, `/단어` 검색 |
| `tail -n 100 파일` | 파일 끝 100줄 | `tail -f 파일` (새 줄이 생기는 대로 계속 출력, Ctrl+C로 종료) |

**경로 읽는 법**
- `/`로 시작하면 절대 경로(어디서 입력해도 같은 곳): `/var/www/flowspace`
- `/`로 시작하지 않으면 지금 위치 기준 상대 경로: `dist/index.html`
- `~`는 내 홈 폴더(`/home/ubuntu`)예요. 가이드의 `~/flowspace.jar`는 "홈 폴더의 flowspace.jar"예요.

**`rm`을 쓸 때 안전 수칙**
- 지우기 전에 `ls`로 내가 지울 것이 맞는지 먼저 확인하세요.
- `rm -rf /` 나 `rm -rf *`처럼 경로를 넓게 쓰는 명령은 **절대 입력하지 마세요**(서버가 통째로 지워져요).
- 가이드에서 `sudo rm -rf /var/www/flowspace/*` 는 "그 폴더 안의 파일만" 지우는 명령이라 괜찮지만, **경로를 오타 내면 위험**하니 한 글자씩 확인하고 입력하세요.

### E. 파일 편집 (nano)

가이드에서 설정 파일을 만들 때 `sudo nano 파일경로`를 써요. nano는 서버용 간단한 메모장이에요.

1. `sudo nano /etc/flowspace/flowspace.env` → 편집 화면이 열려요(파일이 없으면 새로 만들어요).
2. 내용을 **붙여넣기**해요. 마우스 클릭으로 커서를 옮길 수는 없고 **방향키**로 움직여요.
3. 저장: `Ctrl+O` → 아래에 파일명이 나오면 `Enter`.
4. 종료: `Ctrl+X`. (저장 안 한 변경이 있으면 저장할지 묻는데, `Y` → `Enter`.)
5. 잘못 고쳤으면 저장하지 않고 `Ctrl+X` → `N`으로 나가면 돼요.

> 설정 파일을 고친 뒤에는 **그 프로그램을 재시작해야 반영돼요.** (예: 환경 변수를 고치면 `sudo systemctl restart flowspace`)

### F. sudo (관리자 권한)와 파일 권한

- `sudo 명령`: "이 명령은 관리자 권한으로 실행"이라는 뜻이에요. 설치, 시스템 폴더 수정, 서비스 관리에 필요해요. 처음 쓸 때 비밀번호를 묻지 않는 경우가 많아요(AWS 기본 설정).
- `sudo`를 붙이지 않고 시스템 파일을 고치려 하면 `Permission denied`(권한 거부)가 나와요. 그럴 땐 `sudo`를 붙여 다시 입력하세요.
- `ls -l`의 맨 앞 `-rw-r--r--` 같은 글자가 권한이에요. 가이드에서 쓰는 두 가지만 알면 돼요.
  - `sudo chmod 600 파일`: 소유자만 읽고 쓸 수 있게(비밀번호가 든 파일에 사용).
  - `sudo chown 사용자:그룹 폴더`: 폴더의 주인을 바꿔요. 가이드에서는 백엔드를 돌리는 `flowspace` 계정이 업로드 폴더에 쓸 수 있게 해요.
- `sudo`는 강력해서 **뭔지 모르는 명령에 붙이지 마세요.** 인터넷에서 복사한 명령은 의미를 확인한 뒤 실행하세요.

### G. 프로그램 설치 (apt)

Windows의 "설치 파일 더블클릭" 대신 `apt`가 설치를 해줘요.

```bash
sudo apt update                         # 설치 가능한 프로그램 목록 새로고침
sudo apt upgrade -y                     # 설치된 프로그램 업데이트
sudo apt install -y 프로그램이름          # 설치 (-y: "계속할까요?"에 자동으로 예)
sudo apt remove 프로그램이름              # 삭제
apt search 키워드                        # 이름 검색
```
- 설치 직전에는 항상 `sudo apt update`를 먼저 실행하세요.
- 설치 확인: `java -version`, `nginx -v`, `mysql --version`.
- `upgrade` 도중 보라색/파란 화면이 뜨며 "재시작할 서비스를 고르라"고 하면 기본값 그대로 `Enter`를 누르면 돼요.
- `Could not get lock` 오류는 다른 설치가 진행 중이라는 뜻이에요. 1~2분 뒤에 다시 하세요.

### H. 서비스 관리 (systemctl) — 이 프로젝트에서 가장 많이 쓰는 명령

백엔드·nginx·MySQL은 서버 안에서 "서비스"로 계속 돌아가요. `systemctl`로 켜고 끄고 상태를 봐요.

```bash
sudo systemctl status flowspace      # 상태 보기 (active (running)이면 정상, 나가기: q)
sudo systemctl start flowspace       # 켜기
sudo systemctl stop flowspace        # 끄기
sudo systemctl restart flowspace     # 껐다 켜기 (설정·jar를 바꾼 뒤)
sudo systemctl enable flowspace      # 서버가 재부팅돼도 자동으로 켜지게 등록
sudo systemctl reload nginx          # 서비스를 끊지 않고 설정만 다시 읽기(nginx)
```
상태 글자 읽는 법: `active (running)` 정상 / `failed` 켜다가 실패 / `inactive (dead)` 꺼져 있음.

### I. 로그 보기 — 문제가 생기면 가장 먼저 할 일

```bash
journalctl -u flowspace -n 100            # 백엔드 로그 마지막 100줄
journalctl -u flowspace -f                # 실시간으로 계속 보기 (Ctrl+C로 종료)
journalctl -u flowspace --since "10 min ago"
sudo tail -n 50 /var/log/nginx/error.log  # nginx 오류 로그
```
- 오류의 원인은 보통 `ERROR`, `Caused by:`, `Exception` 글자 근처에 있어요.
- 도움을 요청할 때는 **로그의 해당 부분을 복사해서** 알려주세요. 비밀번호가 보이면 가리세요.

### J. 서버 상태 확인

```bash
df -h                       # 디스크 남은 용량 (Use%가 90%를 넘으면 위험)
free -h                     # 메모리 사용량
sudo ss -tlnp               # 어떤 포트를 어떤 프로그램이 쓰고 있는지 (8080이 java, 80/443이 nginx면 정상)
ps aux | grep java          # java가 돌고 있는지
curl -I http://localhost:8080/api/auth/me     # 서버 안에서 백엔드가 응답하는지 (401이 나오면 정상: 켜져 있는 거예요)
```

### K. 내 PC ↔ 서버 파일 주고받기 (scp)

**내 PC의 PowerShell**에서 입력해요. (서버에 접속한 창이 아니에요!)

```
scp -i C:\경로\내키.pem 보낼파일 ubuntu@서버IP:~/
scp -i C:\경로\내키.pem -r 보낼폴더 ubuntu@서버IP:~/
scp -i C:\경로\내키.pem ubuntu@서버IP:~/가져올파일 C:\저장할폴더\
```
- 가이드의 `scp ... 사용자@서버IP:~/`는 AWS에서는 `scp -i 키파일.pem ... ubuntu@서버IP:~/` 로 쓰세요.
- 일반 사용자(`ubuntu`)는 `/opt`, `/var/www` 같은 시스템 폴더에 직접 못 써요. 그래서 가이드는 먼저 **홈 폴더(`~`)로 보내고**, 서버에서 `sudo cp`/`sudo mv`로 제자리에 옮겨요.

### L. 이 프로젝트에서 자주 만나는 오류와 해결

| 증상 | 원인 / 해결 |
| --- | --- |
| `Permission denied` | 권한 부족. 명령 앞에 `sudo`를 붙이세요. |
| `command not found` | 프로그램이 설치 안 됐거나 이름 오타. `sudo apt install ...` 후 다시. |
| `No such file or directory` | 경로 오타이거나 내가 다른 폴더에 있음. `pwd`, `ls`로 확인. |
| SSH가 멈추다가 `timed out` | AWS 보안 그룹 22번 포트, 서버 공인 IP(재시작하면 바뀜) 확인. |
| `Connection refused` | 서버는 켜졌지만 해당 프로그램이 꺼져 있음. `systemctl status ...` 확인. |
| 사이트가 `502 Bad Gateway` | nginx는 살아 있는데 백엔드(8080)가 꺼짐. `journalctl -u flowspace -n 100`. |
| `Address already in use` / 8080 사용 중 | 같은 포트를 쓰는 프로그램이 이미 있음. `sudo ss -tlnp`로 확인. |
| `No space left on device` | 디스크 가득 참. `df -h`로 확인, 오래된 백업·로그 삭제. |
| 파일을 고쳤는데 반영 안 됨 | 서비스 재시작 필요(`sudo systemctl restart ...`). 프런트는 브라우저 새로고침(Ctrl+F5). |
| 서비스가 `failed`로 꺼짐 | 환경 변수 누락/오타일 가능성이 가장 높음. `journalctl -u flowspace -n 100` 마지막 오류 확인. |

### M. 안전하게 쓰는 습관

1. **고치기 전에 백업**: `sudo cp 파일 파일.bak` 한 줄이면 돌릴 수 있어요.
2. 한 번에 한 가지만 바꾸고 바로 결과를 확인하세요(고치고 → 재시작 → 로그 확인).
3. `.pem` 키와 `flowspace.env`(비밀번호 파일)는 **절대 공유·업로드 금지**. 채팅이나 이슈에 붙여넣을 때도 값은 가리세요.
4. 서버를 껐다 켜면 공인 IP가 바뀔 수 있어요(Elastic IP를 붙이지 않았다면). 접속이 안 되면 AWS 콘솔에서 새 IP를 확인하세요.
5. 가끔 `sudo apt update && sudo apt upgrade -y` 로 보안 업데이트를 하세요. 커널 업데이트 뒤에는 `sudo reboot`(재부팅) 후 몇 분 뒤 다시 접속하면 돼요. 서비스는 `enable` 해 두었기 때문에 자동으로 다시 켜져요.
6. 서버 안의 파일을 다 지우는 명령, 알 수 없는 사이트에서 가져온 `curl ... | sudo bash` 같은 명령은 실행하지 마세요.

### N. 한눈에 보는 명령어 모음

| 하고 싶은 일 | 명령 |
| --- | --- |
| 서버 접속 / 종료 | `ssh -i 키.pem ubuntu@IP` / `exit` |
| 내 위치 / 목록 | `pwd` / `ls -l` |
| 폴더 이동 | `cd 경로` |
| 파일 보기 | `cat 파일`, `less 파일`, `tail -f 파일` |
| 파일 편집 | `sudo nano 파일` (저장 Ctrl+O, Enter / 종료 Ctrl+X) |
| 설치 | `sudo apt update` → `sudo apt install -y 이름` |
| 서비스 상태 / 재시작 | `sudo systemctl status 이름` / `sudo systemctl restart 이름` |
| 로그 | `journalctl -u 이름 -n 100`, `journalctl -u 이름 -f` |
| 디스크 / 메모리 / 포트 | `df -h` / `free -h` / `sudo ss -tlnp` |
| 파일 보내기 (내 PC에서) | `scp -i 키.pem 파일 ubuntu@IP:~/` |
| 재부팅 | `sudo reboot` |

---

## 2. 서버 준비

서버에 SSH로 접속한 뒤(Windows는 PowerShell에서 `ssh -i 키파일.pem ubuntu@서버IP` — 접속 방법은 위 1-2장 B):

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install openjdk-21-jre-headless mysql-server nginx certbot python3-certbot-nginx
java -version     # 21 이어야 해요
```

---

## 3. 데이터베이스 만들기

1. MySQL에 들어가요.
   ```bash
   sudo mysql
   ```
2. **앱 전용 계정**을 만들어요(root는 쓰지 마세요). 비밀번호는 길고 무작위로.
   ```sql
   CREATE USER 'flowspace'@'localhost' IDENTIFIED BY '여기에_긴_비밀번호';
   ```
3. 테이블 만들기: `ddl.sql`을 서버로 옮겨서 실행해요. (내 PC PowerShell에서)
   ```
   scp -i 키파일.pem backend\src\main\resources\db\ddl.sql ubuntu@서버IP:~/
   ```
   서버에서
   ```bash
   sudo mysql < ~/ddl.sql
   ```
   이 파일이 `flow_space` 데이터베이스와 모든 테이블을 만들어요. (열 블록 타입 `COLUMN_LIST`/`COLUMN`, 페이지 `version` 열, 가입 이메일 인증용 `users.email_verified` 열과 `email_verification_tokens` 테이블이 이미 들어 있어요.)
4. 앱 계정에 권한을 줘요.
   ```sql
   GRANT SELECT, INSERT, UPDATE, DELETE ON flow_space.* TO 'flowspace'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```
   서버는 `ddl-auto: validate`라서 테이블을 스스로 만들거나 고치지 않아요. 그래서 위 4가지 권한이면 충분해요.

> 이미 운영 중인 DB가 있다면(새로 만드는 게 아니라면): `ddl.sql`을 다시 실행하면 안 돼요. 대신 아래 세 가지를 직접 적용해야 해요. 먼저 **mysqldump로 백업**하세요.
> ```sql
> ALTER TABLE blocks MODIFY COLUMN type ENUM('TEXT','H1','H2','H3','TODO','BULLET','NUMBERED','QUOTE','TOGGLE','CALLOUT','TASK','EVENT','SPRINT','DATABASE','IMAGE','FILE','DIVIDER','CODE','COLUMN_LIST','COLUMN') NOT NULL DEFAULT 'TEXT';
> ALTER TABLE pages ADD COLUMN version BIGINT NOT NULL DEFAULT 0;   -- 이미 있으면 오류가 나니 먼저 DESCRIBE pages; 로 확인
> -- 가입 이메일 인증: 기존 계정은 모두 인증된 것으로 두려고 DEFAULT TRUE예요. 이미 있으면 오류가 나니 DESCRIBE users; 로 확인
> ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE;
> CREATE TABLE email_verification_tokens (
>     verification_token_id BIGINT AUTO_INCREMENT PRIMARY KEY,
>     user_id BIGINT NOT NULL,
>     token_hash VARCHAR(64) NOT NULL UNIQUE,
>     expires_at DATETIME NOT NULL,
>     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
>     CONSTRAINT fk_verification_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
> );
> ```
> (위 SQL은 `USE flow_space;` 를 먼저 실행한 상태에서 적용하세요.)

---

## 4. 백엔드 올리기

### 4-1. jar 만들기 (내 PC)
`backend` 폴더에서
```
.\gradlew.bat bootJar
```
`backend\build\libs\backend-0.0.1-SNAPSHOT.jar` 이 만들어져요.

### 4-2. 서버로 옮기기
```
scp -i 키파일.pem backend\build\libs\backend-0.0.1-SNAPSHOT.jar ubuntu@서버IP:~/flowspace.jar
```
서버에서
```bash
sudo mkdir -p /opt/flowspace /var/flowspace/uploads /etc/flowspace
sudo useradd --system --home /opt/flowspace --shell /usr/sbin/nologin flowspace
sudo mv ~/flowspace.jar /opt/flowspace/flowspace.jar
sudo chown -R flowspace:flowspace /opt/flowspace /var/flowspace
```

### 4-3. 환경 변수 파일 만들기
서버에는 `application-secret.yaml`(내 PC에만 있는 비밀 파일)이 없으니, 같은 값을 환경 변수로 넣어요.

```bash
sudo nano /etc/flowspace/flowspace.env
```
아래를 붙여 넣고 **`<…>` 자리를 실제 값으로** 바꾸세요. (값에 `#`·공백이 있으면 따옴표로 감싸요.)

```
SPRING_PROFILES_ACTIVE=prod

SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/flow_space?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
SPRING_DATASOURCE_USERNAME=flowspace
SPRING_DATASOURCE_PASSWORD=<3번에서 정한 DB 비밀번호>

# JWT 서명 키: 길고 무작위여야 해요(64자 이상 권장). 서버에서 `openssl rand -base64 64` 로 만들 수 있어요.
JWT_SECRET=<무작위 긴 문자열>
JWT_ACCESS_TOKEN_EXPIRATION=3600000
JWT_REFRESH_TOKEN_EXPIRATION=1209600000

# 소셜 로그인 — 내 PC의 application-secret.yaml에 있는 같은 값이에요(프런트 .env.production의 값과도 같아야 해요).
GOOGLE_CLIENT_ID=<google.client-id>
MICROSOFT_CLIENT_ID=<microsoft.client-id>

# 비밀번호 찾기 메일(Gmail)
SPRING_MAIL_USERNAME=<Gmail 주소>
SPRING_MAIL_PASSWORD=<Gmail 앱 비밀번호 16자리>

# 프런트 주소 — 메일 링크와 CORS에 쓰여요. 끝에 / 를 붙이지 마세요.
APP_FRONTEND_URL=https://flowspace.example.com
CORS_ALLOWED_ORIGINS=https://flowspace.example.com

UPLOAD_DIR=/var/flowspace/uploads
```

```bash
sudo chmod 600 /etc/flowspace/flowspace.env     # 비밀번호가 있으니 다른 사람이 못 읽게
sudo chown root:root /etc/flowspace/flowspace.env
```

> `JWT_SECRET`을 바꾸면 이미 로그인한 사람들의 로그인이 모두 풀려요. 처음 배포 때 정하고 계속 쓰세요.
> 내 PC 개발용 JWT 키를 운영에 그대로 쓰지 말고 **새로 만든 값**을 쓰세요.

### 4-4. 서비스로 등록 (서버가 켜질 때 자동 실행, 죽으면 재시작)
```bash
sudo nano /etc/systemd/system/flowspace.service
```
```
[Unit]
Description=FlowSpace backend
After=network.target mysql.service

[Service]
User=flowspace
EnvironmentFile=/etc/flowspace/flowspace.env
ExecStart=/usr/bin/java -Xmx768m -jar /opt/flowspace/flowspace.jar
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now flowspace
sudo systemctl status flowspace          # active (running) 이어야 해요
journalctl -u flowspace -f               # 로그 보기(Ctrl+C로 나가기)
```
- 켜지자마자 꺼지고 `Could not resolve placeholder 'APP_FRONTEND_URL'` 같은 로그가 나오면, 환경 변수 파일에서 그 항목을 빠뜨린 거예요(일부러 기본값을 안 뒀어요).
- 로그에서 `Access denied for user`가 나오면 DB 계정/비밀번호가 틀린 거예요.

---

## 5. 프런트 올리기

### 5-1. 운영 주소 넣기 (내 PC)
`frontend\.env.production` 을 열어서 `VITE_API_BASE_URL`을 운영 주소로 바꿔요. (**지금은 `http://localhost:8080/api`로 되어 있어서 그대로 빌드하면 배포된 화면이 사용자 PC의 localhost를 불러요.**)

```
VITE_API_BASE_URL=https://flowspace.example.com/api
VITE_GOOGLE_CLIENT_ID=(기존 값 유지)
VITE_MICROSOFT_CLIENT_ID=(기존 값 유지)
VITE_MICROSOFT_TENANT_ID=common   (기존 값 유지)
```

### 5-2. 빌드
```
cd frontend
npm ci
npm run build
```
`frontend\dist` 폴더가 만들어져요.

### 5-3. 서버로 올리기
```
scp -i 키파일.pem -r dist\* ubuntu@서버IP:~/dist/
```
서버에서
```bash
sudo mkdir -p /var/www/flowspace
sudo rm -rf /var/www/flowspace/*
sudo cp -r ~/dist/* /var/www/flowspace/
```
(다시 배포할 때도 5-1~5-3만 반복하면 돼요.)

---

## 6. nginx 설정 + HTTPS

```bash
sudo nano /etc/nginx/sites-available/flowspace
```
```nginx
server {
    listen 80;
    server_name flowspace.example.com;

    # 파일 업로드 한도(백엔드 25MB 제한보다 조금 크게)
    client_max_body_size 30m;

    root /var/www/flowspace;
    index index.html;

    # 프런트(SPA): 없는 주소는 index.html로
    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 700s;   # AI 초안 생성처럼 오래 걸리는 요청용
    }

    location /uploads/ { proxy_pass http://127.0.0.1:8080; proxy_set_header Host $host; }
    location /covers/  { proxy_pass http://127.0.0.1:8080; proxy_set_header Host $host; }

    # 실시간(알림·접속 상태·다른 멤버 변경 반영) — WebSocket이라 아래 3줄이 꼭 있어야 해요
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/flowspace /etc/nginx/sites-enabled/flowspace
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t                     # syntax is ok 가 나와야 해요
sudo systemctl reload nginx
sudo certbot --nginx -d flowspace.example.com     # 이메일 입력 → 약관 동의 → HTTP를 HTTPS로 돌릴지 묻면 "2(Redirect)" 선택
```
인증서는 자동 갱신돼요(`sudo certbot renew --dry-run`으로 확인 가능).

---

## 7. 소셜 로그인 설정 (내가 직접 해야 하는 부분)

운영 주소를 각 서비스 콘솔에 등록하지 않으면 **운영에서 Google/Microsoft 로그인 버튼이 오류**가 나요.

### Google
1. https://console.cloud.google.com → 해당 프로젝트 → `API 및 서비스` → `사용자 인증 정보`.
2. 사용 중인 `OAuth 2.0 클라이언트 ID`를 열어요.
3. `승인된 자바스크립트 원본`에 `https://flowspace.example.com` 추가 (끝에 `/` 없이).
4. 저장. 반영에 몇 분 걸릴 수 있어요.
5. OAuth 동의 화면이 `테스트` 상태면 등록한 테스트 사용자만 로그인돼요. 아무나 쓰게 하려면 `앱 게시`(프로덕션)로 바꿔야 해요.

### Microsoft
1. https://entra.microsoft.com → `앱 등록` → 사용 중인 앱 → `인증`.
2. `플랫폼 추가` → `단일 페이지 애플리케이션`이 이미 있다면 거기에 **리디렉션 URI** `https://flowspace.example.com/auth-callback.html` 을 추가해요.
3. 저장.

### Gmail (가입 인증 메일 · 비밀번호 찾기 메일)
- 이 메일 설정이 없으면 **가입 인증 메일이 가지 않아서 아무도 가입을 끝낼 수 없어요.** 배포 전에 꼭 넣으세요(서버 로그에는 링크가 남지만 사용자에게는 안 가요).
- 지금 쓰는 앱 비밀번호를 그대로 환경 변수에 넣으면 돼요. Google 계정에서 2단계 인증이 켜져 있어야 앱 비밀번호가 유효해요.
- Gmail은 하루 발송 한도가 있어서(개인 계정 약 500통) 사용자가 많아지면 별도 메일 서비스가 필요해요.

---

## 8. 배포 직후 점검 체크리스트

브라우저(가능하면 시크릿 창)에서 `https://flowspace.example.com` 으로 하나씩 확인하세요.

- [ ] 접속하면 로그인 화면이 나오고 주소창에 자물쇠(HTTPS)가 보인다.
- [ ] 이메일로 회원가입 → "인증 메일을 보냈어요" 화면이 나오고, 메일의 버튼을 누르면 "이메일 인증을 마쳤어요"가 뜬 뒤 로그인이 된다.
- [ ] 인증 전에 로그인하면 "이메일 인증이 필요해요"와 함께 "다시 보내기"가 나온다.
- [ ] 인증 메일 안 링크가 `https://flowspace.example.com/verify-email?...` 로 열린다.
- [ ] Google 로그인, Microsoft 로그인이 된다.
- [ ] 비밀번호 찾기 메일이 오고, 메일 안 링크가 `https://flowspace.example.com/reset-password?...` 로 열린다.
- [ ] 새 워크스페이스 → 페이지 생성 → 글 입력 후 새로고침해도 남아 있다(저장).
- [ ] 페이지 커버 갤러리가 보이고 선택된다.
- [ ] 이미지 업로드가 되고 새로고침해도 보인다. `.html`·`.svg` 파일은 올릴 수 없다고 나온다.
- [ ] 두 브라우저(시크릿 창 포함)로 같은 페이지를 열고 한쪽에서 수정하면 다른 쪽에 반영된다(WebSocket 확인).
- [ ] 알림 클릭 시 해당 작업 상세가 열린다.
- [ ] 스프린트 시작 → 완료가 되고, 완료한 스프린트를 다시 진행 중으로 바꿀 수 없다.
- [ ] `https://flowspace.example.com/swagger-ui/index.html` 이 **열리지 않는다**(401/404).
- [ ] 개발자 도구(F12) → Console/Network에 `localhost` 로 가는 요청이나 빨간 오류가 없다.
- [ ] `journalctl -u flowspace --since "10 min ago"` 에 `ERROR`가 없다.
- [ ] 다음 날 오전 9시 이후에 마감 임박 알림이 한국 시간 기준으로 오는지 확인(서버 시간대와 상관없이 한국 시간으로 맞춰 뒀어요).

---

## 9. 운영 시 꼭 해둘 것

1. **백업(가장 중요)**: DB와 업로드 폴더 둘 다 백업해야 해요.
   ```bash
   sudo mkdir -p /var/backups/flowspace
   sudo crontab -e
   ```
   아래 두 줄 추가(매일 새벽 3시):
   ```
   0 3 * * * mysqldump --single-transaction flow_space | gzip > /var/backups/flowspace/db-$(date +\%F).sql.gz
   10 3 * * * tar czf /var/backups/flowspace/uploads-$(date +\%F).tgz -C /var/flowspace uploads
   ```
   그리고 이 백업 폴더를 **서버 밖(다른 서버/클라우드 저장소)** 으로도 복사하세요. 서버 하나가 날아가면 같이 사라져요.
2. 업로드 폴더(`/var/flowspace/uploads`)는 재배포해도 지워지지 않는 위치예요. jar만 교체하면 돼요.
3. 업데이트 방법: jar 교체 후 `sudo systemctl restart flowspace`, 프런트는 5번 반복.
4. DB 구조가 바뀐 버전을 올릴 때는 jar를 올리기 **전에** 해당 `ALTER` 를 먼저 실행하세요(`ddl-auto: validate`라서 구조가 안 맞으면 서버가 켜지지 않아요).

---

## 10. 지금 코드에 남아 있는 알려진 한계 (배포는 가능, 사용자가 늘면 대응)

| 항목 | 내용 |
| --- | --- |
| 인증하지 않은 가입 계정이 남음 | 가입만 하고 메일 인증을 안 한 계정은 DB에 그대로 남아요(로그인은 못 해요). 같은 이메일로 다시 가입하면 새 정보로 덮어써서 인증 메일을 다시 보내요. 쌓이면 나중에 정리 작업을 추가하세요. |
| 로그인 시도 횟수 제한은 앱 안에서만 | 백엔드(`AuthRateLimiter`)가 같은 접속 주소·이메일로 15분에 5번 틀리면 막고, 메일 요청(가입·재전송·비밀번호 찾기)은 1시간에 이메일당 3번·주소당 10번으로 제한해요. 서버 메모리에서 세기 때문에 서비스를 다시 켜면 횟수가 0으로 돌아가요. 선택으로 nginx `limit_req`(초당 요청 수 제한)를 `/api/auth/` 에 한 겹 더 걸어 둘 수 있어요. |
| 업로드 파일이 주소만 알면 누구나 열림 | 주소가 무작위(UUID)라 추측은 어렵지만, 워크스페이스에서 나간 사람도 주소를 알면 볼 수 있어요. |
| Microsoft 로그인의 이메일 신뢰 | 다른 조직 계정이 임의 이메일로 가입할 수 있는 이론적 위험이 있어요(Entra 앱 설정에 따라 다름). 외부 공개 전에 허용 테넌트를 제한하는 것을 권장해요. |
| 비밀번호 변경 후에도 기존 로그인 유지 | 훔친 액세스 토큰은 최대 1시간 동안 유효해요. |
