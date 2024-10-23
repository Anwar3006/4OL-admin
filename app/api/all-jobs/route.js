import cron from "node-cron";
export async function GET(req, res) {
  const jobs = cron.getTasks();
  const udpate = Array.from(jobs.values()).map((j) => j.options);
  console.log('udpate', udpate);
  
  return new Response(JSON.stringify({ data: udpate }));
}
