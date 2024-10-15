"use client";
import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Repeater from "@/components/partials/froms/Repeater";
import Flatpickr from "react-flatpickr";
import Fileinput from "@/components/ui/Fileinput";
import Checkbox from "@/components/ui/Checkbox";

const SendNotificationPage = () => {
  const [picker, setPicker] = useState(new Date());
  const [selectedFile, setSelectedFile] = useState(null); // Track single file
  const [preview, setPreview] = useState(""); // Track file preview
  const [selectedFiles, setSelectedFiles] = useState([]); 

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      if (files.length === 1) {
        // Handle single file
        setSelectedFile(files[0]);
        setPreview(URL.createObjectURL(files[0]));
      } else {
        // Handle multiple files
        setSelectedFiles([...files]);
        setPreview(null); // Clear preview for single file case
      }
    }
  };
  return (
    <div>
      <Card title="Send Notification">
      <div className="mb-2">      
          <p className="text-gray-400 text-sm"> <span className="text-red-600">*</span> Push Notification will be send to all users with access to the selected file.</p>
          </div>
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
          <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
            {/* <div>
              <label htmlFor="default-picker" className=" form-label">
                Issued Date
              </label>

              <Flatpickr
                className="form-control py-2"
                value={picker}
                onChange={(date) => setPicker(date)}
                id="default-picker"
              />
            </div> */}

<div className="lg:col-span-2 col-span-1">
            <Textinput label="Title" type="text" placeholder="Enter Your Title" />
</div>
            <div className="lg:col-span-2 col-span-1">
              <Textarea
                label="Description"
                type="text"
                placeholder="Enter Your Notification Description"
                rows="2"
              />
            </div>

            <div className="lg:col-span-2 col-span-1">
              <label htmlFor="Upload Image" className="text-sm mb-3">Upload Image</label>
            <Fileinput
              name="upload_image"
              label="Upload Image"
              onChange={handleFileChange}
              selectedFile={selectedFile}
              multiple={false}
              mediaType="image" 
              className="mt-2"
            />
            {selectedFile && (
              <div className="mt-2">
                <img
                  src={preview}
                  alt="Selected File"
                  className="w-24  object-top object-cover rounded-lg"
                />
              </div>
            )}
            </div>
          </div>

          <div className="lg:w-[50%] max-lg:flex max-lg:justify-between max-lg:items-center max-sm:flex-col max-sm:justify-start max-sm:items-start lg:ml-5">
            <div>
            <h4 className="text-lg mb-2">Notification Settings</h4>
            <Checkbox classLabel={'font-semibold'} label={'Automatically send a notification when a publication is published.'} />
            </div>
            <div className="mt-5 space-x-3 rtl:space-x-reverse">
          <Button text="Save Settings" className="bg-green-500 ma-lg:btn-sm text-white" />
        </div>
          </div>
        </div>
        <div className="mt-5 space-x-3 rtl:space-x-reverse">
          <Button text="Send Notification" className="btn-dark" />
        </div>
      </Card>
    </div>
  );
};

export default SendNotificationPage;
