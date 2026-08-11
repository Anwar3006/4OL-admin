"use client";

import { useCallback, useState } from "react";
import themeConfig from "@/configs/themeConfig";

const useMobileMenu = () => {
  const [mobileMenu, setMobileMenuState] = useState(themeConfig.layout.mobileMenu);

  const setMobileMenu = useCallback((value) => {
    setMobileMenuState(value);
  }, []);

  return [mobileMenu, setMobileMenu];
};

export default useMobileMenu;
