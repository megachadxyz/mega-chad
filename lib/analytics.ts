import { Redis } from '@upstash/redis';

const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required');
    redis = new Redis({ url, token });
  }
  return redis;
}

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Track an API call. Increments per-endpoint counter and adds caller IP to unique set.
 * Uses pipeline for efficiency. All keys expire after 90 days.
 */
export async function trackApiCall(endpoint: string, ip?: string): Promise<void> {
  const r = getRedis();
  const date = today();
  const endpointKey = `analytics:${endpoint}:${date}`;
  const totalKey = `analytics:total:${date}`;
  const callersKey = `analytics:callers:${date}`;
  const endpointsSetKey = `analytics:endpoints:${date}`;

  const pipe = r.pipeline();

  // Increment endpoint-specific counter
  pipe.incr(endpointKey);
  pipe.expire(endpointKey, TTL_SECONDS);

  // Increment total counter
  pipe.incr(totalKey);
  pipe.expire(totalKey, TTL_SECONDS);

  // Track unique callers by IP
  if (ip && ip !== 'unknown') {
    pipe.sadd(callersKey, ip);
    pipe.expire(callersKey, TTL_SECONDS);
  }

  // Track which endpoints were called today (for enumeration)
  pipe.sadd(endpointsSetKey, endpoint);
  pipe.expire(endpointsSetKey, TTL_SECONDS);

  await pipe.exec();
}

/**
 * Track an MCP tool invocation separately.
 */
export async function trackMcpTool(toolName: string): Promise<void> {
  const r = getRedis();
  const date = today();
  const toolKey = `analytics:mcp:${toolName}:${date}`;
  const toolsSetKey = `analytics:mcp_tools:${date}`;

  const pipe = r.pipeline();

  pipe.incr(toolKey);
  pipe.expire(toolKey, TTL_SECONDS);

  pipe.sadd(toolsSetKey, toolName);
  pipe.expire(toolsSetKey, TTL_SECONDS);

  await pipe.exec();
}

export interface AnalyticsData {
  date: string;
  totalApiCalls: number;
  uniqueCallers: number;
  endpoints: Record<string, number>;
  mcpTools: Record<string, number>;
}

/**
 * Retrieve analytics for a given date (defaults to today).
 */
export async function getAnalytics(date?: string): Promise<AnalyticsData> {
  const r = getRedis();
  const d = date || today();

  // Get the set of endpoints and MCP tools that were active on this date
  const [totalCalls, uniqueCallers, endpoints, mcpTools] = await Promise.all([
    r.get<number>(`analytics:total:${d}`),
    r.scard(`analytics:callers:${d}`),
    r.smembers(`analytics:endpoints:${d}`),
    r.smembers(`analytics:mcp_tools:${d}`),
  ]);

  // Fetch per-endpoint counts
  const endpointCounts: Record<string, number> = {};
  if (endpoints.length > 0) {
    const pipe = r.pipeline();
    for (const ep of endpoints) {
      pipe.get<number>(`analytics:${ep}:${d}`);
    }
    const results = await pipe.exec();
    for (let i = 0; i < endpoints.length; i++) {
      endpointCounts[endpoints[i]] = (results[i] as number) || 0;
    }
  }

  // Fetch per-MCP-tool counts
  const mcpCounts: Record<string, number> = {};
  if (mcpTools.length > 0) {
    const pipe = r.pipeline();
    for (const tool of mcpTools) {
      pipe.get<number>(`analytics:mcp:${tool}:${d}`);
    }
    const results = await pipe.exec();
    for (let i = 0; i < mcpTools.length; i++) {
      mcpCounts[mcpTools[i]] = (results[i] as number) || 0;
    }
  }

  return {
    date: d,
    totalApiCalls: totalCalls || 0,
    uniqueCallers: uniqueCallers || 0,
    endpoints: endpointCounts,
    mcpTools: mcpCounts,
  };
}
