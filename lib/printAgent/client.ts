// ---------------------------------------------------------------------------
// Local / Private Network Access — type-safe RequestInit extension.
//
// Chrome 94+ sends an OPTIONS preflight with
//   Access-Control-Request-Private-Network: true
// when an HTTPS page fetches a loopback / LAN address.  The server must
// respond with  Access-Control-Allow-Private-Network: true.
// Passing `targetAddressSpace: "local"` signals Chrome that this fetch
// intentionally targets the local network.
//
// `targetAddressSpace` is not in the TypeScript DOM lib yet, so we augment
// the global RequestInit interface.  The import below makes this file an ES
// module, which is required for `declare global` augmentations to be scoped
// correctly.
import { buildEscPosReceipt } from "@/lib/qz/receipt";

declare global {
  interface RequestInit {
    targetAddressSpace?: "loopback" | "local" | "private" | "public";
  }
}

export const AGENT_HOST = "http://127.0.0.1:9100";
export const AGENT_HEALTH_PATH = `${AGENT_HOST}/health`;
export const AGENT_PAIR_PATH = `${AGENT_HOST}/v1/pair`;
export const AGENT_PRINTER_PATH = `${AGENT_HOST}/v1/printer`;
export const AGENT_STATUS_PATH = `${AGENT_HOST}/v1/status`;
export const AGENT_PRINT_PATH = `${AGENT_HOST}/v1/print`;
export const AGENT_TEST_PATH = `${AGENT_HOST}/v1/test`;

export type AgentStatus = "unknown" | "installed" | "no_default_printer" | "unavailable" | "ready" | "needPermission" | "permissionBlocked";

/** Tagged error interface used to carry HTTP status codes. */
interface HttpError extends Error {
  status?: number;
}

export interface AgentHealth {
  status?: string;
  version?: string;
}

export interface AgentPrinter {
  configured: boolean;
  name: string | null;
  status: string;
  available: boolean;
  supported?: boolean;
  queue?: { pending: number; printed: number; failed: number };
}

export interface AgentJobResult {
  job_id: number;
  status: string;
  reason?: string;
  error?: string;
  queue?: { pending: number; printed: number; failed: number };
}

export interface PrintAgentState {
  status: AgentStatus;
  agentVersion?: string;
  printer: AgentPrinter | null;
  error?: string;
  isChecking: boolean;
  isPairing: boolean;
  isPrinting: boolean;
  token: string | null;
}

const TOKEN_KEY = "pos_print_agent_token";
const SETUP_COMPLETE_KEY = "pos_print_agent_setup_complete";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function isSetupComplete(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SETUP_COMPLETE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSetupComplete(complete: boolean = true): void {
  if (typeof window === "undefined") return;
  try {
    if (complete) {
      localStorage.setItem(SETUP_COMPLETE_KEY, "true");
    } else {
      localStorage.removeItem(SETUP_COMPLETE_KEY);
    }
  } catch {
    // ignore
  }
}

export function createSetupOperationId(): string {
  return `setup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function logSetupStep(
  operationId: string,
  step: "health" | "printer" | "pair" | "print" | "complete" | "failed" | "permission" | "queued",
  details?: any
): void {
  console.log(`[PrintSetup] operation=${operationId} step=${step}`, details ?? "");
}

// Determine whether a URL is targeting loopback (127.0.0.1 / localhost).
function isLoopbackUrl(url: string): boolean {
  return url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost");
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = 8000;
  const timeout = setTimeout(() => {
    controller.abort(new DOMException("Print agent did not respond", "TimeoutError"));
  }, timeoutMs);
  try {
    const tas: RequestInit["targetAddressSpace"] =
      init?.targetAddressSpace ?? (isLoopbackUrl(url) ? "loopback" : undefined);

    const res = await fetch(url, {
      ...init,
      targetAddressSpace: tas,
      referrerPolicy: "no-referrer",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      let detail: string | undefined;
      try {
        const data: unknown = await res.json();
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          detail = (typeof d.detail === "string" ? d.detail : undefined)
            ?? (typeof d.error === "string" ? d.error : undefined);
        }
      } catch {
        // ignore parse error
      }
      const err = new Error(detail || `Request failed (${res.status})`);
      (err as HttpError).status = res.status;
      throw err;
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (err: any) {
    if (err?.name === "TimeoutError" || String(err?.message || "").includes("did not respond")) {
      const timeoutErr = new Error("Print Agent did not respond in 8 seconds. Please check if agent is running.");
      (timeoutErr as HttpError).status = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkHealth(): Promise<AgentHealth> {
  return fetchJson<AgentHealth>(AGENT_HEALTH_PATH);
}

export type LocalAccessResult =
  | { outcome: "ok"; health: AgentHealth }
  | { outcome: "blocked"; error: string }
  | { outcome: "offline"; error: string };

export async function probeLocalAccess(): Promise<LocalAccessResult> {
  console.log("[PrintAgent] Requesting local agent health");
  console.log("[PrintAgent] URL:", AGENT_HEALTH_PATH);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort(new DOMException("Print agent did not respond", "TimeoutError"));
    }, 5000);
    let res: Response;
    try {
      res = await fetch(AGENT_HEALTH_PATH, {
        method: "GET",
        targetAddressSpace: "loopback",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
    } finally {
      clearTimeout(timeout);
    }
    console.log("[PrintAgent] HTTP status:", res.status);
    if (!res.ok) {
      return { outcome: "offline", error: `HTTP ${res.status}` };
    }
    const data = await res.json() as AgentHealth;
    console.log("[PrintAgent] Response:", data);
    return { outcome: "ok", health: data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PrintAgent] Health check failed:", err);
    const isNetworkError =
      (err instanceof TypeError) ||
      (err instanceof DOMException && (err.name === "AbortError" || err.name === "TimeoutError"));
    if (isNetworkError) {
      return { outcome: "blocked", error: msg };
    }
    return { outcome: "offline", error: msg };
  }
}

export async function pairAgent(clientName = "Online Butchery POS"): Promise<string> {
  const res = await fetchJson<{ paired: boolean; token: string }>(AGENT_PAIR_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client: clientName }),
  });
  if (!res.token) {
    throw new Error("Agent did not return an authorization token");
  }
  setToken(res.token);
  return res.token;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function getPrinter(): Promise<AgentPrinter> {
  return fetchJson<AgentPrinter>(AGENT_PRINTER_PATH, {
    headers: authHeaders(),
  });
}

export async function getStatus(): Promise<any> {
  return fetchJson<any>(AGENT_STATUS_PATH, {
    headers: authHeaders(),
  });
}

function b64EncodeBytes(data: Uint8Array | ArrayBuffer | number[]): string {
  let bytes: Uint8Array;
  if (Array.isArray(data)) {
    bytes = new Uint8Array(data);
  } else if (data instanceof Uint8Array) {
    bytes = data;
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else {
    bytes = new Uint8Array();
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

export async function printEscPos(
  commands: any[],
  options: { drawerKick?: boolean; title?: string; clientRef?: string } = {}
): Promise<AgentJobResult> {
  const encoder = new TextEncoder();
  let total = 0;
  for (const c of commands) {
    if (typeof c === "string") total += encoder.encode(c).length;
    else if (c instanceof Uint8Array) total += c.length;
    else if (ArrayBuffer.isView(c)) total += c.byteLength;
    else if (c instanceof ArrayBuffer) total += c.byteLength;
  }
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const c of commands) {
    if (typeof c === "string") {
      const enc = encoder.encode(c);
      buffer.set(enc, offset);
      offset += enc.length;
    } else if (c instanceof Uint8Array) {
      buffer.set(c, offset);
      offset += c.length;
    } else if (ArrayBuffer.isView(c)) {
      buffer.set(new Uint8Array(c.buffer, c.byteOffset, c.byteLength), offset);
      offset += c.byteLength;
    } else if (c instanceof ArrayBuffer) {
      buffer.set(new Uint8Array(c), offset);
      offset += c.byteLength;
    }
  }
  const data_b64 = b64EncodeBytes(buffer);
  const body = {
    job_type: "escpos" as const,
    title: options.title || "POS Receipt",
    client_ref: options.clientRef,
    data_b64,
    drawer_kick: Boolean(options.drawerKick),
  };
  return fetchJson<AgentJobResult>(AGENT_PRINT_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
}

export async function printHtmlSlip(
  html: string,
  options: { title?: string; widthMm?: number; heightMm?: number; clientRef?: string } = {}
): Promise<AgentJobResult> {
  const body = {
    job_type: "html" as const,
    title: options.title || "POS Slip",
    client_ref: options.clientRef,
    html,
    width_mm: options.widthMm ?? 80,
    height_mm: options.heightMm,
  };
  return fetchJson<AgentJobResult>(AGENT_PRINT_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
}

export async function testPrint(): Promise<AgentJobResult> {
  return fetchJson<AgentJobResult>(AGENT_TEST_PATH, {
    method: "POST",
    headers: authHeaders(),
  });
}

export function ensureTokenClearedOn401(err: any): boolean {
  const status = (err as any)?.status ?? (err?.response?.status);
  if (status === 401) {
    clearToken();
    return true;
  }
  return false;
}

export async function detectAgentState(operationId?: string): Promise<{
  health?: AgentHealth;
  printer?: AgentPrinter;
  error?: string;
  localAccessBlocked?: boolean;
}> {
  const opId = operationId || createSetupOperationId();
  logSetupStep(opId, "health");
  let health: AgentHealth | undefined;
  try {
    health = await checkHealth();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // TypeError = "Failed to fetch" is Chrome's signal for a network/PNA block.
    // AbortError = our 5-second timeout fired (agent unresponsive or offline).
    const localAccessBlocked =
      (err instanceof TypeError) &&
      !String(msg).toLowerCase().includes("timed out");
    logSetupStep(opId, "failed", { error: msg, localAccessBlocked });
    return { error: msg, localAccessBlocked };
  }
  let token = getToken();
  if (!token) {
    token = null;
  }
  let printer: AgentPrinter | undefined;
  if (token) {
    logSetupStep(opId, "printer");
    try {
      printer = await getPrinter();
    } catch (err: unknown) {
      const typedErr = err as HttpError;
      if (ensureTokenClearedOn401(typedErr)) {
        token = null;
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        logSetupStep(opId, "failed", { error: msg });
        return { health, error: msg };
      }
    }
  }
  if (!printer && token === null) {
    return { health };
  }
  return { health, printer };
}

export function mapStateFromDetection(d: {
  health?: AgentHealth;
  printer?: AgentPrinter;
  error?: string;
  localAccessBlocked?: boolean;
}): Partial<PrintAgentState> {
  if (d.error && !d.health) {
    // Distinguish Chrome PNA / CORS blocking from the agent genuinely offline.
    // When localAccessBlocked=true the browser issued the request but Chrome
    // blocked it at the preflight stage — the agent IS running.
    if (d.localAccessBlocked) {
      return {
        status: "needPermission",
        error: undefined, // shown as an instruction, not an error
        printer: null,
        token: getToken(),
      };
    }
    return {
      status: "unavailable",
      error: d.error,
      printer: null,
      token: getToken(),
    };
  }
  const hasHealth = Boolean(d.health);
  if (!hasHealth) {
    return {
      status: "unavailable",
      printer: null,
      token: getToken(),
    };
  }
  const agentVersion = d.health?.version;
  if (!d.printer) {
    return {
      status: "installed",
      agentVersion,
      printer: null,
      token: getToken(),
    };
  }
  if (!d.printer.configured || !d.printer.available) {
    return {
      status: d.printer.configured ? "unavailable" : "no_default_printer",
      agentVersion,
      printer: d.printer,
      token: getToken(),
    };
  }
  return {
    status: "ready",
    agentVersion,
    printer: d.printer,
    token: getToken(),
  };
}

export { buildEscPosReceipt };
