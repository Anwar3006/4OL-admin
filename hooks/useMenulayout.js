"use client";

import { useCallback, useState } from "react";
import themeConfig from "@/configs/themeConfig";

const useMenuLayout = () => {
  const [menuType, setMenuType] = useState(themeConfig.layout.type);

  const setMenuLayout = useCallback((value) => {
    setMenuType(value);
    window.localStorage.setItem("type", JSON.stringify(value));
  }, []);

  return [menuType, setMenuLayout];
};

export default useMenuLayout;
