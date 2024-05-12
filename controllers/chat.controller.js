import prisma from "../lib/prisma.js";

export const getChats = async (req, res) => {
  try {
    const { page, perPage } = req.query;
    const skip = (+page - 1) * +perPage;
    const tokenUserId = req.userId;

    const chats = await prisma.$transaction([
      prisma.chat.count({
        where: {
          userIDs: {
            hasSome: [tokenUserId],
          },
        },
      }),
      prisma.chat.findMany({
        where: {
          userIDs: {
            hasSome: [tokenUserId],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: skip > 0 ? skip : 0,
        take: +perPage,
      }),
    ]);

    for (const chat of chats[1]) {
      const receiverId = chat.userIDs.find((id) => id !== tokenUserId);

      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });
      chat.receiver = receiver;
    }

    res.status(200).json({
      message: "Get chats successfully",
      data: chats[1],
      total: chats[0] ?? 0,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get chats" });
  }
};

export const getChat = async (req, res) => {
  try {
    const tokenUserId = req.userId;
    const chat = await prisma.chat.findUnique({
      where: {
        id: req.params.id,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
    });
    await prisma.chat.update({
      where: {
        id: req.params.id,
      },
      data: {
        seenBy: {
          push: [tokenUserId],
        },
      },
    });

    res.status(200).json({ message: "Get chat successfully", data: chat });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get chat" });
  }
};

export const createChat = async (req, res) => {
  try {
    const receiverId = req.body.receiverId;
    const tokenUserId = req.userId;
    if (!receiverId || receiverId === tokenUserId)
      return res.status(400).json({ message: "Bad request" });
    const chat = await prisma.chat.findMany({
      where: {
        userIDs: {
          hasEvery: [tokenUserId, receiverId],
        },
      },
    });
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    });
    if (chat?.length > 0) {
      chat[0].receiver = receiver;
      return res.status(200).json({ message: "OK", data: chat[0] });
    }
    res.status(200).json({ message: "OK", data: { receiver, id: 0 } });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to create chat" });
  }
};

export const readChat = async (req, res) => {
  try {
    const tokenUserId = req.userId;
    const chat = await prisma.chat.update({
      where: {
        id: req.params.id,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
      data: {
        seenBy: {
          push: [tokenUserId],
        },
      },
    });
    res.status(200).json({ message: "OK" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to read chat" });
  }
};

export const updateChat = async (req, res) => {
  const tokenUserId = req.userId;
  const chatId = req.params.id;
  try {
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
    });
    if (!chat) return res.status(404).json({ message: "Not found this chat" });

    const isReceiver = chat.userIDs.indexOf(tokenUserId) === 1;
    let dataUpdate = {};

    if (isReceiver) {
      dataUpdate = {
        receiverHiddenFrom: new Date(),
        hiddenWithReceiver: tokenUserId,
      };
    } else {
      dataUpdate = {
        senderHiddenFrom: new Date(),
        hiddenWithSender: tokenUserId,
      };
    }

    await prisma.chat.update({
      where: {
        id: chatId,
      },
      data: dataUpdate,
    });
    res.status(200).json({ message: "Delete chat successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to delete chat" });
  }
};
