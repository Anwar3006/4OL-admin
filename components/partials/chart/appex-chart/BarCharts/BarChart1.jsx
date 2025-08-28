import dynamic from "next/dynamic";
import { useState } from "react";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import useDarkMode from "@/hooks/useDarkMode";
import { color } from "framer-motion";

const BarChart1 = ({ totalOnlineUsers = 0, males = 0, females = 0, loading = false }) => {
  const [isDark] = useDarkMode();
  const [popupData, setPopupData] = useState(null);

  // Use actual data or fallback to sample data
  const maleData = [44, 55, 57, 56, 61, 58, 63, 60, 66];
  const femaleData = [76, 85, 101, 98, 87, 105, 91, 114, 94];
  
  // Use actual gender breakdown data
  const actualMales = males || 0;
  const actualFemales = females || 0;
  const totalUsers = totalOnlineUsers || 0;

  const colors = ["#3388ff", "#e95e8d", "#0CE7FA", "#28C76F"];

  // Calculate the total for each category
  const totalData = maleData.map((value, index) => value + femaleData[index]);

  const series = [
    {
      name: "Males",
      data: [actualMales], // Use actual male online users count
    },
    {
      name: "Females",
      data: [actualFemales], // Use actual female online users count
    },
  ];

  const options = {
    chart: {
      toolbar: {
        show: false,
      },
      events: {
        dataPointSelection: (event, chartContext, config) => {
          // Trigger a popup/modal showing breakdown of data
          const selectedSeries = config.seriesIndex;
          if (selectedSeries === 0) {
            setPopupData({
              category: "Males",
              data: maleData,
              color: colors[0],
            });
          } else if (selectedSeries === 1) {
            setPopupData({
              category: "Females",
              data: femaleData,
              color: colors[1],
            });
          } else if (selectedSeries === 2) {
            setPopupData({
              category: "Total",
              data: totalData,
              color: colors[2],
            });
          }
        },
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
      width: 10,
      colors: ["transparent"],
    },
    xaxis: {
      categories: ["Males", "Females"], // show male and female categories
      labels: {
        show: false, // hide the labels on x-axis
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
        text: "",
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val;
        },
      },
    },
    grid: {
      show: true,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      position: "back",
    },
    colors: colors,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Chart options={options} series={series} type="bar" height="200" width={"95%"} />

      {/* Background overlay */}
      {popupData && <div className="fixed top-0 left-0 bg-black bg-opacity-50 w-full z-[999]" />}

      {/* Popup for displaying breakdown */}
      {popupData && (
        <div className="fixed top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded shadow-lg z-[1000]">
          <h3 className="text-sm">Breakdown for {popupData.category}</h3>
          <Chart
            options={{
              chart: {
                toolbar: {
                  show: false,
                },
              },
              plotOptions: {
                bar: {
                  horizontal: false,
                  columnWidth: "45%",
                },
              },
              xaxis: {
                categories: ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
              },
              tooltip: {
                y: {
                  formatter: function (val) {
                    return val + " units";
                  },
                },
              },
              colors: [popupData.color],
            }}
            series={[{ name: popupData.category, data: popupData.data }]}
            type="bar"
            height="150"
          />
          <button onClick={() => setPopupData(null)} className="close-button">
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default BarChart1;
