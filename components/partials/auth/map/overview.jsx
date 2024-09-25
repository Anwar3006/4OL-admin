import Dropdown from "@/components/ui/Dropdown";
import Icons from "@/components/ui/Icon";
import Switch from "@/components/ui/Switch";
import Textinput from "@/components/ui/Textinput";
import { Icon } from "@iconify/react";
import Image from "next/image";
import React, { useState } from "react";

export default function Overview() {
  const [filter, setFilter] = useState("");
  const [showBusinessPins, setShowBusinessPins] = useState(true);

  const handleFilterSelect = (value) => {
    setFilter(value);
    // Handle filter logic here based on selected value
    console.log("Selected Filter:", value);
  };

  const regionFilterItems = [
    { label: "Ads Display Order", value: "ads-display-order" },
    //   { label: 'Advertisement', value: 'advertisement' },
    //   { label: 'News', value: 'news' },
    //   { label: 'Health', value: 'health' },
    //   { label: 'Events', value: 'events' },
    //   { label: 'Auto Slide Delay (seconds)', value: 'auto-slide-delay' },
  ];

  const districtFilterItems = [
    { label: "Hospitals/ Clinics", value: "ads-display-order" },
  ];

  const facilityFilterItems = [
    { label: "Hospitals/ Clinics", value: "ads-display-order" },
    { label: "Herbal Hospitals", value: "advertisement" },
    { label: "Diagnostic Labs", value: "news" },
    { label: "Pharmacies", value: "health" },
    { label: "Wholesalers", value: "events" },
    { label: "Ambulance", value: "auto-slide-delay" },
    { label: "Homes", value: "auto-slide-delay" },
  ];

  return (
    <>
      <div className="flex lg:justify-between max-lg:flex-col max-lg:space-y-2 w-full">
        <div className="flex">
          <Dropdown
            label={
              <>
                <Icons icon={"oui:vis-map-region"} className={"mr-2"} /> Region{" "}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            wrapperClass=""
            labelClass="flex items-center  px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex left-0"
            items={regionFilterItems.map((item) => ({
              label: item.label,
              onClick: () => handleFilterSelect(item.value),
            }))}
          />

          <Dropdown
            label={
              <>
                <Icons icon={"carbon:cics-region"} className={"mr-2"} />{" "}
                District{" "}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            wrapperClass="ml-2"
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex left-0"
            items={districtFilterItems.map((item) => ({
              label: item.label,
              onClick: () => handleFilterSelect(item.value),
            }))}
          />

          <Dropdown
            label={
              <>
                <Icons icon={"heroicons-outline:user"} className={"mr-2"} />{" "}
                Facility Type{" "}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            wrapperClass="ml-2"
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex right-0"
            items={facilityFilterItems.map((item) => ({
              label: item.label,
              onClick: () => handleFilterSelect(item.value),
            }))}
          />
        </div>

        <div className="flex items-center max-sm:justify-between max-sm:w-full">
          {/* <Icons icon={'bi:search'} className={' text-[#bbbcbb] text-lg'} /> */}
          <Switch
            value={showBusinessPins}
            onChange={() => setShowBusinessPins(!showBusinessPins)}
            label="Business Pins"
            activeClass="bg-green-500"
            labelClass="-ml-2 mr-2 sm:text-sm text-xs text-gray-500 "
          />
          <Textinput type={"search"} placeholder={"Search"} className="" />
        </div>
      </div>

      {/* overview map */}
      <div className="w-full sm:mt-5 mt-2">
        <Image
          src={"/assets/images/all-img/map_overview.png"}
          alt="map overview"
          width={1200}
          height={1000}
          className="w-full object-cover"
        />
      </div>
    </>
  );
}
