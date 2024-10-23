import cron from "node-cron";
export async function POST(req, res) {
  const jobs = cron.getTasks();
  // Convert Map to an array and find the specific job by ID
  const job = Array.from(jobs.values()).find(
    (j) => j.options.name === "new id assign"
  );
  if (job) {
    job.stop();
    console.log(`Stopped job with ID`);
  } else {
    console.log(`No cron job found with ID`);
  }
}
