import express from "express";
import {
  updateChat,
  getChat,
  getChats,
  createChat,
  readChat,
} from "../controllers/chat.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getChats);
router.get("/:id", verifyToken, getChat);
router.post("/", verifyToken, createChat);
router.put("/read/:id", verifyToken, readChat);
router.put("/:id", verifyToken, updateChat);

export default router;
