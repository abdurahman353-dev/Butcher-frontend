/**
 * printService.ts
 * QZ Tray silent thermal printing service.
 * Connects to local QZ Tray WebSocket, discovers printers, and sends direct print jobs
 * signed via Laravel API endpoints with zero browser dialogs.
 */

import qz from "qz-tray";

const STORAGE_KEY_PRINTER = "pos_receipt_printer";

const getApiBaseUrl = (): string => {
  if (typeof window === "undefined") return "";
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (base && base.trim().length > 0) {
    return base.replace(/\/+$/, "");
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && apiUrl.trim().length > 0) {
    return apiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  }
  return "http://127.0.0.1:8000";
};

let isSecurityConfigured = false;

/**
 * Configure QZ Tray security with Laravel certificate & SHA512 signature endpoints.
 */
function setupSecurity(): void {
  if (isSecurityConfigured || typeof window === "undefined") return;

  const apiBase = getApiBaseUrl();

  // 1. Certificate Promise (public cert)
  qz.security.setCertificatePromise((resolve: (cert: string) => void, reject: (err: any) => void) => {
    fetch(`${apiBase}/api/qz/certificate`)
      .then((res) => {
        if (!res.ok) throw new Error(`Certificate fetch failed (${res.status} ${res.statusText})`);
        return res.text();
      })
      .then((cert) => resolve(cert))
      .catch((err) => {
        console.warn("[QZ Tray] Could not load certificate from Laravel. Unsigned mode may prompt warning.", err);
        reject(err);
      });
  });

  // 2. Signature Algorithm (SHA512)
  qz.security.setSignatureAlgorithm("SHA512");

  // 3. Signature Promise (calls Laravel /api/qz/sign to sign payload with private key)
  qz.security.setSignaturePromise((toSign: string) => {
    return (resolve: (sig: string) => void, reject: (err: any) => void) => {
      fetch(`${apiBase}/api/qz/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/plain",
        },
        body: JSON.stringify({ request: toSign }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Signature failed (${res.status} ${res.statusText})`);
          return res.text();
        })
        .then((signature) => resolve(signature.trim()))
        .catch((err) => {
          console.error("[QZ Tray] Signing error:", err);
          reject(err);
        });
    };
  });

  isSecurityConfigured = true;
}

export interface QzConnectionStatus {
  isConnected: boolean;
  version?: string;
  error?: string;
}

export const printService = {
  /**
   * Check if QZ Tray WebSocket is actively connected.
   */
  isConnected(): boolean {
    if (typeof window === "undefined") return false;
    try {
      return qz.websocket.isActive();
    } catch {
      return false;
    }
  },

  /**
   * Connect to QZ Tray WebSocket daemon running on cashier PC.
   */
  async connect(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    setupSecurity();

    if (this.isConnected()) return true;

    try {
      await qz.websocket.connect({
        retries: 2,
        delay: 1,
      });
      return true;
    } catch (err: any) {
      console.error("[QZ Tray] Failed to connect to QZ Tray on localhost:", err);
      throw new Error(
        "Could not connect to QZ Tray. Please ensure QZ Tray is installed and running on this computer."
      );
    }
  },

  /**
   * Disconnect from QZ Tray.
   */
  async disconnect(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      if (this.isConnected()) {
        await qz.websocket.disconnect();
      }
    } catch (err) {
      console.warn("[QZ Tray] Disconnect error:", err);
    }
  },

  /**
   * Get list of all installed printers on the host machine.
   */
  async getPrinters(): Promise<string[]> {
    await this.connect();
    const result = await qz.printers.find();
    if (!result) return [];
    return Array.isArray(result) ? result : [result];
  },

  /**
   * Get the system default printer.
   */
  async getDefaultPrinter(): Promise<string> {
    await this.connect();
    return await qz.printers.getDefault();
  },

  /**
   * Find printer matching given name or return default printer.
   */
  async findPrinter(name?: string): Promise<string> {
    await this.connect();
    if (!name || !name.trim()) {
      return await this.getDefaultPrinter();
    }
    return await qz.printers.find(name.trim());
  },

  /**
   * Get saved receipt printer from localStorage.
   */
  getSavedPrinter(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY_PRINTER);
  },

  /**
   * Save designated receipt printer in localStorage.
   */
  savePrinter(printerName: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_PRINTER, printerName.trim());
  },

  /**
   * Clear saved printer from localStorage.
   */
  clearSavedPrinter(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY_PRINTER);
  },

  /**
   * Direct print RAW ESC/POS data to thermal printer with NO dialog.
   */
  async printRaw(printerName: string, data: any[], options: { openCashDrawer?: boolean } = {}): Promise<void> {
    await this.connect();
    const targetPrinter = await this.findPrinter(printerName);

    const config = qz.configs.create(targetPrinter, {
      encoding: "UTF-8",
      copies: 1,
    });

    const printPayload: any[] = [...data];

    // Optional kick cash drawer command (ESC p 0 25 250)
    if (options.openCashDrawer) {
      printPayload.unshift("\x1B\x70\x00\x19\xFA");
    }

    await qz.print(config, printPayload);
  },

  /**
   * Direct print HTML content to thermal receipt printer (pixel-perfect with silent execution).
   */
  async printHtml(printerName: string, htmlContent: string, widthMm: number = 80): Promise<void> {
    await this.connect();
    const targetPrinter = await this.findPrinter(printerName);

    const config = qz.configs.create(targetPrinter, {
      rasterize: true,
      size: { width: widthMm },
      units: "mm",
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      colorType: "grayscale",
    });

    const data = [
      {
        type: "pixel",
        format: "html",
        flavor: "plain",
        data: htmlContent,
      },
    ];

    await qz.print(config, data);
  },

  /**
   * Print a test slip to verify connection and printer setup.
   */
  async printTestSlip(printerName: string): Promise<void> {
    const divider = "------------------------------------------\n";
    const now = new Date().toLocaleString();

    const escposData = [
      "\x1B\x40", // Initialize printer
      "\x1B\x61\x01", // Center align
      "\x1B\x45\x01", // Bold ON
      "QZ TRAY TEST RECEIPT\n",
      "\x1B\x45\x00", // Bold OFF
      "SILENT PRINTING ACTIVE\n",
      divider,
      "\x1B\x61\x00", // Left align
      `Printer: ${printerName}\n`,
      `Date/Time: ${now}\n`,
      `Status: Connection OK\n`,
      divider,
      "\x1B\x61\x01", // Center align
      "*** Antigravity POS System ***\n\n\n\n",
      "\x1D\x56\x41\x03", // Cut paper (feed 3 lines then cut)
    ];

    await this.printRaw(printerName, escposData);
  },
};

export default printService;
