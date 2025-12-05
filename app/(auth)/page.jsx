"use client";
import useDarkMode from "@/hooks/useDarkMode";
import Login2 from "./login2/page";

// image import

const Login = () => {
  const [isDark] = useDarkMode();
  return (
    <>
    <Login2 />
    </>
  );
};

export default Login;
