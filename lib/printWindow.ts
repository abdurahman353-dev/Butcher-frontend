/**
 * printWindow.ts
 * Reliable thermal receipt printing using a hidden iframe.
 *
 * WHY IFRAME (not window.open):
 *  - No popup permission required
 *  - No race conditions
 *  - No CSS bleed from the main app
 *  - 80mm thermal paper via @page CSS
 *
 * KEY FIX: iframe.onload is set BEFORE writing content so we never miss the
 * load event (Chrome fires it synchronously at document.close()).
 * A 150ms paint delay inside onload ensures layout is complete before print.
 */

const PRINT_STYLES = `
  @page {
    size: 80mm auto;
    margin: 0mm;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
  }
  *, *::before, *::after {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    -webkit-text-stroke: 0.2px #000000 !important;
    text-shadow: none !important;
  }
  body {
    margin: 0 auto;
    padding: 6px 2px;
    background: #ffffff !important;
    color: #000000 !important;
    font-family: 'Consolas', 'Segoe UI', Arial, 'Courier New', Courier, monospace;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.35;
    width: 72mm;
    max-width: 100%;
    word-break: break-word;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
  }
  p { margin: 0; }
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .items-center { align-items: center; }
  .items-baseline { align-items: baseline; }
  .text-center { text-align: center; }

  /* Font Weights - High contrast for thermal paper */
  .font-normal { font-weight: 600 !important; }
  .font-medium { font-weight: 700 !important; }
  .font-semibold { font-weight: 800 !important; }
  .font-bold { font-weight: 800 !important; }
  .font-extrabold { font-weight: 900 !important; }
  .font-black { font-weight: 900 !important; }

  /* Font Sizes - Slightly larger and bolder for thermal print head */
  .text-2xl { font-size: 20px !important; font-weight: 900 !important; }
  .text-xl { font-size: 18px !important; font-weight: 900 !important; }
  .text-lg { font-size: 16px !important; font-weight: 900 !important; }
  .text-base { font-size: 14px !important; font-weight: 800 !important; }
  .text-sm { font-size: 13px !important; font-weight: 700 !important; }
  .text-xs { font-size: 12px !important; font-weight: 700 !important; }
  .text-\\[11px\\] { font-size: 11.5px !important; font-weight: 700 !important; }
  .text-\\[10px\\] { font-size: 11px !important; font-weight: 700 !important; }
  .text-\\[9px\\] { font-size: 10.5px !important; font-weight: 700 !important; }

  .leading-snug { line-height: 1.35; }
  .leading-tight { line-height: 1.25; }
  .leading-relaxed { line-height: 1.45; }
  .uppercase { text-transform: uppercase; }
  .italic { font-style: italic; }
  .tracking-tight { letter-spacing: -0.02em; }
  .tracking-wider { letter-spacing: 0.05em; }
  .tracking-widest { letter-spacing: 0.1em; }
  .whitespace-pre-line { white-space: pre-line; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
  .font-mono { font-family: 'Consolas', 'Courier New', Courier, monospace; }

  /* Spacing */
  .space-y-0\\.5 > * + * { margin-top: 3px; }
  .space-y-1 > * + * { margin-top: 4px; }
  .space-y-1\\.5 > * + * { margin-top: 6px; }
  .space-y-2 > * + * { margin-top: 8px; }
  .space-y-3 > * + * { margin-top: 12px; }
  .space-y-4 > * + * { margin-top: 16px; }
  .pt-1 { padding-top: 4px; } .pt-2 { padding-top: 8px; }
  .pt-3 { padding-top: 12px; } .pt-4 { padding-top: 16px; }
  .pb-1 { padding-bottom: 4px; } .pb-2 { padding-bottom: 8px; } .pb-3 { padding-bottom: 12px; }
  .p-2 { padding: 8px; } .p-2\\.5 { padding: 10px; } .p-4 { padding: 14px; } .p-6 { padding: 16px; }
  .px-4 { padding-left: 16px; padding-right: 16px; }
  .mt-0\\.5 { margin-top: 2px; }
  .mt-1 { margin-top: 4px; }
  .my-2 { margin-top: 8px; margin-bottom: 8px; }
  .py-1 { padding-top: 4px; padding-bottom: 4px; }

  /* Borders - All 100% pitch black, dashed/solid, never dithered */
  .border { border: 1.5px solid #000000 !important; }
  .border-b { border-bottom: 1.5px solid #000000 !important; }
  .border-t { border-top: 1.5px solid #000000 !important; }
  .border-b-2 { border-bottom: 2px solid #000000 !important; }
  .border-t-2 { border-top: 2px solid #000000 !important; }
  .border-dashed { border-style: dashed !important; }
  .border-dotted { border-style: dashed !important; }
  .border-2 { border-width: 2px !important; }

  /* Force ALL border color utilities to pure solid black */
  [class*="border-"] {
    border-color: #000000 !important;
  }

  .rounded { border-radius: 4px; } .rounded-xl { border-radius: 8px; }

  /* Backgrounds: Force transparent or white so thermal printers don't dither gray patterns */
  [class*="bg-"] {
    background-color: transparent !important;
  }
  .bg-white { background-color: #ffffff !important; }

  /* Force ALL text color utilities to solid 100% black */
  [class*="text-"] {
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
  }

  [class*="print:hidden"] { display: none !important; }
  .shrink-0 { flex-shrink: 0; }
`;

/**
 * Print the rendered HTML of a DOM element using a hidden iframe.
 * No popup permissions required.
 *
 * @param elementId  The id attribute of the element to print
 * @param title      Document title shown in the print dialog
 */
export function printElementInWindow(elementId: string, title = "Receipt"): void {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`[printWindow] Element #${elementId} not found in DOM.`);
    return;
  }

  const content = el.innerHTML;

  // Remove any existing print iframe to avoid duplicates
  const existingFrame = document.getElementById("__pos-print-frame__");
  if (existingFrame) existingFrame.remove();

  // Create a hidden iframe - give it real height so layout renders correctly
  const iframe = document.createElement("iframe");
  iframe.id = "__pos-print-frame__";
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:80mm;height:100vh;border:none;visibility:hidden;";

  // CRITICAL: Set onload BEFORE appending to DOM and writing content.
  // Chrome fires the load event synchronously at document.close(), so if
  // we set onload after writing, we will always miss it.
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return;

    // Allow browser 150ms to finish layout paint before printing
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch (e) {
        console.error("[printWindow] Print failed:", e);
      }
      // Clean up iframe after print dialog has had time to read the content
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }, 150);
  };

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error("[printWindow] Could not access iframe document.");
    iframe.remove();
    return;
  }

  // Write the receipt HTML into the iframe document
  const html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' +
    title +
    "</title><style>" +
    PRINT_STYLES +
    "</style></head><body><div class=\"space-y-3 font-bold\">" +
    content +
    "</div></body></html>";

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close(); // <-- This triggers iframe.onload in Chrome
}
