import "./loadEnv.js";
import express from "express";
import cors from "cors";
import adminRouter from "./routes/admin.js";
import bookingsRouter from "./routes/bookings.js";
import healthRouter from "./routes/health.js";
import paymentsRouter from "./routes/payments.js";
import workshopsRouter from "./routes/workshops.js";
import {
  logFirebaseAdminError,
} from "./firebaseAdminDiagnostics.js";

const app = express();
const PORT = process.env.PORT || 5000;
const configuredOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = new Set(
  configuredOrigins.length > 0
    ? configuredOrigins
    : ["http://localhost:5173", "http://127.0.0.1:5173"],
);
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://127.0.0.1:5173");
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, false);
      return callback(null, allowedOrigins.has(origin));
    },
  }),
);

// The Razorpay webhook verifies its signature against the unparsed request bytes.
app.use("/api/payments", paymentsRouter);

// Lets the server read JSON sent by the frontend.
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/events", workshopsRouter);
app.use("/api/workshops", workshopsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/admin", adminRouter);

// Anything else: 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
    return res.status(error.status).json({ error: error.message });
  }
  if (
    (error.code === 9 || error.code === "9" || error.code === "failed-precondition") &&
    /requires an index/i.test(`${error.message || ""} ${error.details || ""}`)
  ) {
    console.error(
      `[Firestore] A required composite index is missing for ${req.method} ${req.path}. Deploy firestore.indexes.json.`,
    );
    return res.status(503).json({
      error:
        "Workshop sessions are temporarily unavailable because a Firestore index is not ready. Please try again shortly.",
    });
  }
  if (
    error.code === "firebase-admin/not-configured" ||
    error.code === "app/invalid-credential" ||
    error.code === "auth/invalid-credential" ||
    error.code === 7 ||
    error.code === "7" ||
    error.code === "permission-denied" ||
    error.code === "permission_denied" ||
    error.code === 14 ||
    error.code === "14" ||
    error.code === "unavailable" ||
    /Unable to detect a Project Id|Could not load the default credentials|permission denied/i.test(
      error.message || "",
    )
  ) {
    const diagnostic = logFirebaseAdminError(
      error,
      process.env.FIREBASE_PROJECT_ID?.trim(),
    );
    return res.status(503).json({
      error: diagnostic.message,
      diagnostic: diagnostic.category,
    });
  }
  console.error("API request failed:", error);
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(
    `[Firebase Admin] Project ID configured: ${Boolean(process.env.FIREBASE_PROJECT_ID?.trim())}; credential source: ${
      process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? "GOOGLE_APPLICATION_CREDENTIALS"
        : "Application Default Credentials"
    }; Firestore connectivity not checked at startup (run "npm run diagnose:firebase").`,
  );
});
