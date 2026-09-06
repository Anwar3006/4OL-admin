"use client";

import { useCallback, useEffect, useState } from "react";
import themeConfig from "@/configs/themeConfig";

import { readStoredValue } from "./stored-preference";

/** `[skin, setSkin]`. Tuple, not an array — destructuring depends on it. */
const useSkin = (): [string, (mode: string) => void] => {
  const [skin, setSkinState] = useState<string>(themeConfig.layout.skin);

  useEffect(() => {
    setSkinState(readStoredValue("skin", themeConfig.layout.skin));
  }, []);

  const setSkin = useCallback((mode: string) => {
    setSkinState(mode);
    window.localStorage.setItem("skin", JSON.stringify(mode));
  }, []);

  return [skin, setSkin];
};

export default useSkin;
