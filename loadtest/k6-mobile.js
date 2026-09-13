/**
 * k6-mobile.js — ramp-to-failure load test from the perspective of a 4 Our Life
 * mobile (Expo) user.
 *
 * WHY THIS SHAPE
 * --------------
 * The Expo app talks to TWO backends, and a realistic mobile session touches
 * both in the same screen flow:
 *
 *   1. Supabase PostgREST + RPC directly (RLS-enforced, publishable key + user JWT)
 *   2. The Next.js API at EXPO_PUBLIC_API_URL (service-role, RLS bypassed)
 *
 * Testing either one alone gives a number you cannot plan against, because
 * they contend for the SAME Postgres instance and the same 60-connection cap.
 * Every iteration below therefore walks one plausible session: cold home
 * screen, a map pan, a search, a dashboard open, and a couple of profile reads.
 *
 * RUN IT FROM ACCRA, NOT FROM A CLOUD REGION. The database is in eu-west-1 and
 * your users are in Ghana; ~100-160 ms of the response time is speed of light
 * and will not appear if you run this from a datacentre next door to Ireland.
 *
 * USAGE
 *   # public/anon surface only — safe, no user records touched
 *   k6 run -e MODE=anon k6-mobile.js
 *
 *   # full authenticated session — requires `node seed-users.mjs` first
 *   k6 run -e MODE=auth k6-mobile.js
 *
 *   # override the ramp ceiling
 *   k6 run -e MODE=auth -e PEAK=400 k6-mobile.js
 *
 * ENV (read from ../.env of the mobile repo, or exported directly)
 *   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, API_URL
 *   USERS_FILE  (default ./loadtest-users.json, produced by seed-users.mjs)
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

// ── configuration ────────────────────────────────────────────────────────────

const SUPABASE_URL = __ENV.SUPABASE_URL;
const ANON_KEY     = __ENV.SUPABASE_PUBLISHABLE_KEY;
const API_URL      = __ENV.API_URL;
const MODE         = (__ENV.MODE || 'anon').toLowerCase();
const PEAK         = parseInt(__ENV.PEAK || '400', 10);

if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required');
}
if (MODE === 'auth' && !API_URL) {
  throw new Error('API_URL is required in auth mode');
}

// Pre-seeded load-test users. Loaded once per test, shared across all VUs.
const users = new SharedArray('users', function () {
  if (MODE !== 'auth') return [{ email: null, password: null }];
  return JSON.parse(open(__ENV.USERS_FILE || './loadtest-users.json'));
});

// ── custom metrics ───────────────────────────────────────────────────────────
// Split by tier, because "the p50" is meaningless when one tier is a single
// hop to Ireland and the other is two chained hops through a serverless region.

const tSupabaseRpc  = new Trend('t_supabase_rpc', true);
const tSupabaseRest = new Trend('t_supabase_rest', true);
const tNextApi      = new Trend('t_next_api', true);
const tSignIn       = new Trend('t_signin', true);

const errSupabase = new Rate('err_supabase');
const errNextApi  = new Rate('err_next_api');
const saturation  = new Counter('saturation_events'); // 5xx / 429 / timeout

// ── ramp: geometric steps, each held long enough to reach steady state ───────
// Short steps measure the ramp, not the system. Two minutes per step lets
// connection pools fill, Vercel lambdas warm, and queueing actually develop.

function buildStages(peak) {
  const steps = [10, 25, 50, 100, 200, 400, 800].filter((s) => s <= peak);
  if (steps[steps.length - 1] !== peak) steps.push(peak);
  const stages = [];
  for (const s of steps) {
    stages.push({ duration: '30s', target: s }); // ramp into the step
    stages.push({ duration: '2m', target: s });  // hold at steady state
  }
  stages.push({ duration: '30s', target: 0 });   // drain
  return stages;
}

export const options = {
  scenarios: {
    mobile_ramp: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: buildStages(PEAK),
      gracefulRampDown: '20s',
    },
  },
  // These are the SLO. When they break, you have found the knee — that is the
  // answer to "max threshold of concurrent requests", and abortOnFail stops the
  // run there instead of spending ten more minutes proving it harder.
  thresholds: {
    'http_req_failed':   [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' }],
    'http_req_duration': [{ threshold: 'p(95)<2500', abortOnFail: true, delayAbortEval: '30s' }],
    't_supabase_rpc':    ['p(50)<400', 'p(95)<1500'],
    't_supabase_rest':   ['p(50)<400', 'p(95)<1500'],
    't_next_api':        ['p(50)<800', 'p(95)<2500'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  noConnectionReuse: false, // mobile clients keep connections alive; so should we
  userAgent: '4OurLife-LoadTest/1.0 (k6)',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function sbHeaders(token) {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token || ANON_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function record(res, trend, errRate, name) {
  trend.add(res.timings.duration);
  const bad = res.status === 0 || res.status >= 400;
  errRate.add(bad);
  if (res.status === 0 || res.status >= 500 || res.status === 429) {
    saturation.add(1);
  }
  check(res, {
    [`${name} ok`]: (r) => r.status >= 200 && r.status < 400,
  });
  return res;
}

function rpc(name, body, token) {
  const res = http.post(
    `${SUPABASE_URL}/rest/v1/rpc/${name}`,
    JSON.stringify(body || {}),
    { headers: sbHeaders(token), tags: { endpoint: `rpc:${name}` } }
  );
  return record(res, tSupabaseRpc, errSupabase, `rpc:${name}`);
}

function rest(path, token) {
  const res = http.get(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: sbHeaders(token),
    tags: { endpoint: `rest:${path.split('?')[0]}` },
  });
  return record(res, tSupabaseRest, errSupabase, `rest:${path.split('?')[0]}`);
}

function api(path, token) {
  const res = http.get(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    tags: { endpoint: `api:${path}` },
  });
  return record(res, tNextApi, errNextApi, `api:${path}`);
}

// Sign in once per VU and cache the JWT for the VU's lifetime — this is what
// the real app does (session persisted in SecureStore, auto-refreshed). Signing
// in every iteration would measure GoTrue's bcrypt cost, not your read path.
let vuToken = null;

function ensureSignedIn() {
  if (MODE !== 'auth') return null;
  if (vuToken) return vuToken;

  const u = users[exec.vu.idInTest % users.length];
  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: u.email, password: u.password }),
    { headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }, tags: { endpoint: 'auth:signin' } }
  );
  tSignIn.add(res.timings.duration);

  if (res.status !== 200) {
    console.error(`sign-in failed for ${u.email}: ${res.status} ${res.body}`);
    return null;
  }
  vuToken = res.json('access_token');
  return vuToken;
}

// ── the session ──────────────────────────────────────────────────────────────
// Accra bounding box for the map call, so the query has realistic selectivity
// rather than scanning the whole country.
const ACCRA_BBOX = { minlng: -0.35, minlat: 5.47, maxlng: -0.05, maxlat: 5.70 };
const SEARCH_TERMS = ['malaria', 'headache', 'clinic', 'diabetes', 'pharmacy', 'fever'];

export default function () {
  const token = ensureSignedIn();
  if (MODE === 'auth' && !token) {
    sleep(1);
    return;
  }

  group('01 cold home screen', () => {
    rpc('get_home_carousel', {}, token);
    rpc('get_public_faqs', {}, token);
    rest('categories?select=*&limit=50', token);
  });
  sleep(1 + Math.random() * 2); // user reads the home screen

  group('02 facilities map pan', () => {
    rpc('get_facilities_map', {
      minlng: ACCRA_BBOX.minlng, minlat: ACCRA_BBOX.minlat,
      maxlng: ACCRA_BBOX.maxlng, maxlat: ACCRA_BBOX.maxlat,
      zoom_level: 12,
      p_facility_name: null, p_region: null, p_district: null,
      p_facility_type: null, p_status: null, p_is_top_rated: null,
    }, token);
  });
  sleep(0.5 + Math.random());

  group('03 search', () => {
    const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
    rpc('global_search_v2', { p_search_term: term, p_result_limit: 20 }, token);
  });
  sleep(1 + Math.random());

  group('04 browse health content', () => {
    rest('conditions?select=id,name,slug&limit=30', token);
    rest('healthy_living_info?select=id,title&limit=20', token);
    rest('symptoms?select=id,name&limit=30', token);
  });
  sleep(1 + Math.random() * 2);

  if (MODE === 'auth') {
    group('05 authenticated surface (Next.js API)', () => {
      api('/api/user/profile', token);
      api('/api/user/app-config', token);
      api('/api/user/notifications', token);
      api('/api/user/entitlement', token);
    });

    group('06 fitness dashboard', () => {
      const u = users[exec.vu.idInTest % users.length];
      if (u.id) {
        rpc('get_fitness_dashboard', { p_user_id: u.id }, token);
        rpc('get_fitcoins_dashboard', { p_user_id: u.id }, token);
      }
    });
  }

  sleep(2 + Math.random() * 3); // think time between screens
}

// ── end-of-test summary ──────────────────────────────────────────────────────

export function handleSummary(data) {
  const m = data.metrics;
  const pick = (name, stat) => (m[name] && m[name].values ? m[name].values[stat] : null);
  const fmt = (v) => (v === null || v === undefined ? 'n/a' : `${v.toFixed(1)} ms`);

  const lines = [
    '',
    '═══════════════════════════════════════════════════════════════',
    '  4 Our Life — mobile load test summary',
    '═══════════════════════════════════════════════════════════════',
    `  mode                : ${MODE}`,
    `  peak VUs configured : ${PEAK}`,
    `  iterations          : ${pick('iterations', 'count') || 0}`,
    `  requests            : ${pick('http_reqs', 'count') || 0}`,
    `  throughput          : ${(pick('http_reqs', 'rate') || 0).toFixed(1)} req/s`,
    '',
    '  ── response time by tier ──────────────────────────────────',
    `  Supabase RPC    p50 ${fmt(pick('t_supabase_rpc', 'med'))}   p95 ${fmt(pick('t_supabase_rpc', 'p(95)'))}   p99 ${fmt(pick('t_supabase_rpc', 'p(99)'))}`,
    `  Supabase REST   p50 ${fmt(pick('t_supabase_rest', 'med'))}   p95 ${fmt(pick('t_supabase_rest', 'p(95)'))}   p99 ${fmt(pick('t_supabase_rest', 'p(99)'))}`,
    `  Next.js API     p50 ${fmt(pick('t_next_api', 'med'))}   p95 ${fmt(pick('t_next_api', 'p(95)'))}   p99 ${fmt(pick('t_next_api', 'p(99)'))}`,
    `  Sign-in         p50 ${fmt(pick('t_signin', 'med'))}   p95 ${fmt(pick('t_signin', 'p(95)'))}`,
    '',
    '  ── failure ────────────────────────────────────────────────',
    `  overall error rate  : ${((pick('http_req_failed', 'rate') || 0) * 100).toFixed(2)} %`,
    `  saturation events   : ${pick('saturation_events', 'count') || 0}  (5xx / 429 / timeout)`,
    '',
    '  The knee is the LAST ramp step at which error rate stayed under 1%',
    '  and p95 under 2.5 s. Read it off the time-series, not this summary —',
    '  aggregate percentiles blend every step together and will flatter you.',
    '═══════════════════════════════════════════════════════════════',
    '',
  ];

  return {
    stdout: lines.join('\n'),
    'loadtest-summary.json': JSON.stringify(data, null, 2),
  };
}
