import dynamic from "next/dynamic";
import { useState } from "react";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import useDarkMode from "@/hooks/useDarkMode";
import { color } from "framer-motion";

const BarChart4 = ({ 
  health = 0, 
  ads = 0, 
  event = 0, 
  news = 0, 
  marketing = 0, 
  loading = false 
}) => {
  const [isDark] = useDarkMode();
  const [popupData, setPopupData] = useState(null);

  // Use actual banner type data
  const healthCount = health || 0;
  const adsCount = ads || 0;
  const eventCount = event || 0;
  const newsCount = news || 0;
  const marketingCount = marketing || 0;

  const colors = ["#3388ff", "#e95e8d", "#0CE7FA", "#28C76F"];

  const series = [
    {
      name: "Health",
      data: [healthCount], // Use actual health count
    },
    {
      name: "Ads",
      data: [adsCount], // Use actual ads count
    },
    {
      name: "Event",
      data: [eventCount], // Use actual event count
    },
    {
      name: "News",
      data: [newsCount], // Use actual news count
    },
    {
      name: "Marketing",
      data: [marketingCount], // Use actual marketing count
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
              category: "Advertisement",
              data: adData,
              color: colors[0],
            });
          } else if (selectedSeries === 1) {
            setPopupData({
              category: "News",
              data: newsData,
              color: colors[1],
            });
          } else if (selectedSeries === 2) {
            setPopupData({
              category: "HealthTips",
              data: healthTipsData,
              color: colors[2],
            });
          } else if (selectedSeries === 3) {
            setPopupData({
              category: "Events",
              data: eventData,
              color: colors[3],
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
      categories: ["Health", "Ads", "Event", "News", "Marketing"], // show all banner type categories
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
    <div className="w-full">
      <Chart options={options} series={series} type="bar" height="200" width="100%" />

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

export default BarChart4;
