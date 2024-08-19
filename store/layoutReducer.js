import { createSlice } from "@reduxjs/toolkit";
import themeConfig from "@/configs/themeConfig";

const initialState = {
  isRTL: themeConfig.layout.isRTL,
  darkMode: themeConfig.layout.darkMode,
  isCollapsed: themeConfig.layout.isCollapsed,
  customizer: themeConfig.layout.customizer,
  semiDarkMode: themeConfig.layout.semiDarkMode,
  skin: themeConfig.layout.skin,
  contentWidth: themeConfig.layout.contentWidth,
  type: themeConfig.layout.type,
  menuHidden: themeConfig.layout.menu.isHidden,
  navBarType: themeConfig.layout.navBarType,
  footerType: themeConfig.layout.footerType,
  mobileMenu: themeConfig.layout.mobileMenu,
  isMonochrome: themeConfig.layout.isMonochrome,
};

export const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    handleDarkMode: (state, action) => {
      state.darkMode = action.payload;
      setLocalStorage("darkMode", action.payload);
    },
    handleSidebarCollapsed: (state, action) => {
      state.isCollapsed = action.payload;
      setLocalStorage("sidebarCollapsed", action.payload);
    },
    handleCustomizer: (state, action) => {
      state.customizer = action.payload;
    },
    handleSemiDarkMode: (state, action) => {
      state.semiDarkMode = action.payload;
      setLocalStorage("semiDarkMode", action.payload);
    },
    handleRtl: (state, action) => {
      state.isRTL = action.payload;
      setLocalStorage("direction", action.payload);
    },
    handleSkin: (state, action) => {
      state.skin = action.payload;
      setLocalStorage("skin", action.payload);
    },
    handleContentWidth: (state, action) => {
      state.contentWidth = action.payload;
    },
    handleType: (state, action) => {
      state.type = action.payload;
      setLocalStorage("type", action.payload);
    },
    handleMenuHidden: (state, action) => {
      state.menuHidden = action.payload;
    },
    handleNavBarType: (state, action) => {
      state.navBarType = action.payload;
    },
    handleFooterType: (state, action) => {
      state.footerType = action.payload;
    },
    handleMobileMenu: (state, action) => {
      state.mobileMenu = action.payload;
    },
    handleMonochrome: (state, action) => {
      state.isMonochrome = action.payload;
      setLocalStorage("monochrome", action.payload);
    },
  },
});

// Utility functions for localStorage
const setLocalStorage = (key, value) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
};

export const {
  handleDarkMode,
  handleSidebarCollapsed,
  handleCustomizer,
  handleSemiDarkMode,
  handleRtl,
  handleSkin,
  handleContentWidth,
  handleType,
  handleMenuHidden,
  handleNavBarType,
  handleFooterType,
  handleMobileMenu,
  handleMonochrome,
} = layoutSlice.actions;

export default layoutSlice.reducer;
