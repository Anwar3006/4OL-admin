"use client";

import { useCallback, useEffect, useState } from "react";
import themeConfig from "@/configs/themeConfig";

const useSidebar = () => {
  const [collapsed, setCollapsed] = useState(themeConfig.layout.isCollapsed);

  useEffect(() => {
    const stored = window.localStorage.getItem("sidebarCollapsed");
    if (stored !== null) setCollapsed(JSON.parse(stored));
  }, []);

  const setMenuCollapsed = useCallback((value) => {
    setCollapsed(value);
    window.localStorage.setItem("sidebarCollapsed", JSON.stringify(value));
  }, []);

  return [collapsed, setMenuCollapsed];
};

export default useSidebar;
