// 서버 NotificationResponse → 화면에서 쓰는 알림.
// 실시간(WebSocket)으로 오는 알림도 같은 모양이라 이 변환기를 같이 써요.
export const toNotification = (dto) => ({
  id: dto.notificationId,
  type: dto.type,
  message: dto.message,
  workspaceId: dto.workspaceId ?? null,
  workspaceName: dto.workspaceName ?? "",
  actorId: dto.actorId ?? null,
  actorName: dto.actorName ?? "",
  // 초대 알림이면 inviteId, 작업 알림이면 taskId처럼 알림이 가리키는 대상 id
  refId: dto.refId ?? null,
  // 알림을 누르면 이동할 화면 경로 (없으면 이동 없음)
  linkPath: dto.linkPath ?? null,
  read: Boolean(dto.read),
  createdAt: dto.createdAt,
});
