@echo off
chcp 65001 >nul
title FlowSpace AI 연결
echo FlowSpace 서버가 이 PC의 AI(Ollama)를 쓰도록 연결합니다.
echo 이 창을 열어 두는 동안에만 배포 사이트에서 AI를 쓸 수 있어요. 끊으려면 창을 닫거나 Ctrl+C 를 누르세요.
echo.
:loop
ssh -N -R 127.0.0.1:11434:127.0.0.1:11434 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=accept-new -i "%USERPROFILE%\.ssh\flowspace-deploy" ubuntu@15.134.148.193
echo.
echo 연결이 끊겼어요. 10초 뒤 다시 연결해요...
timeout /t 10 >nul
goto loop
