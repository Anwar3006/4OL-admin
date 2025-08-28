import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";
import moment from "moment";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const DauChart = ({ data }) => {
  // Generate last 30 days list
  const last30Days = Array.from({ length: 30 }, (_, index) =>
    moment()
      .subtract(29 - index, "days")
      .format("YYYY-MM-DD")
  );

  // Create a dictionary to map dates to counts
  const dataMap =
    data?.reduce((acc, item) => {
      acc[item.date] = { male: item.male, female: item.female };
      return acc;
    }, {}) || {};

  // Prepare data for chart, filling missing dates with 0
  const formattedData = last30Days.map((date) => ({
    date,
    male: dataMap[date]?.male || 0,
    female: dataMap[date]?.female || 0,
  }));

  // Extract chart data
  const labels = formattedData.map((item) => item.date);
  const malesData = formattedData.map((item) => item.male);
  const femalesData = formattedData.map((item) => item.female);

  // Chart data object
  const mauData = {
    labels,
    datasets: [
      {
        label: "Males",
        data: malesData,
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        fill: true,
      },
      {
        label: "Females",
        data: femalesData,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allows dynamic sizing
    plugins: {
      legend: {
        labels: {
          font: {
            family: "Inter",
            size: 12,
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      y: {
        ticks: {
          font: {
            size: 10,
          },
        },
      },
    },
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "350px" }}>
      <Line data={mauData} options={chartOptions} />
    </div>
  );
};

export default DauChart;
