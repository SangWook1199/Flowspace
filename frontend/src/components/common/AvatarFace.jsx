import { useState } from "react";

// 동그라미 아바타 안쪽이에요. 프로필 사진이 있으면 사진을, 없거나 불러오지 못하면 fallback(이니셜)을 보여줘요.
export default function AvatarFace({ src, fallback }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (src && failedSrc !== src) {
    return <img src={src} alt="" onError={() => setFailedSrc(src)} />;
  }

  return fallback;
}
