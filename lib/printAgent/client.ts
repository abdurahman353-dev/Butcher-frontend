// Local Network Access support for requests to 127.0.0.1
declare global {
  interface RequestInit {
    targetAddressSpace?: "local" | "private" | "public";
  }
}

export {};

import { buildEscPosReceipt } from "@/lib/qz/receipt";

export const AGENT_HOST = "http://127.0.0.1:9100";
export const AGENT_HEALTH_PATH = `${AGENT_HOST}/health`;
export const AGENT_PAIR_PATH = `${AGENT_HOST}/v1/pair`;
export const AGENT_PRINTER_PATH = `${AGENT_HOST}/v1/printer`;
export const AGENT_STATUS_PATH = `${AGENT_HOST}/v1/status`;
export const AGENT_PRINT_PATH = `${AGENT_HOST}/v1/print`;
export const AGENT_TEST_PATH = `${AGENT_HOST}/v1/test`;

export type AgentStatus = "unknown" | "installed" | "no_default_printer" | "unavailable" | "ready" | "needPermission" | "permissionBlocked";

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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, {
      ...init,
      targetAddressSpace: (init as any)?.targetAddressSpace ?? (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost") ? "local" : undefined),
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      let detail: string | undefined;
      try {
        const data = await res.json();
        detail = (data as any)?.detail || (data as any)?.error;
      } catch {
        // ignore
      }
      const err = new Error(detail || `Request failed (${res.status})`);
      (err as any).status = res.status;
      throw err;
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkHealth(): Promise<AgentHealth> {
  return fetchJson<AgentHealth>(AGENT_HEALTH_PATH);
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
  options: { drawerKick?: boolean; title?: string } = {}
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
  options: { title?: string; widthMm?: number } = {}
): Promise<AgentJobResult> {
  const body = {
    job_type: "html" as const,
    title: options.title || "POS Slip",
    html,
    width_mm: options.widthMm ?? 80,
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

export async function detectAgentState(): Promise<{
  health?: AgentHealth;
  printer?: AgentPrinter;
  error?: string;
}> {
  let health: AgentHealth | undefined;
  try {
    health = await checkHealth();
  } catch (err: any) {
    return { error: err?.message || "Agent not reachable" };
  }
  let token = getToken();
  if (!token) {
    token = null;
  }
  let printer: AgentPrinter | undefined;
  if (token) {
    try {
      printer = await getPrinter();
    } catch (err: any) {
      if (ensureTokenClearedOn401(err)) {
        token = null;
      } else {
        return { health, error: err?.message || "Failed to query printer" };
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
}): Partial<PrintAgentState> {
  if (d.error && !d.health) {
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
