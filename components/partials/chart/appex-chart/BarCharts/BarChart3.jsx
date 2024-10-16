import dynamic from "next/dynamic";
import { useState } from "react";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import useDarkMode from "@/hooks/useDarkMode";

const BarChart3 = () => {
  const [isDark] = useDarkMode();
  const [popupData, setPopupData] = useState(null);

  // Example age group data (these should represent the total number of users in each range)
  const ageGroupData = {
    "13-18": 120,
    "19-24": 200,
    "25-34": 350,
    "35-46": 150,
    "47-65+": 80,
  };

  // Calculate the total number of users across all age ranges
  const totalUsers = Object.values(ageGroupData).reduce((a, b) => a + b, 0);

  // Calculate the percentage of users in each age range
  const percentageData = Object.values(ageGroupData).map((users) => (users / totalUsers) * 100);

  const series = [
    {
      name: "Users",
      data: percentageData, // Use the percentage data here
    },
  ];

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
      enabled: true,
      formatter: function (val) {
        return `${val.toFixed(2)}%`; // Show percentage in the chart
      },
    },
    stroke: {
      show: true,
      width: 10,
      colors: ["transparent"],
    },
    xaxis: {
      title: {
        text: "Age Ranges",
      },
      categories: Object.keys(ageGroupData), // Use the age range labels as x-axis categories
    },
    yaxis: {
      min: 0,
      max: 100, // Set the max value to 100 for percentage scale
      tickAmount: 5, // Set the number of ticks to control the gap (100 / 20 = 5, so 6 ticks)
      labels: {
        formatter: function (value) {
          return `${value.toFixed(0)}%`; // Format Y-axis labels as percentage
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return `${val.toFixed(2)}%`; // Show percentage on hover
        },
      },
    },
    grid: {
      show: true,
      borderColor: isDark ? "#334155" : "#e2e8f0",
      position: "back",
    },
    colors: ["#3388ff"], // Customize the bar color as needed
  };

  return (
    <div>
      <Chart options={options} series={series} type="bar" height="200" />

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

export default BarChart3;
