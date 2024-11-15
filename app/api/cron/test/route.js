export const dynamic = "force-dynamic";
export async function GET(req, res) {
  console.log("running cron job every minute updated =>>>");
  return new Response(JSON.stringify({ message: "Hello Cron" }));
}
