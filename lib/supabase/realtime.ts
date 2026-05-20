import type { SupabaseClientOptions } from "@supabase/supabase-js";

type RealtimeOptions = Pick<SupabaseClientOptions<"public">, "realtime">;
type RealtimeTransport = NonNullable<SupabaseClientOptions<"public">["realtime"]>["transport"];

let cached: RealtimeOptions | undefined;

export async function getSupabaseRuntimeOptions(): Promise<RealtimeOptions> {
  if (cached) return cached;

  if (typeof WebSocket !== "undefined") {
    cached = {};
    return cached;
  }

  const { default: WebSocketTransport } = await import("ws");

  cached = {
    realtime: {
      transport: WebSocketTransport as RealtimeTransport,
    },
  };
  return cached;
}
