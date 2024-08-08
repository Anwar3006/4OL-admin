"use client";
import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Repeater from "@/components/partials/froms/Repeater";
import Flatpickr from "react-flatpickr";

const SendNotificationPage = () => {
  const [picker, setPicker] = useState(new Date());
  return (
    <div>
      <Card title="Send New Notification">
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
          <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
            <div>
              <label htmlFor="default-picker" className=" form-label">
                Issued Date
              </label>

              <Flatpickr
                className="form-control py-2"
                value={picker}
                onChange={(date) => setPicker(date)}
                id="default-picker"
              />
            </div>

            <Textinput label="Title" type="text" placeholder="Enter Your Title" />
            <div className="lg:col-span-2 col-span-1">
              <Textarea
                label="Description"
                type="text"
                placeholder="Enter Your Notification Description"
                rows="2"
              />
            </div>
          </div>
        </div>
        <div className="ltr:text-right rtl:text-left space-x-3 rtl:space-x-reverse">
          <Button text="Save" className="btn-dark" />
        </div>
      </Card>
    </div>
  );
};

export default SendNotificationPage;
