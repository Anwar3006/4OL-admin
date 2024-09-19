import React from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const shapeLine1 = {
  series: [{ data: [800, 600, 1000, 800, 600, 1000, 800, 900] }],
  options: {
    chart: {
      toolbar: { autoSelected: "pan", show: false },
      sparkline: { enabled: true },
    },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#00EBFF"],
    fill: { type: "solid", opacity: [0.1] },
    xaxis: { show: false },
    yaxis: { show: false },
  },
};

const shapeLine2 = {
  series: [{ data: [800, 600, 1000, 800, 600, 1000, 800, 900] }],
  options: {
    chart: { toolbar: { show: false }, sparkline: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#FB8F65"],
    fill: { type: "solid", opacity: [0.1] },
    xaxis: { show: false },
    yaxis: { show: false },
  },
};

const shapeLine3 = {
  series: [{ data: [800, 600, 1000, 800, 600, 1000, 800, 900] }],
  options: {
    chart: { toolbar: { show: false }, sparkline: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#5743BE"],
    fill: { type: "solid", opacity: [0.1] },
    xaxis: { show: false },
    yaxis: { show: false },
  },
};

const shapeLine4 = {
  series: [{ data: [800, 600, 1000, 800, 600, 1000, 800, 900] }],
  options: {
    chart: { toolbar: { show: false }, sparkline: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#FF5A5F"],
    fill: { type: "solid", opacity: [0.1] },
    xaxis: { show: false },
    yaxis: { show: false },
  },
};

const shapeLine5 = {
  series: [{ data: [800, 600, 1000, 800, 600, 1000, 800, 900] }],
  options: {
    chart: { toolbar: { show: false }, sparkline: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#3BB143"],
    fill: { type: "solid", opacity: [0.1] },
    xaxis: { show: false },
    yaxis: { show: false },
  },
};

const shapeLine6 = {
  series: [{ data: [800, 600, 1000, 800, 600, 1000, 800, 900] }],
  options: {
    chart: { toolbar: { show: false }, sparkline: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#F39C12"],
    fill: { type: "solid", opacity: [0.1] },
    xaxis: { show: false },
    yaxis: { show: false },
  },
};

const statistics = [
  {
    name: shapeLine1,
    title: "Total Opened Advertisements",
    count: "3,564",
    bg: "bg-[#E5F9FF] dark:bg-slate-900",
    text: "text-info-500",
    icon: "heroicons:megaphone", // Updated icon for advertisements
  },
  {
    name: shapeLine2,
    title: "Total Opened News",
    count: "564",
    bg: "bg-[#FFEDE6] dark:bg-slate-900",
    text: "text-warning-500",
    icon: "heroicons:newspaper", // Updated icon for news
  },
  {
    name: shapeLine3,
    title: "Total Opened Health Tips",
    count: "1,023",
    bg: "bg-[#EAE6FF] dark:bg-slate-900",
    text: "text-[#5743BE]",
    icon: "heroicons:heart", // Updated icon for health tips
  },
  {
    name: shapeLine4,
    title: "Total Reviews",
    count: "852",
    bg: "bg-[#FFEBEB] dark:bg-slate-900",
    text: "text-[#FF5A5F]",
    icon: "heroicons:star", // Keeping star icon for reviews
  },
  {
    name: shapeLine5,
    title: "Total Views",
    count: "1,278",
    bg: "bg-[#E9FBE9] dark:bg-slate-900",
    text: "text-[#3BB143]",
    icon: "heroicons:eye", // Keeping eye icon for views
  },
  {
    name: shapeLine6,
    title: "Total Clicks",
    count: "984",
    bg: "bg-[#FFF5D7] dark:bg-slate-900",
    text: "text-[#F39C12]",
    icon: "fa6-solid:hands", // Updated icon for clicks
  },
];

const GroupChart2 = () => {
  return (
    <>
      {statistics.map((item, i) => (
        <div key={i}>
          <Card bodyClass="pt-4 pb-3 px-4">
            <div className="flex space-x-3 rtl:space-x-reverse">
              <div className="flex-none">
                <div
                  className={`${item.bg} ${item.text} h-12 w-12 rounded-full flex flex-col items-center justify-center text-2xl`}
                >
                  <Icon icon={item.icon} />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-slate-600 dark:text-slate-300 text-sm mb-1 font-medium">
                  {item.title}
                </div>
                <div className="text-slate-900 dark:text-white text-lg font-medium">
                  {item.count}
                </div>
              </div>
            </div>
            {/* <div className="ltr:ml-auto rtl:mr-auto max-w-[124px]"> */}
            <div className="text-right">
              <p className="sm:text-sm text-xs">View All</p>
              {/* <Chart
                options={item.name.options}
                series={item.name.series}
                type="area"
                height="41"
                width="124"
              /> */}
            </div>
          </Card>
        </div>
      ))}
    </>
  );
};

export default GroupChart2;
