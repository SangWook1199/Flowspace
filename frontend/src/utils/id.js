// 새 항목의 id를 만드는 공용 함수 — `목록.length + 1`로 만들면 중간 항목을 지운 뒤 id가 겹쳐서(같은 key,
// 한쪽을 고치면 다른 쪽도 같이 바뀜) 문제가 돼요. 항상 "지금 있는 id 중 가장 큰 값 + 1"로 만들어요.
// API를 붙이면 서버가 id를 주니까 이 함수들은 임시 id(낙관적 갱신)에만 쓰면 돼요.

// 숫자 id: 목록에서 field 값의 최댓값 + 1.
export const nextNumericId = (list, field = "id") =>
  (list || []).reduce((max, item) => (Number.isFinite(Number(item?.[field])) ? Math.max(max, Number(item[field])) : max), 0) + 1;

// "SP1-8" 같은 접두사+번호 키: 같은 접두사 중 가장 큰 번호 + 1.
export const nextPrefixedKey = (list, prefix, field = "id") => {
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`);
  const max = (list || []).reduce((m, item) => {
    const hit = re.exec(String(item?.[field] ?? ""));
    return hit ? Math.max(m, Number(hit[1])) : m;
  }, 0);
  return `${prefix}${max + 1}`;
};
