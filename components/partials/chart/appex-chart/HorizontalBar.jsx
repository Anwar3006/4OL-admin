import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import useDarkMode from "@/hooks/useDarkMode";
import moment from "moment";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const ColumnChart = ({ data, type }) => {
  const [isDark] = useDarkMode();

  // Generate last 12 months as baseline labels with month and year
  const months = Array.from({ length: 12 }, (_, index) => ({
    monthYear: moment()
      .subtract(11 - index, "months")
      .format("MMM YYYY"),
    male: 0,
    female: 0,
    android: 0,
    ios: 0,
  }));

  // Aggregate counts for each month-year based on data type (users vs downloads)
  const aggregatedData = data?.reduce((acc, item) => {
    const monthYear = moment(item.date).format("MMM YYYY");
    if (!acc[monthYear]) {
      acc[monthYear] =
        type === "downloads" ? { android: 0, ios: 0 } : { male: 0, female: 0 };
    }
    if (type === "downloads") {
      acc[monthYear].android += item.android;
      acc[monthYear].ios += item.ios;
    } else {
      acc[monthYear].male += item.male;
      acc[monthYear].female += item.female;
    }
    return acc;
  }, {});

  // Merge aggregated data with baseline months and years
  const mergedData = months.map((monthObj) => {
    const match = aggregatedData ? aggregatedData[monthObj.monthYear] : null;
    return {
      ...monthObj,
      ...(type === "downloads"
        ? { android: match?.android || 0, ios: match?.ios || 0 }
        : { male: match?.male || 0, female: match?.female || 0 }),
    };
  });

  // Extract data series and labels based on month and year
  const series =
    type === "downloads"
      ? [
          { name: "Android", data: mergedData.map((item) => item.android) },
          { name: "iOS", data: mergedData.map((item) => item.ios) },
        ]
      : [
          { name: "Males", data: mergedData.map((item) => item.male) },
          { name: "Females", data: mergedData.map((item) => item.female) },
        ];

  const labels = mergedData.map((item) => item.monthYear);

  const options = {
    chart: {
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        endingShape: "rounded",
        columnWidth: "55%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    legend: {
      labels: {
        colors: isDark ? "#CBD5E1" : "#475569",
      },
    },
    xaxis: {
      categories: labels,
      labels: {
        style: {
          colors: isDark ? "#CBD5E1" : "#475569",
          fontFamily: "Inter",
        },
        rotateAlways: true, // Ensures proper label display if space is tight
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      title: {
        text: "Count",
      },
      labels: {
        style: {
          colors: isDark ? "#CBD5E1" : "#475569",
          fontFamily: "Inter",
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} users`,
      },
    },
    grid: {
      show: true,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      position: "back",
    },
    colors:
      type === "downloads" ? ["#00b894", "#6c5ce7"] : ["#3388ff", "#e95e8d"],
  };

  return (
    <div>
      <Chart options={options} series={series} type="bar" height="350" />
    </div>
  );
};

export default ColumnChart;
