// import RegForm from '@/components/redesign/auth/Admin/reg-from';
import Card from '@/components/ui/Card';
import React from 'react'

export default function page() {
    return (
        <>
          <div className="loginwrapper">
            <div className="lg-inner-column">
              <div className="right-column relative w-full">
                <Card
                  title={"Register User Account"}
                  className="inner-content w-full flex flex-col bg-white dark:bg-slate-800 mt-5"
                >
                  <div className=" lg:w-[80%] w-full flex flex-col justify-center sm:p-5">
                    {/* <RegForm /> */}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </>
      );
}
