import { Router } from "express";
import { Timestamp } from "firebase-admin/firestore";
import {
  getAdminRole,
  requireAdmin,
  requireFirebaseUser,
  requireSuperAdmin,
} from "../auth/firebaseAuth.js";
import { getDatabase } from "../firebaseAdmin.js";
import {
  classifyFirebaseAdminError,
  logFirebaseAdminError,
} from "../firebaseAdminDiagnostics.js";
import { INITIAL_WORKSHOPS } from "../data/workshops.js";
import { getAdminDashboard, redeemTicket } from "../services/adminService.js";
import {
  addAdministrator,
  listAdministrators,
  removeAdministrator,
  updateAdministrator,
} from "../services/adminManagementService.js";
import {
  createManagedEvent,
  deleteManagedEvent,
  duplicateManagedEvent,
  listManagedEvents,
  setEventRegistrationState,
  setEventSalesPaused,
  updateManagedEvent,
} from "../services/eventService.js";

const router = Router();

router.get("/admins", requireFirebaseUser, requireSuperAdmin, async (req, res) => {
  res.json({ admins: await listAdministrators() });
});

router.post("/admins", requireFirebaseUser, requireSuperAdmin, async (req, res) => {
  const admin = await addAdministrator({
    email: req.body?.email,
    role: req.body?.role || "event_admin",
  });
  res.status(201).json({ admin });
});

router.patch(
  "/admins/:uid",
  requireFirebaseUser,
  requireSuperAdmin,
  async (req, res) => {
    const admin = await updateAdministrator(
      req.params.uid,
      req.firebaseUser.uid,
      req.body || {},
    );
    return res.json({ admin });
  },
);

router.delete(
  "/admins/:uid",
  requireFirebaseUser,
  requireSuperAdmin,
  async (req, res) => {
    return res.json(
      await removeAdministrator(req.params.uid, req.firebaseUser.uid),
    );
  },
);

router.get("/events", requireFirebaseUser, requireAdmin, async (req, res) => {
  res.json({ events: await listManagedEvents() });
});

router.post("/events", requireFirebaseUser, requireAdmin, async (req, res) => {
  const event = await createManagedEvent(req.body, req.firebaseUser.uid);
  res.status(201).json(event);
});

router.post(
  "/events/:eventId/duplicate",
  requireFirebaseUser,
  requireAdmin,
  async (req, res) => {
    return res.status(201).json(
      await duplicateManagedEvent(req.params.eventId, req.firebaseUser.uid),
    );
  },
);

router.patch(
  "/events/:eventId",
  requireFirebaseUser,
  requireAdmin,
  async (req, res) => {
    return res.json(
      await updateManagedEvent(
        req.params.eventId,
        req.body,
        req.firebaseUser.uid,
      ),
    );
  },
);

router.patch(
  "/events/:eventId/sales",
  requireFirebaseUser,
  requireAdmin,
  async (req, res) => {
    return res.json(
      await setEventSalesPaused(req.params.eventId, req.body?.paused),
    );
  },
);

router.patch(
  "/events/:eventId/registration",
  requireFirebaseUser,
  requireAdmin,
  async (req, res) => {
    return res.json(
      await setEventRegistrationState(req.params.eventId, req.body?.action),
    );
  },
);

router.delete(
  "/events/:eventId",
  requireFirebaseUser,
  requireAdmin,
  async (req, res) => {
    return res.json(await deleteManagedEvent(req.params.eventId));
  },
);

router.get(
  "/diagnostics/firebase",
  requireFirebaseUser,
  requireAdmin,
  async (req, res) => {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    try {
      const snapshot = await getDatabase()
        .collection("workshops")
        .select("published")
        .limit(1)
        .get();
      return res.json({
        status: "ok",
        projectId,
        firestoreRead: "ok",
        documentsRead: snapshot.size,
      });
    } catch (error) {
      const diagnostic = logFirebaseAdminError(error, projectId);
      return res.status(503).json({
        error: diagnostic.message,
        diagnostic: diagnostic.category,
      });
    }
  },
);

router.get("/session", requireFirebaseUser, requireAdmin, (req, res) => {
  res.json({
    status: "ok",
    uid: req.firebaseUser.uid,
    role: getAdminRole(req.firebaseUser),
  });
});

router.get("/dashboard", requireFirebaseUser, requireAdmin, async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : "";
  res.json({
    ...(await getAdminDashboard(search)),
    adminRole: getAdminRole(req.firebaseUser),
  });
});

router.post("/tickets/redeem", requireFirebaseUser, requireAdmin, async (req, res) => {
  const qrToken = req.body?.qrToken;
  if (typeof qrToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(qrToken)) {
    return res.status(400).json({
      status: "invalid",
      message: "Scan or enter a valid ticket QR code.",
    });
  }
  return res.json(await redeemTicket(qrToken, req.firebaseUser.uid));
});

router.get("/workshops", requireFirebaseUser, requireAdmin, async (req, res) => {
  const snapshot = await getDatabase().collection("workshops").get();
  const workshops = snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
  res.json({ workshops });
});

router.post("/workshops/seed", requireFirebaseUser, requireAdmin, async (req, res) => {
  const db = getDatabase();
  const now = Timestamp.now();
  const result = await db.runTransaction(async (transaction) => {
    const references = INITIAL_WORKSHOPS.map((workshop) =>
      db.collection("workshops").doc(workshop.id),
    );
    const snapshots = await transaction.getAll(...references);
    const created = [];

    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) {
        transaction.create(references[index], {
          ...INITIAL_WORKSHOPS[index],
          createdAt: now,
          updatedAt: now,
          reservationVersion: 0,
        });
        created.push(INITIAL_WORKSHOPS[index].id);
      }
    });

    return created;
  });
  res.json({
    created: result,
    message:
      result.length === 0
        ? "The six workshop sessions already exist; their publication settings were not changed."
        : "Missing workshop sessions were initialized. December 20 sessions remain unpublished.",
  });
});

router.patch(
  "/workshops/:workshopId/publication",
  requireFirebaseUser,
  requireAdmin,
  async (req, res) => {
    if (typeof req.body?.published !== "boolean") {
      return res.status(400).json({ error: "published must be a boolean." });
    }
    const { workshopId } = req.params;
    const db = getDatabase();
    const workshopRef = db.collection("workshops").doc(workshopId);
    const updated = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(workshopRef);
      if (!snapshot.exists) return false;
      transaction.update(workshopRef, {
        published: req.body.published,
        status: req.body.published ? "published" : "unpublished",
        updatedAt: Timestamp.now(),
      });
      return true;
    });
    if (!updated) return res.status(404).json({ error: "Workshop session not found." });
    return res.json({ id: workshopId, published: req.body.published });
  },
);

export default router;
