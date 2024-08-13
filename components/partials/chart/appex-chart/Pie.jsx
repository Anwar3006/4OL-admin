import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import useDarkMode from "@/hooks/useDarkMode";

const Pie = () => {
  const [isDark] = useDarkMode();
  const series = [35, 65];

  const options = {
    labels: ["Males", "Females"],
    dataLabels: {
      enabled: true,
      formatter: (val, opts) => {
        const label = opts.w.config.labels[opts.seriesIndex];
        const total = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
        const percentage = Math.round((val / total) * 100);  // Round to nearest integer
        return `${label}: ${percentage}%`;
      },
      style: {
        fontSize: '18px',
        fontFamily: 'Inter',
        fontWeight: 400,
        colors: isDark ? ["#CBD5E1"] : ['#FFFFFF'],
        // colors: ['#FFFFFF'],  
        // padding: 12,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
        },
        dataLabels: {
          offset: -40,  // Center the labels
        },
      },
    },
    colors: ["#3388ff", "#e95e8d", "#0CE7FA"],
    legend: {
      position: "bottom",
      fontSize: "16px",
      fontFamily: "Inter",
      fontWeight: 400,
      labels: {
        colors: isDark ? "#CBD5E1" : "#475569",
      },
      markers: {
        width: 6,
        height: 6,
        offsetY: -1,
        offsetX: -5,
        radius: 12,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 0,
      },
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          legend: {
            position: "bottom",
          },
          dataLabels: {
            style: {
              fontSize: "12px",
            },
          }
        },
      },
    ],
  };

  return (
    <div>
      <Chart options={options} series={series} type="pie" height="450" />
    </div>
  );
};

export default Pie;
