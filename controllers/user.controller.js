import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
const SALT = 10;

export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json({ message: "Get users successfully", data: users });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get users" });
  }
};
export const getUser = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await prisma.user.findUnique({
      where: { id },
    });
    res.status(200).json({ message: "Get users successfully", data: user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get user" });
  }
};
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const tokenUserId = req.userId;
    if (id !== tokenUserId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: tokenUserId,
      },
    });

    const { newPassword, currentPassword, avatar, ...dataUpdate } = req.body;
    if (newPassword && currentPassword) {
      const isValidPassword = await bcrypt.compare(
        currentPassword.toString(),
        currentUser.password
      );

      if (!isValidPassword)
        return res
          .status(401)
          .json({ message: "Current password is not correct" });
    }
    let hashedPassword = null;
    if (newPassword)
      hashedPassword = await bcrypt.hash(newPassword.toString(), SALT);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...dataUpdate,
        ...(hashedPassword && { password: hashedPassword }),
        ...(avatar && { avatar }),
      },
    });

    const { password: userPassword, ...restData } = updatedUser;

    res.status(200).json({
      message: newPassword
        ? "The password is updated"
        : "Update user successfully",
      data: restData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to update user" });
  }
};
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const tokenUserId = req.userId;
    if (id !== tokenUserId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await prisma.user.delete({
      where: { id },
    });
    res.status(200).json({ message: "Delete user successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

export const getProfilePosts = async (req, res) => {
  const tokenUserId = req.userId;
  try {
    const userPosts = await prisma.post.findMany({
      where: { userId: tokenUserId },
    });
    const savedData = await prisma.savedPost.findMany({
      where: { userId: tokenUserId },
      include: {
        post: true,
      },
    });
    const savedPosts = savedData.map((data) => ({
      ...data.post,
      isSaved: true,
    }));

    res.status(200).json({
      message: "Get data successfully",
      data: { userPosts, savedPosts },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get profile posts" });
  }
};

export const getUserNotifications = async (req, res) => {
  const tokenUserId = req.userId;
  try {
    const newChat = await prisma.chat.count({
      where: {
        userIDs: {
          hasSome: [tokenUserId],
        },
        NOT: {
          seenBy: {
            hasSome: [tokenUserId],
          },
        },
      },
    });

    res.status(200).json({
      message: "Get data notifications successfully",
      data: { newChat },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get profile posts" });
  }
};
