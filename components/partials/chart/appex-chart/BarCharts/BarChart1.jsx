import dynamic from "next/dynamic"; 
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import useDarkMode from "@/hooks/useDarkMode";

const BarChart1 = () => {
  const [isDark] = useDarkMode();
  
  const maleData = [44, 55, 57, 56, 61, 58, 63, 60, 66];
  const femaleData = [76, 85, 101, 98, 87, 105, 91, 114, 94];
  
  // Calculate the total for each category
  const totalData = maleData.map((value, index) => value + femaleData[index]);

  const series = [
    {
      name: "Males",
      data: maleData,
    },
    {
      name: "Females",
      data: femaleData,
    },
    {
      name: "Total",
      data: totalData,
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
      enabled: false,
    },
    stroke: {
      show: true,
      width: 10,
      colors: ["transparent"],
    },
    legend: {
      labels: {
        colors: isDark ? "#CBD5E1" : "#475569",
      },
    },
    xaxis: {
      categories: [
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
      ],
      labels: {
        style: {
          colors: isDark ? "#CBD5E1" : "#475569",
          fontFamily: "Inter",
        },
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
    colors: ["#3388ff", "#e95e8d", "#0CE7FA"],
  };

  return (
    <div>
      <Chart options={options} series={series} type="bar" height="200" />
    </div>
  );
};

export default BarChart1;
