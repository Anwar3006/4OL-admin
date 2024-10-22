  import dynamic from "next/dynamic";
  import { useState } from "react";
  const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
  import useDarkMode from "@/hooks/useDarkMode";

  const BarChart5 = () => {
    const [isDark] = useDarkMode();
    const [popupData, setPopupData] = useState(null);

    const maleData = [44, 55, 57, 56, 61, 58, 63, 60, 66];
    const femaleData = [76, 85, 101, 98, 87, 105, 91, 114, 94];
    const colors = ["#3388ff", "#e95e8d", "#0CE7FA", "#28C76F"];

    // Calculate the total for each category
      const totalMale = maleData.reduce((a, b) => a + b, 0);
      const totalFemale = femaleData.reduce((a, b) => a + b, 0);

    // Calculate total percentage for male and female
    const total = totalMale + totalFemale;
    const malePercentage = (totalMale / total) * 100;
    const femalePercentage = (totalFemale / total) * 100;

    const series = [
      {
        name: "Males",
        data: [malePercentage], // Total male percentage
      },
      {
        name: "Females",
        data: [femalePercentage], // Total female percentage
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
                data: [malePercentage],
                color: colors[0],
              });
            } else if (selectedSeries === 1) {
              setPopupData({
                category: "Females",
                data: [femalePercentage],
                color: colors[1],
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
        categories: ["Males", "Females"], // Show two categories: Males and Females
        labels: {
          show: false,
        },
        axisBorder: {
          show: true,
        },
        axisTicks: {
          show: true,
        },
      },
      yaxis: {
      //   title: {
      //     text: "Percentage",
      //   },
        min: 0,
        max: 100,
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
            return val.toFixed(2) + "%"; // Show percentage in tooltip
          },
        },
      },
      grid: {
        show: true,
        borderColor: isDark ? "#334155" : "#e2e8f0",
        position: "back",
      },
      colors: colors,

      responsive: [
        {
          breakpoint: 600, // For small screens (width <= 600px)
          options: {
            chart: {
              width: 290, // Set chart width for small screens
            },
          },
        },
        {
          breakpoint: 1024, // For medium screens (width <= 1024px)
          options: {
            chart: {
              width: 300, // Set chart width for medium screens
            },
          },
        },
        {
          breakpoint: 1400, // For medium screens (width <= 1024px)
          options: {
            chart: {
              width: 290, // Set chart width for medium screens
            },
          },
        },
        {
          breakpoint: 1440, // For large screens (width <= 1440px)
          options: {
            chart: {
              width: 300, // Set chart width for large screens
            },
          },
        },
      ],
    };

    return (
      <div>
        <Chart options={options} series={series} type="bar" height="200"  width={'390'}/>

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
                dataLabels: {
                  enabled: false,
                },
                xaxis: {
                  categories: ["Males", "Females"],
                },
                yaxis: {
                  min: 0,
                  max: 100,
                  tickAmount: 5, // Set the number of ticks to control the gap (100 / 20 = 5, so 6 ticks)
                  labels: {
                    formatter: function (value) {
                      return `${value.toFixed(0)}%`; // Format Y-axis labels as percentage
                    },
                  },
                },
                tooltip: {
                  y: {
                    formatter: function (val) {
                      return val.toFixed(2) + "%"; // Show percentage in popup
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

  export default BarChart5;
