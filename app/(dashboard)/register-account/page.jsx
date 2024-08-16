"use client";

import React from "react";
import RegForm from "@/components/partials/auth/reg-from";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";

// image import

const Register2 = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="loginwrapper">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
            <Card
              title={"Register User Account"}
              className="inner-content w-full flex flex-col bg-white dark:bg-slate-800"
            >
              <div className=" lg:w-[80%] w-[90%] flex flex-col justify-center p-5">
                <RegForm />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register2;
