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
import Dropdown from "@/components/ui/Dropdown";
import { districts_regions } from "@/constant/ghana_regions_districts_coordinates";
import Icons from "@/components/ui/Icon";

const SendNotificationPage = () => {
  const [picker, setPicker] = useState(new Date());
  const [selectedFile, setSelectedFile] = useState(null); // Track single file
  const [preview, setPreview] = useState(""); // Track file preview
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [ageRange, setAgeRange] = useState(""); // State for age range
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [regions] = useState(districts_regions.data);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const targetGroups = ["Users", "Admin", "Facilities"];
  const ageRanges = ["All", "18-24", "25-34", "35-44", "45-54", "55+"];

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

  const handleSendNotification = () => {
    // Logic to handle sending the notification with targeting options
    const notificationData = {
      title: "Notification Title",
      description: "Notification Description",
      ageRange,
      regions,
      district,
      deviceType,
      targetGroup,
    };

    // Send the notification data
    console.log("Notification sent:", notificationData);
  };

  const handleDistrictChange = (districtName) => {
    const district = filteredDistricts.find((d) => d.name === districtName);
    if (district) {
      setSelectedDistrict(district);
    }
  };

  const handleRegionChange = (regionName) => {
    const region = regions.find((r) => r.name === regionName);
    if (region) {
      setFilteredDistricts(region.districts);
      setSelectedRegion(region);
    } else {
      setFilteredDistricts(allDistricts);
    }
  };

  return (
    <div>
      <Card title="Send Notification">
        <div className="mb-2">
          <p className="text-gray-400 text-sm">
            {" "}
            <span className="text-red-600">*</span> Push Notification will be
            send to all users with access to the selected file.
          </p>
        </div>
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
          <div className="">
            <div>
              <div className="lg:col-span-2 col-span-1">
                <Textinput
                  label="Title"
                  type="text"
                  placeholder="Enter Your Title"
                />
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
                <label htmlFor="Upload Image" className="text-sm mb-3">
                  Upload Image
                </label>
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

            <div>
              <h4 className="text-lg my-4">Targeting Options</h4>

              <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
              {/* Region and District Selection */}
              <Dropdown
                label={
                  <>
                    Select Region
                    <Icons
                      className={"text-2xl"}
                      icon={"ri:arrow-drop-down-line"}
                    />
                  </>
                }
                wrapperClass=""
                labelClass="flex justify-between items-center px-2 py-1 border border-gray-200 rounded-sm lg:text-sm text-xs"
                classMenuItems="mt-2 w-[180px] flex left-0 h-72 overflow-scroll custom-scrollbar"
                items={[
                  { onClick: () => handleRegionChange("") },
                  ...regions.map((region) => ({
                    label: region.name,
                    onClick: () => handleRegionChange(region.name),
                  })),
                ]}
                selectedItem={
                  <>
                    {selectedRegion?.name || "Region"}
                    <Icons
                      className={"text-2xl"}
                      icon={"ri:arrow-drop-down-line"}
                    />
                  </>
                } // Pass selectedRegion to display
                onSelect={handleRegionChange} // Handle region selection
              />

              <Dropdown
                label={
                  <>
                    Select District
                  </>
                }
                wrapperClass=""
                labelClass="flex justify-between items-center px-2 py-1 border border-gray-200 rounded-sm lg:text-sm text-xs"
                classMenuItems="mt-2 w-[180px] flex left-0 max-h-72 overflow-scroll custom-scrollbar"
                items={filteredDistricts.map((district) => ({
                  label: district.name,
                  onClick: () => handleDistrictChange(district.name),
                }))}
                selectedItem={
                  <>
                    {selectedDistrict?.name || "District"}
                    <Icons
                      className={"text-2xl"}
                      icon={"ri:arrow-drop-down-line"}
                    />
                  </>
                } // Pass selectedDistrict to display
                onSelect={handleDistrictChange} // Handle district selection
              />

              {/* Target Group Selection */}
              <Dropdown
                label="Target Group"
                labelClass="flex justify-between items-center px-2 py-1 border border-gray-200 rounded-sm lg:text-sm text-xs"
                classMenuItems="mt-2 flex left-0 max-h-72 overflow-scroll custom-scrollbar"
                items={targetGroups.map((group) => ({
                  label: group,
                  onClick: () => setTargetGroup(group),
                }))}
                selectedItem={
                  <>
                    {targetGroup || "Target Group"}
                    <Icons
                      className={"text-2xl"}
                      icon={"ri:arrow-drop-down-line"}
                    />
                  </>
                }
              />

              {/* Age Range Selection */}
              <Dropdown
                label="Age Range"
                labelClass="flex justify-between items-center px-2 py-1 border border-gray-200 rounded-sm lg:text-sm text-xs"
                classMenuItems="mt-2 w-[180px] flex left-0 max-h-72 overflow-scroll custom-scrollbar"
                items={ageRanges.map((range) => ({
                  label: range,
                  onClick: () => setAgeRange(range),
                }))}
                selectedItem={
                  <>
                    {ageRange || "Age Range"}
                    <Icons
                      className={"text-2xl"}
                      icon={"ri:arrow-drop-down-line"}
                    />
                  </>
                }
              />
              </div>

            </div>
          </div>

          <div className="lg:w-[50%] max-lg:flex max-lg:justify-between max-lg:items-center max-sm:flex-col max-sm:justify-start max-sm:items-start lg:ml-5">
            <div>
              <h4 className="text-lg mb-2">Notification Settings</h4>
              <Checkbox
                classLabel={"font-semibold"}
                label={
                  "Automatically send a notification when a publication is published."
                }
              />
            </div>
            <div className="mt-5 space-x-3 rtl:space-x-reverse">
              <Button
                text="Save Settings"
                className="bg-green-500 ma-lg:btn-sm text-white"
              />
            </div>
          </div>
        </div>
        <div className="mt-5 space-x-3 rtl:space-x-reverse">
          <Button
            text="Send Notification"
            className="btn-dark"
            onClick={handleSendNotification}
          />
        </div>
      </Card>
    </div>
  );
};

export default SendNotificationPage;
