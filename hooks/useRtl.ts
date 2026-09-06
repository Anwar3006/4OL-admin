"use client";

import { useCallback, useState } from "react";
import themeConfig from "@/configs/themeConfig";

/** `[isRtl, setRtl]`. Tuple, not an array — destructuring depends on it. */
const useRtl = (): [boolean, (value: boolean) => void] => {
  const [isRtl, setIsRtl] = useState<boolean>(themeConfig.layout.isRTL);

  const setRtl = useCallback((value: boolean) => {
    setIsRtl(value);
    window.localStorage.setItem("direction", JSON.stringify(value));
  }, []);

  return [isRtl, setRtl];
};

export default useRtl;
