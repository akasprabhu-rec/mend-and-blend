import { Router } from "express";
import {
  getPublishedWorkshops,
  getWorkshopAvailability,
} from "../services/bookingService.js";

const router = Router();

router.get("/", async (req, res) => {
  res.json(await getPublishedWorkshops());
});

router.get("/:workshopId/availability", async (req, res) => {
  res.json(await getWorkshopAvailability(req.params.workshopId));
});

export default router;
