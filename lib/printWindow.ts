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
    }
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    margin: 0 auto;
    padding: 6px 4px;
    background: #ffffff;
    color: #000000;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.35;
    width: 76mm;
    max-width: 100%;
    word-break: break-word;
  }
  p { margin: 0; }
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .items-center { align-items: center; }
  .items-baseline { align-items: baseline; }
  .text-center { text-align: center; }
  .font-bold { font-weight: bold; }
  .font-semibold { font-weight: 600; }
  .font-black { font-weight: 900; }
  .text-lg { font-size: 16px; }
  .text-base { font-size: 14px; }
  .text-sm { font-size: 13px; }
  .text-xs { font-size: 11px; }
  .text-\\[11px\\] { font-size: 11px; }
  .text-\\[10px\\] { font-size: 10px; }
  .text-\\[9px\\] { font-size: 9px; }
  .leading-snug { line-height: 1.35; }
  .leading-tight { line-height: 1.25; }
  .uppercase { text-transform: uppercase; }
  .italic { font-style: italic; }
  .tracking-tight { letter-spacing: -0.025em; }
  .tracking-wider { letter-spacing: 0.05em; }
  .tracking-widest { letter-spacing: 0.1em; }
  .whitespace-pre-line { white-space: pre-line; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
  .font-mono { font-family: 'Courier New', Courier, monospace; }
  .space-y-0\\.5 > * + * { margin-top: 2px; }
  .space-y-1 > * + * { margin-top: 4px; }
  .space-y-2 > * + * { margin-top: 8px; }
  .space-y-3 > * + * { margin-top: 12px; }
  .space-y-4 > * + * { margin-top: 16px; }
  .pt-1 { padding-top: 4px; } .pt-2 { padding-top: 8px; }
  .pt-3 { padding-top: 12px; } .pt-4 { padding-top: 16px; }
  .pb-2 { padding-bottom: 8px; } .pb-3 { padding-bottom: 12px; }
  .p-2 { padding: 8px; } .p-2\\.5 { padding: 10px; } .p-4 { padding: 16px; } .p-6 { padding: 20px; }
  .px-4 { padding-left: 16px; padding-right: 16px; }
  .mt-0\\.5 { margin-top: 2px; }
  .mt-1 { margin-top: 4px; }
  .my-2 { margin-top: 8px; margin-bottom: 8px; }
  .py-1 { padding-top: 4px; padding-bottom: 4px; }
  .border { border: 1px solid; }
  .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
  .border-t { border-top-width: 1px; border-top-style: solid; }
  .border-dashed { border-style: dashed; }
  .border-dotted { border-style: dotted; }
  .border-2 { border-width: 2px; }
  .border-gray-300 { border-color: #d1d5db; }
  .border-gray-400 { border-color: #9ca3af; }
  .border-gray-800 { border-color: #1f2937; }
  .border-zinc-100 { border-color: #f4f4f5; }
  .border-zinc-200 { border-color: #e4e4e7; }
  .border-zinc-300 { border-color: #d4d4d8; }
  .border-zinc-400 { border-color: #a1a1aa; }
  .border-green-200 { border-color: #bbf7d0; }
  .border-green-600 { border-color: #16a34a; }
  .border-red-600 { border-color: #dc2626; }
  .border-blue-200 { border-color: #bfdbfe; }
  .border-rose-200 { border-color: #fecdd3; }
  .border-amber-200 { border-color: #fde68a; }
  .rounded { border-radius: 4px; } .rounded-xl { border-radius: 12px; }
  .bg-white { background: white; } .bg-gray-100 { background: #f3f4f6; }
  .bg-green-50 { background: #f0fdf4; } .bg-red-50 { background: #fef2f2; }
  .bg-zinc-50 { background: #fafafa; } .bg-amber-50 { background: #fffbeb; }
  .bg-blue-50 { background: #eff6ff; } .bg-rose-50 { background: #fff1f2; }
  .text-gray-500 { color: #6b7280; } .text-gray-600 { color: #4b5563; }
  .text-gray-700 { color: #374151; } .text-gray-800 { color: #1f2937; }
  .text-zinc-400 { color: #a1a1aa; } .text-zinc-500 { color: #71717a; }
  .text-zinc-600 { color: #52525b; } .text-zinc-700 { color: #3f3f46; }
  .text-zinc-800 { color: #27272a; } .text-zinc-900 { color: #18181b; }
  .text-green-600 { color: #16a34a; } .text-green-700 { color: #15803d; }
  .text-green-800 { color: #166534; } .text-green-900 { color: #14532d; }
  .text-red-700 { color: #b91c1c; } .text-red-900 { color: #7f1d1d; }
  .text-amber-800 { color: #92400e; } .text-blue-800 { color: #1e40af; }
  .text-rose-800 { color: #9f1239; }
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
    "</style></head><body>" +
    content +
    "</body></html>";

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close(); // <-- This triggers iframe.onload in Chrome
}
