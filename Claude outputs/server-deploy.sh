#!/bin/bash
# GitHub Actions가 서버에서 실행해요(~/deploy/ 에 파일이 올라와 있어요).
# 사용법: bash server-deploy.sh <이미지 태그(커밋 해시)>
# 새 이미지로 백엔드 컨테이너를 교체하고, 켜지지 않으면 이전 이미지로 자동으로 되돌리고 실패로 끝내요.
set -euo pipefail

NEW_TAG="${1:?이미지 태그(커밋 해시)를 넘겨 주세요}"
IMAGE=ghcr.io/sangwook1199/flowspace-backend
CONTAINER=flowspace-backend
DEPLOY_DIR="$HOME/deploy"
APP_DIR=/opt/flowspace
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

# 주어진 태그의 이미지로 컨테이너를 (다시) 만들어요. 태그는 .env에 적어 둬서 나중에도 같은 버전이 켜져요.
run_backend() {
  echo "IMAGE_TAG=$1" | sudo tee "$APP_DIR/.env" > /dev/null
  sudo docker compose -f "$APP_DIR/docker-compose.yml" up -d
}

# 지금 돌고 있는 컨테이너의 이미지 태그(되돌릴 때 써요). 컨테이너가 없으면 비어 있어요.
PREV_TAG=$(sudo docker inspect -f '{{.Config.Image}}' "$CONTAINER" 2>/dev/null | sed 's/.*://' || true)

echo "== 새 이미지 받기 ($NEW_TAG)"
sudo docker pull "$IMAGE:$NEW_TAG"

echo "== 백엔드 교체 (이전: ${PREV_TAG:-없음})"
sudo install -m 644 "$DEPLOY_DIR/docker-compose.prod.yml" "$APP_DIR/docker-compose.yml"
run_backend "$NEW_TAG"

if ! wait_healthy; then
  echo "!! 새 버전이 켜지지 않았어요. 컨테이너 로그 마지막 부분:"
  sudo docker logs --tail 40 "$CONTAINER" || true
  if [ -n "$PREV_TAG" ]; then
    echo "!! 이전 버전($PREV_TAG)으로 되돌려요"
    run_backend "$PREV_TAG"
    wait_healthy && echo "이전 버전이 다시 켜졌어요" || echo "이전 버전도 응답하지 않아요. 서버를 직접 확인해 주세요."
  fi
  exit 1
fi
echo "백엔드 정상"

echo "== 프런트 교체"
TMP=$(mktemp -d)
tar -xzf "$DEPLOY_DIR/dist.tgz" -C "$TMP"
sudo rm -rf "${WEB_ROOT:?}"/*
sudo cp -r "$TMP"/. "$WEB_ROOT"/
sudo chmod -R a+rX "$WEB_ROOT"
rm -rf "$TMP" "$DEPLOY_DIR/dist.tgz"

# 이제 쓰지 않는 예전 이미지를 지워 디스크를 비워요(예전 버전은 GHCR에 남아 있어 다시 받을 수 있어요).
sudo docker image prune -af > /dev/null

echo "== 배포 완료 ($NEW_TAG)"
