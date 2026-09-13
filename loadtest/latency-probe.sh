#!/usr/bin/env bash
#
# latency-probe.sh — where is the 310 ms actually going?
#
# The load test showed that ~99% of each request is "waiting" (time to first
# byte). That is either speed-of-light to the origin, or something on the path
# adding delay. Those have completely different answers, and you cannot tell
# them apart from the k6 summary alone.
#
# This measures each leg separately, against several regions, from wherever you
# run it. Run it in Accra.
#
#   chmod +x latency-probe.sh && ./latency-probe.sh
#
# Reads SUPABASE_URL and API_URL from the environment if set.

set -uo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://rhbbxttxnvcziyqzptqs.supabase.co}"
API_URL="${API_URL:-https://office.4ourlife.com}"

# Reference endpoints in known regions. These exist only to characterise YOUR
# link: if every one of them is slow, the bottleneck is local, not Supabase.
# All are public health/status endpoints that expect anonymous traffic.
declare -a TARGETS=(
  "your Supabase (eu-west-1 Ireland)|${SUPABASE_URL}/auth/v1/health"
  "your Vercel app (dub1 Dublin)|${API_URL}/api/user/app-config"
  "Cloudflare (anycast, nearest PoP)|https://1.1.1.1/cdn-cgi/trace"
  "AWS eu-west-1 (Ireland)|https://ec2.eu-west-1.amazonaws.com/ping"
  "AWS eu-west-3 (Paris)|https://ec2.eu-west-3.amazonaws.com/ping"
  "AWS eu-west-2 (London)|https://ec2.eu-west-2.amazonaws.com/ping"
  "AWS sa-east-1 (Sao Paulo)|https://ec2.sa-east-1.amazonaws.com/ping"
)

RUNS="${RUNS:-5}"

printf '\n%-38s %9s %9s %9s %9s\n' "target" "dns" "connect" "tls" "ttfb"
printf '%s\n' "----------------------------------------------------------------------------------"

for entry in "${TARGETS[@]}"; do
  label="${entry%%|*}"
  url="${entry##*|}"

  dns_t=0; con_t=0; tls_t=0; ttfb_t=0; ok=0

  for _ in $(seq 1 "$RUNS"); do
    # -o /dev/null   discard the body, we only want timings
    # --max-time 10  do not hang on a dead endpoint
    read -r d c t f <<<"$(curl -sS -o /dev/null --max-time 10 \
      -w '%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer}' \
      "$url" 2>/dev/null)" || continue
    [ -z "${f:-}" ] && continue
    dns_t=$(echo "$dns_t + $d" | bc -l)
    con_t=$(echo "$con_t + $c" | bc -l)
    tls_t=$(echo "$tls_t + $t" | bc -l)
    ttfb_t=$(echo "$ttfb_t + $f" | bc -l)
    ok=$((ok + 1))
  done

  if [ "$ok" -eq 0 ]; then
    printf '%-38s %9s %9s %9s %9s\n' "$label" "-" "-" "-" "unreachable"
    continue
  fi

  # curl reports cumulative times; subtract to get each leg on its own.
  ms() { echo "scale=1; $1 * 1000 / $ok" | bc -l; }
  dns=$(ms "$dns_t")
  connect=$(echo "scale=1; ($con_t - $dns_t) * 1000 / $ok" | bc -l)
  tls=$(echo "scale=1; ($tls_t - $con_t) * 1000 / $ok" | bc -l)
  ttfb=$(echo "scale=1; ($ttfb_t - $tls_t) * 1000 / $ok" | bc -l)

  printf '%-38s %8sms %8sms %8sms %8sms\n' "$label" "$dns" "$connect" "$tls" "$ttfb"
done

cat <<'EOF'

── how to read this ────────────────────────────────────────────────────────
  connect  one TCP round trip to whatever terminates the connection. For a
           CDN-fronted host that is the nearest edge, NOT the origin.
  tls      the TLS handshake, roughly one more round trip to the same place.
  ttfb     request sent -> first byte back. For a CDN-fronted host this is
           the leg from the edge to the real origin, plus server work.

  If `connect` is small (say 40 ms) but `ttfb` is large (300 ms), your link to
  the edge is fine and the cost is the edge-to-origin hop. Moving the database
  closer would help.

  If `connect` is ALSO large, your local path is the bottleneck and no database
  region will fix it.

  Compare the AWS rows against each other. They are plain regional endpoints
  with no CDN in front, so their `connect` times are a clean measurement of how
  far your packets really travel — which is what a database region change would
  actually be changing.
EOF
