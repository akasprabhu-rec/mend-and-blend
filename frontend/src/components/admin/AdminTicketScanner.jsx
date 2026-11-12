import { useEffect, useRef, useState } from "react";

export default function AdminTicketScanner({ onScan }) {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const elementId = "admin-ticket-qr-reader";

  useEffect(() => {
    if (!scanning) return undefined;
    let active = true;
    let handled = false;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!active) return;
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          async (decodedText) => {
            if (handled) return;
            handled = true;
            setScanning(false);
            try {
              await scanner.stop();
            } catch {
              setError("The camera could not be stopped cleanly. Close and reopen the scanner.");
            }
            onScan(decodedText);
          },
          () => {},
        );
        if (!active && scanner.isScanning) {
          await scanner.stop();
        }
      } catch (scanError) {
        if (active) {
          setError(
            scanError.message ||
              "Could not start the camera. Allow camera access or enter the ticket token manually.",
          );
          setScanning(false);
        }
      }
    }

    startScanner();
    return () => {
      active = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner?.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [scanning, onScan]);

  return (
    <section className="min-w-0 rounded-3xl border border-sage/45 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#21292E] dark:shadow-black/30 sm:p-8">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sage-dark dark:text-sage">
        <span className="h-px w-4 bg-terracotta" aria-hidden="true" />
        Entry desk
      </p>
      <h2 className="mt-2 text-2xl font-medium text-brand-blue dark:text-[#96B7DA]">Scan a workshop ticket</h2>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/75 dark:text-[#C5CCD1]">
        Scanning checks the paid booking and redeems a valid ticket once. A second scan will be
        marked as already used.
      </p>
      {error && (
        <p className="mt-4 rounded-xl border border-terracotta/50 bg-terracotta/10 p-3 text-sm text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]" role="alert">
          {error}
        </p>
      )}
      <div
        id={elementId}
        className={`mt-5 max-w-full overflow-hidden rounded-2xl border border-sage/35 dark:border-white/15 ${scanning ? "min-h-64" : "hidden"}`}
      />
      <button
        type="button"
        onClick={() => {
          setError("");
          setScanning((current) => !current);
        }}
        className="btn-interactive mt-5 rounded-full bg-brand-blue px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-blue-dark hover:shadow-[0_10px_22px_-8px_rgba(64,95,128,0.42)] dark:hover:bg-[#324D69]"
      >
        {scanning ? "Stop camera" : "Open camera scanner"}
      </button>
    </section>
  );
}
