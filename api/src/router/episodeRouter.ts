import { Router } from "express";
import { createEpisode, getEpisode, updateEpisode, deleteEpisode, likeEpisode, dislikeEpisode } from "../controller/episodeController.js";
import { loginRequired } from "../utils/middleware/login.js";
import asyncWrapper from "../utils/middleware/asyncWrapper.js";

const router = Router();

router.post("/", loginRequired, asyncWrapper(createEpisode));
router.get("/:episodeId", asyncWrapper(getEpisode));
router.put("/:episodeId", loginRequired, asyncWrapper(updateEpisode));
router.delete("/:episodeId", loginRequired, asyncWrapper(deleteEpisode));

router.post("/:episodeId/like", loginRequired, asyncWrapper(likeEpisode));
router.post("/:episodeId/dislike", loginRequired, asyncWrapper(dislikeEpisode));

export default router; 