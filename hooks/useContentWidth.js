"use client";

import { useCallback, useState } from "react";
import themeConfig from "@/configs/themeConfig";

const useContentWidth = () => {
  const [contentWidth, setContentWidthState] = useState(
    themeConfig.layout.contentWidth,
  );

  const setContentWidth = useCallback((value) => {
    setContentWidthState(value);
  }, []);

  return [contentWidth, setContentWidth];
};

export default useContentWidth;
