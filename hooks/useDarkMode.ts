"use client";

import { useCallback, useEffect, useState } from "react";
import themeConfig from "@/configs/themeConfig";

import { readStoredValue } from "./stored-preference";

/** `[isDark, setDarkMode]`. Tuple, not an array — destructuring depends on it. */
const useDarkmode = (): [boolean, (mode: boolean) => void] => {
  const [isDark, setIsDark] = useState<boolean>(themeConfig.layout.darkMode);

  useEffect(() => {
    setIsDark(readStoredValue("darkMode", themeConfig.layout.darkMode));
  }, []);

  const setDarkMode = useCallback((mode: boolean) => {
    setIsDark(mode);
    window.localStorage.setItem("darkMode", JSON.stringify(mode));
  }, []);

  return [isDark, setDarkMode];
};

export default useDarkmode;
