import express from "express";

import { searchPodcasts, getPodcastFeed } from "../controllers/podcasts.js";

const router = express.Router();

router.get("/search", searchPodcasts);
router.get("/:id/feed", getPodcastFeed);

export default router;
