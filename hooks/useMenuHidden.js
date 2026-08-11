"use client";

import { useCallback, useState } from "react";
import themeConfig from "@/configs/themeConfig";

const useMenuHidden = () => {
  const [menuHidden, setMenuHiddenState] = useState(
    themeConfig.layout.menu.isHidden,
  );

  const setMenuHidden = useCallback((value) => {
    setMenuHiddenState(value);
  }, []);

  return [menuHidden, setMenuHidden];
};

export default useMenuHidden;
