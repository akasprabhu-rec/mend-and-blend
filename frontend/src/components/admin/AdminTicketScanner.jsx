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
    <section className="min-w-0 rounded-[2rem] border border-rose/30 bg-white/80 p-5 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive-dark">
        Entry desk
      </p>
      <h2 className="mt-2 text-2xl font-medium">Scan a workshop ticket</h2>
      <p className="mt-2 text-sm leading-relaxed text-charcoal/75">
        Scanning checks the paid booking and redeems a valid ticket once. A second scan will be
        marked as already used.
      </p>
      {error && <p className="mt-4 text-sm text-red-800" role="alert">{error}</p>}
      <div
        id={elementId}
        className={`mt-5 max-w-full overflow-hidden rounded-2xl ${scanning ? "min-h-64" : "hidden"}`}
      />
      <button
        type="button"
        onClick={() => {
          setError("");
          setScanning((current) => !current);
        }}
        className="mt-5 rounded-full border border-charcoal/40 px-5 py-3 text-sm font-medium hover:bg-charcoal hover:text-ivory"
      >
        {scanning ? "Stop camera" : "Open camera scanner"}
      </button>
    </section>
  );
}
