"use client";

import { useCallback, useEffect, useState } from "react";
import themeConfig from "@/configs/themeConfig";

const readStoredValue = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  return stored === null ? fallback : JSON.parse(stored);
};

const useSkin = () => {
  const [skin, setSkinState] = useState(themeConfig.layout.skin);

  useEffect(() => {
    setSkinState(readStoredValue("skin", themeConfig.layout.skin));
  }, []);

  const setSkin = useCallback((mode) => {
    setSkinState(mode);
    window.localStorage.setItem("skin", JSON.stringify(mode));
  }, []);

  return [skin, setSkin];
};

export default useSkin;
