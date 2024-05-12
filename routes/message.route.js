import express from "express";
import {
  createMessage,
  updateMessage,
  getMessages,
} from "../controllers/message.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/:chatId", verifyToken, getMessages);
router.post("/:chatId", verifyToken, createMessage);
router.put("/:id", verifyToken, updateMessage);

export default router;
