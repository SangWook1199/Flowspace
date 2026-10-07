import { useContext } from "react";
import { DialogContext } from "./DialogContext";

// 브라우저 기본 alert/confirm 대신 앱 모양의 확인창·안내(토스트)를 쓰는 훅이에요.
//
//   const { confirm, notify } = useDialog();
//   if (!(await confirm({ title: "작업 삭제", message: "삭제할까요?", confirmLabel: "삭제", danger: true }))) return;
//   notify("저장하지 못했어요.");                 // 오류(기본)
//   notify("옮겼어요.", { type: "success" });     // 성공/안내
//
// DialogProvider 바깥(테스트 등)에서는 브라우저 기본 창으로 대신해서 앱이 멈추지 않게 해요.
const fallback = {
  confirm: async (options) => window.confirm(typeof options === "string" ? options : options.message),
  notify: (message) => window.alert(message),
};

export default function useDialog() {
  return useContext(DialogContext) ?? fallback;
}
