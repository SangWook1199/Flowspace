import { createContext } from "react";

// confirm(옵션) → Promise<boolean>, notify(메시지, 옵션) → void 를 담은 컨텍스트예요. (DialogProvider가 채워요)
export const DialogContext = createContext(null);
