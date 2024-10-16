import dynamic from "next/dynamic";
import { useState } from "react";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import useDarkMode from "@/hooks/useDarkMode";

const BarChart6 = () => {
  const [isDark] = useDarkMode();
  const [popupData, setPopupData] = useState(null);

  const adData = [44, 55, 57, 56, 61, 58, 63, 60, 66];
  const newsData = [76, 85, 101, 98, 87, 105, 91, 114, 94];
  const healthTipsData = [76, 85, 101, 98, 87, 105, 91, 114, 94];
  const eventData = [76, 85, 101, 98, 87, 105, 91, 114, 94];

  // Colors for each category
  const colors = ["#3388ff", "#e95e8d", "#0CE7FA", "#28C76F"];

  // Calculate the total for each category
  const totalAd = adData.reduce((a, b) => a + b, 0);
  const totalNews = newsData.reduce((a, b) => a + b, 0);
  const totaltips = healthTipsData.reduce((a, b) => a + b, 0);
  const totalevent = eventData.reduce((a, b) => a + b, 0);

  const total = totalAd + totalNews + totaltips + totalevent;
  const adPer = (totalAd / total) * 100;
  const newsPer = (totalNews / total) * 100;
  const tipsPer = (totaltips / total) * 100;
  const eventPer = (totalevent / total) * 100;

  const series = [
    {
      name: "Advertisement",
      data: [adPer],
    },
    {
      name: "News",
      data: [newsPer],
    },
    {
      name: "Health Tips",
      data: [tipsPer],
    },
    {
      name: "Events",
      data: [eventPer],
    },
  ];

  const options = {
    chart: {
      toolbar: {
        show: false,
      },
      events: {
        dataPointSelection: (event, chartContext, config) => {
          const selectedSeries = config.seriesIndex;
          let popupCategory = null;
          let popupColor = null;

          // Determine which category was clicked and set the data and color
          if (selectedSeries === 0) {
            popupCategory = {
              category: "Advertisement",
              data: adData,
              color: colors[0], // Set the corresponding color
            };
          } else if (selectedSeries === 1) {
            popupCategory = {
              category: "News",
              data: newsData,
              color: colors[1],
            };
          } else if (selectedSeries === 2) {
            popupCategory = {
              category: "HealthTips",
              data: healthTipsData,
              color: colors[2],
            };
          } else if (selectedSeries === 3) {
            popupCategory = {
              category: "Events",
              data: eventData,
              color: colors[3],
            };
          }

          setPopupData(popupCategory);
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
      categories: ["Advertisement", "News", "Healthy Tips", "Events"],
      labels: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        formatter: function (value) {
          return `${value.toFixed(0)}%`;
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val.toFixed(2) + "%";
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
                categories: ["Total"],
              },
              colors: [popupData.color], // Set the color of the popup chart based on the clicked category
              tooltip: {
                y: {
                  formatter: function (val) {
                    return val + " units";
                  },
                },
              },
            }}
            series={[{ name: popupData.category, data: [popupData.data.reduce((a, b) => a + b, 0)] }]}
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

export default BarChart6;
