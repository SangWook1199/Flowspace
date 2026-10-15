#!/bin/bash
# GitHub Actions가 서버로 올린 새 버전을 적용해요. 서버에서 실행돼요(~/deploy/ 에 파일이 있어요).
# 새 백엔드가 켜지지 않으면 이전 jar로 자동으로 되돌리고 실패로 끝내요.
set -euo pipefail

DEPLOY_DIR="$HOME/deploy"
JAR_NEW="$DEPLOY_DIR/flowspace.jar"
JAR_LIVE=/opt/flowspace/flowspace.jar
JAR_PREV=/opt/flowspace/flowspace.jar.prev
WEB_ROOT=/var/www/flowspace

# 백엔드가 응답하는지: 로그인 없이 /api/auth/me 를 부르면 401이 와야 정상이에요.
health_code() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://127.0.0.1:8080/api/auth/me || true
}

wait_healthy() {
  local code
  for _ in $(seq 1 45); do
    code=$(health_code)
    if [ "$code" = "401" ] || [ "$code" = "200" ]; then
      return 0
    fi
    sleep 2
  done
  return 1
}

echo "== 백엔드 교체"
sudo cp "$JAR_LIVE" "$JAR_PREV"
sudo install -o flowspace -g flowspace -m 644 "$JAR_NEW" "$JAR_LIVE"
sudo systemctl restart flowspace

if ! wait_healthy; then
  echo "!! 새 버전이 켜지지 않았어요. 서버 로그 마지막 부분:"
  sudo journalctl -u flowspace -n 40 --no-pager || true
  echo "!! 이전 버전으로 되돌려요"
  sudo install -o flowspace -g flowspace -m 644 "$JAR_PREV" "$JAR_LIVE"
  sudo systemctl restart flowspace
  wait_healthy && echo "이전 버전이 다시 켜졌어요" || echo "이전 버전도 응답하지 않아요. 서버를 직접 확인해 주세요."
  exit 1
fi
echo "백엔드 정상"

echo "== 프런트 교체"
TMP=$(mktemp -d)
tar -xzf "$DEPLOY_DIR/dist.tgz" -C "$TMP"
sudo rm -rf "${WEB_ROOT:?}"/*
sudo cp -r "$TMP"/. "$WEB_ROOT"/
sudo chmod -R a+rX "$WEB_ROOT"
rm -rf "$TMP" "$DEPLOY_DIR/dist.tgz" "$JAR_NEW"

echo "== 배포 완료"
