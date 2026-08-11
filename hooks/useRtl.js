"use client";

import { useCallback, useState } from "react";
import themeConfig from "@/configs/themeConfig";

const useRtl = () => {
  const [isRtl, setIsRtl] = useState(themeConfig.layout.isRTL);

  const setRtl = useCallback((value) => {
    setIsRtl(value);
    window.localStorage.setItem("direction", JSON.stringify(value));
  }, []);

  return [isRtl, setRtl];
};

export default useRtl;
