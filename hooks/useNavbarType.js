"use client";

import { useCallback, useState } from "react";
import themeConfig from "@/configs/themeConfig";

const useNavbarType = () => {
  const [navbarType, setNavbarTypeState] = useState(themeConfig.layout.navBarType);

  const setNavbarType = useCallback((value) => {
    setNavbarTypeState(value);
  }, []);

  return [navbarType, setNavbarType];
};

export default useNavbarType;
