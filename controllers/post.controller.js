import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";

export const getPosts = async (req, res) => {
  const {
    city,
    type,
    property,
    bedrooms,
    bathrooms,
    minPrice,
    maxPrice,
    page,
    perPage,
  } = req.query;
  try {
    const skip = (+page - 1) * +perPage;

    const posts = await prisma.$transaction([
      prisma.post.count({
        where: {
          city,
          type,
          property,
          bedrooms: +bedrooms || undefined,
          bathrooms: +bathrooms || undefined,
          price: {
            gte: +minPrice || 0,
            lte: +maxPrice || 10000000,
          },
        },
      }),
      prisma.post.findMany({
        where: {
          city,
          type,
          property,
          bedrooms: +bedrooms || undefined,
          bathrooms: +bathrooms || undefined,
          price: {
            gte: +minPrice || 0,
            lte: +maxPrice || 10000000,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: skip > 0 ? skip : 0,
        take: +perPage,
      }),
    ]);

    let userId = null;
    const token = req.cookies.token;
    if (token)
      jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
        if (!err) {
          userId = payload.id;
        }
      });

    if (!userId)
      return res.status(200).json({
        message: "Get posts successfully",
        data: posts[1],
        total: posts[0] ?? 0,
      });

    const savedPosts = await prisma.savedPost.findMany({
      where: {
        userId,
      },
    });

    const savedPostId = savedPosts.map((savePost) => savePost.postId);

    const dataPosts = posts[1].map((post) => {
      post.isSaved = savedPostId.includes(post.id);
      return post;
    });

    res.status(200).json({
      message: "Get posts successfully",
      data: dataPosts,
      total: posts[0] ?? 0,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get posts" });
  }
};
export const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
            phoneNumber: true,
          },
        },
      },
    });

    let userId = null;
    const token = req.cookies.token;
    if (token)
      jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
        if (!err) {
          userId = payload.id;
        }
      });

    if (!userId)
      res.status(200).json({
        message: "Get post successfully",
        data: post,
      });

    const saved = await prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId,
          postId: id,
        },
      },
    });

    res.status(200).json({
      message: "Get post successfully",
      data: { ...post, isSaved: !!saved },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get posts" });
  }
};
export const createPost = async (req, res) => {
  try {
    const data = req.body;
    const tokenUserId = req.userId;
    const newPost = await prisma.post.create({
      data: {
        ...data,
        userId: tokenUserId,
      },
    });
    res
      .status(200)
      .json({ message: "Create post successfully", data: newPost });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Create post failed" });
  }
};
export const updatePost = async (req, res) => {
  try {
    const data = req.body;
    const { id } = req.params;
    const tokenUserId = req.userId;
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (post.userId !== tokenUserId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await prisma.post.update({
      where: { id },
      data,
    });

    res.status(200).json({ message: "Update post successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Update post failed" });
  }
};

export const deletePost = async (req, res) => {
  const { id } = req.params;
  const tokenUserId = req.userId;
  const deleteSavedPosts = prisma.savedPost.deleteMany({
    where: {
      postId: id,
    },
  });

  const deleteSinglePost = prisma.post.delete({
    where: {
      id,
    },
  });

  try {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (post.userId !== tokenUserId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await prisma.$transaction([deleteSavedPosts, deleteSinglePost]);

    res.status(200).json({ message: "Delete post successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Delete post failed" });
  }
};

export const savePost = async (req, res) => {
  try {
    const postId = req.body.postId;
    const tokenUserId = req.userId;

    const savedPost = await prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId: tokenUserId,
          postId,
        },
      },
    });

    if (savedPost) {
      await prisma.savedPost.delete({
        where: {
          id: savedPost.id,
        },
      });
      res.status(200).json({ message: "Unsave post successfully" });
    } else {
      await prisma.savedPost.create({
        data: {
          userId: tokenUserId,
          postId,
        },
      });
      res.status(200).json({ message: "Save post successfully" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Save post failed" });
  }
};
