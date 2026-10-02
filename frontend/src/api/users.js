import client from "./client";
import { toLookupUser } from "./mappers";

// 이메일이 정확히 같은 사용자를 한 명 찾아요(없으면 null). workspaceId를 주면 그 워크스페이스 기준으로
// 이미 멤버인지·이미 초대했는지(status)도 알려줘요 — 워크스페이스를 만드는 중이면 생략해요.
export const lookupUserByEmail = async (email, workspaceId = null) => {
  const params = workspaceId == null ? { email } : { email, workspaceId };
  const { data } = await client.get("/users/lookup", { params });
  return data ? toLookupUser(data) : null;
};
