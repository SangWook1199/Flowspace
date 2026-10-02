import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../utils/apiError";

// 화면에서 목록·상세를 불러올 때 쓰는 공용 훅이에요.
//   const { data, loading, error, reload, setData } = useRequest(() => getSprints(wsId), [wsId]);
// - fn은 Promise를 돌려주는 함수(보통 api 모듈 함수)예요.
// - deps가 바뀌면 다시 불러오고, 늦게 도착한 옛 응답은 무시해요.
// - enabled가 false면 부르지 않아요(워크스페이스 id가 아직 없을 때 등).
export function useRequest(fn, deps = [], { enabled = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  // 요청마다 번호를 매겨서, 번호가 최신이 아닌 응답은 버려요.
  const requestId = useRef(0);

  // 최신 fn을 ref로 들고 있어서 deps에 fn을 넣지 않아도 돼요.
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback(() => {
    const id = ++requestId.current;

    setLoading(true);
    setError(null);

    return Promise.resolve()
      .then(() => fnRef.current())
      .then((result) => {
        if (id === requestId.current) setData(result);
        return result;
      })
      .catch((err) => {
        if (id === requestId.current) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestId.current++;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    run();

    return () => {
      requestId.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  return { data, loading, error, reload: run, setData };
}
