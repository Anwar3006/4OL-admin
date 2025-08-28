import React from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const shapeLine1 = {
  series: [
    {
      data: [800, 600, 1000, 800, 600, 1000, 800, 900],
    },
  ],
  options: {
    chart: {
      toolbar: {
        autoSelected: "pan",
        show: false,
      },
      offsetX: 0,
      offsetY: 0,
      zoom: {
        enabled: false,
      },
      sparkline: {
        enabled: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    colors: ["#00EBFF"],
    tooltip: {
      theme: "light",
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        return '<div class="custom-tooltip">' +
               '<div class="tooltip-title">Total Users</div>' +
               '<div class="tooltip-value">' + (w.globals.series[seriesIndex][dataPointIndex] || 0) + '</div>' +
               '</div>';
      }
    },
    grid: {
      show: false,
      padding: {
        left: 0,
        right: 0,
      },
    },
    yaxis: {
      show: false,
    },
    fill: {
      type: "solid",
      opacity: [0.1],
    },
    legend: {
      show: false,
    },
    xaxis: {
      low: 0,
      offsetX: 0,
      offsetY: 0,
      show: false,
      labels: {
        low: 0,
        offsetX: 0,
        show: false,
      },
      axisBorder: {
        low: 0,
        offsetX: 0,
        show: false,
      },
    },
  },
};
const shapeLine2 = {
  series: [
    {
      data: [800, 600, 1000, 800, 600, 1000, 800, 900],
    },
  ],
  options: {
    chart: {
      toolbar: {
        autoSelected: "pan",
        show: false,
      },
      offsetX: 0,
      offsetY: 0,
      zoom: {
        enabled: false,
      },
      sparkline: {
        enabled: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    colors: ["#FB8F65"],
    tooltip: {
      theme: "light",
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        return '<div class="custom-tooltip">' +
               '<div class="tooltip-title">Total Facilities</div>' +
               '<div class="tooltip-value">' + (w.globals.series[seriesIndex][dataPointIndex] || 0) + '</div>' +
               '</div>';
      }
    },
    grid: {
      show: false,
      padding: {
        left: 0,
        right: 0,
      },
    },
    yaxis: {
      show: false,
    },
    fill: {
      type: "solid",
      opacity: [0.1],
    },
    legend: {
      show: false,
    },
    xaxis: {
      low: 0,
      offsetX: 0,
      offsetY: 0,
      show: false,
      labels: {
        low: 0,
        offsetX: 0,
        show: false,
      },
      axisBorder: {
        low: 0,
        offsetX: 0,
        show: false,
      },
    },
  },
};
const shapeLine3 = {
  series: [
    {
      data: [800, 600, 1000, 800, 600, 1000, 800, 900],
    },
  ],
  options: {
    chart: {
      toolbar: {
        autoSelected: "pan",
        show: false,
      },
      offsetX: 0,
      offsetY: 0,
      zoom: {
        enabled: false,
      },
      sparkline: {
        enabled: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    colors: ["#56ce84"],
    tooltip: {
      theme: "light",
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        return '<div class="custom-tooltip">' +
               '<div class="tooltip-title">Total Downloads</div>' +
               '<div class="tooltip-value">' + (w.globals.series[seriesIndex][dataPointIndex] || 0) + '</div>' +
               '</div>';
      }
    },
    grid: {
      show: false,
      padding: {
        left: 0,
        right: 0,
      },
    },
    yaxis: {
      show: false,
    },
    fill: {
      type: "solid",
      opacity: [0.1],
    },
    legend: {
      show: false,
    },
    xaxis: {
      low: 0,
      offsetX: 0,
      offsetY: 0,
      show: false,
      labels: {
        low: 0,
        offsetX: 0,
        show: false,
      },
      axisBorder: {
        low: 0,
        offsetX: 0,
        show: false,
      },
    },
  },
};
const shapeLine4 = {
  series: [
    {
      data: [800, 600, 1000, 800, 600, 1000, 800, 900],
    },
  ],
  options: {
    chart: {
      toolbar: {
        autoSelected: "pan",
        show: false,
      },
      offsetX: 0,
      offsetY: 0,
      zoom: {
        enabled: false,
      },
      sparkline: {
        enabled: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    colors: ["#5743BE"],
    tooltip: {
      theme: "light",
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        return '<div class="custom-tooltip">' +
               '<div class="tooltip-title">Total Facility Visits</div>' +
               '<div class="tooltip-value">' + (w.globals.series[seriesIndex][dataPointIndex] || 0) + '</div>' +
               '</div>';
      }
    },
    grid: {
      show: false,
      padding: {
        left: 0,
        right: 0,
      },
    },
    yaxis: {
      show: false,
    },
    fill: {
      type: "solid",
      opacity: [0.1],
    },
    legend: {
      show: false,
    },
    xaxis: {
      low: 0,
      offsetX: 0,
      offsetY: 0,
      show: false,
      labels: {
        low: 0,
        offsetX: 0,
        show: false,
      },
      axisBorder: {
        low: 0,
        offsetX: 0,
        show: false,
      },
    },
  },
};

const GroupChart1 = ({
  totalDownloads,
  totalUsers,
  totalFacilities,
  totalSpecialists,
  loadingTotalDownloads,
  loadingTotalUsers,
  loadingTotalFacilities,
  loadingTotalSpecialists,
}) => {
  const statistics = [
    {
      name: shapeLine3,
      title: "Total Downloads",
      count: totalDownloads ?? "0",
      bg: "bg-[#c7f2d7] dark:bg-slate-900	",
      loading: loadingTotalDownloads ? true : false,
    },
    {
      name: shapeLine1,
      title: "Total Users",
      count: totalUsers ?? "0",
      bg: "bg-[#E5F9FF] dark:bg-slate-900	",
      loading: loadingTotalUsers ? true : false,
    },
    {
      name: shapeLine2,
      title: "Total Facilities",
      count: totalFacilities ?? "0",
      bg: "bg-[#FFEDE5] dark:bg-slate-900	",
      loading: loadingTotalFacilities ? true : false,
    },
    {
      name: shapeLine3,
      title: "Total Specialists",
      count: totalSpecialists ?? "0",
      bg: "bg-[#c7f2d7] dark:bg-slate-900	",
      loading: loadingTotalSpecialists ? true : false,
    },
  ];

  // Function to create chart options with custom tooltip
  const createChartOptions = (chartConfig, title, count) => {
    return {
      ...chartConfig.options,
      tooltip: {
        ...chartConfig.options.tooltip,
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          return '<div class=" bg-white dark:bg-slate-900 rounded-md shadow-md">' +
                 '<div class="p-1 text-slate-900 bg-slate-200 dark:text-white text-sm font-medium">' + title + '</div>' +
                 '<div class="p-1 text-slate-900 dark:text-white text-sm font-medium">' + count + '</div>' +
                 '</div>';
        }
      }
    };
  };

  return (
    <>
      {statistics.map((item, i) => (
        <div className={`py-[18px] px-4 rounded-[6px] ${item.bg}`} key={i}>
          <div className="flex items-center space-x-6 rtl:space-x-reverse flex-wrap justify-center">
            <div className="flex-none">
              <Chart
                options={createChartOptions(item.name, item.title, item.count)}
                series={item.name.series}
                type="area"
                height={48}
                width={48}
              />
            </div>
            <div className="flex-1 my-1  text-center">
              <div className="text-slate-600 dark:text-slate-300 text-sm mb-1 font-medium">
                {item.title}
              </div>
              <div className="text-slate-900 text-2xl dark:text-white font-medium">
                {item?.loading ? "..." : item.count}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default GroupChart1;
