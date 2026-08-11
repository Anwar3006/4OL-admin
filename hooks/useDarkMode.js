"use client";

import { useCallback, useEffect, useState } from "react";
import themeConfig from "@/configs/themeConfig";

const readStoredBoolean = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  return stored === null ? fallback : JSON.parse(stored);
};

const useDarkmode = () => {
  const [isDark, setIsDark] = useState(themeConfig.layout.darkMode);

  useEffect(() => {
    setIsDark(readStoredBoolean("darkMode", themeConfig.layout.darkMode));
  }, []);

  const setDarkMode = useCallback((mode) => {
    setIsDark(mode);
    window.localStorage.setItem("darkMode", JSON.stringify(mode));
  }, []);

  return [isDark, setDarkMode];
};

export default useDarkmode;
