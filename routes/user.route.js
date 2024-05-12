import express from "express";
import {
  deleteUser,
  getUser,
  getUsers,
  updateUser,
  getProfilePosts,
  getUserNotifications,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", getUsers);
router.get("/search/:id", verifyToken, getUser);
router.put("/:id", verifyToken, updateUser);
router.delete("/:id", verifyToken, deleteUser);
router.get("/profilePosts", verifyToken, getProfilePosts);
router.get("/notifications", verifyToken, getUserNotifications);

export default router;
