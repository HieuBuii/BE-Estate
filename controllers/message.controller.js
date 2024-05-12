import prisma from "../lib/prisma.js";

export const getMessages = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const page = +req.query.page;
    const skip = (page - 1) * 20 > 0 ? (page - 1) * 20 : 0;
    const tokenUserId = req.userId;

    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
    });

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const isReceiver = chat.createdBy !== tokenUserId;

    const messages = await prisma.$transaction([
      prisma.message.count({
        where: {
          chatId,
          createdAt: {
            gte: isReceiver ? chat.receiverHiddenFrom : chat.senderHiddenFrom,
          },
        },
      }),
      prisma.message.findMany({
        where: {
          chatId,
          createdAt: {
            gte: isReceiver ? chat.receiverHiddenFrom : chat.senderHiddenFrom,
          },
        },
        skip,
        take: 20,
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    res.status(200).json({
      message: "Get messages successfully",
      data: messages[1],
      total: messages[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get messages" });
  }
};

export const createMessage = async (req, res) => {
  try {
    const tokenUserId = req.userId;
    let chatId = req.params.chatId;
    const text = req.body.text;
    const receiverId = req.body.receiverId;
    let chat = null;
    if (chatId !== "0") {
      chat = await prisma.chat.findUnique({
        where: {
          id: chatId,
          userIDs: {
            hasSome: [tokenUserId],
          },
        },
      });

      if (!chat) return res.status(404).json({ message: "Chat not found" });
    } else {
      chat = await prisma.chat.create({
        data: {
          userIDs: [tokenUserId, receiverId],
          createdBy: tokenUserId,
        },
      });
      chatId = chat.id;
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        text,
        userId: tokenUserId,
      },
    });

    const isReceiver = chat.createdBy !== tokenUserId;

    const dataUpdate = {
      seenBy: [tokenUserId],
      lastMessage: text,
    };

    if (isReceiver) dataUpdate.hiddenWithReceiver = null;
    else dataUpdate.hiddenWithSender = null;

    const updatedChat = await prisma.chat.update({
      where: {
        id: chatId,
      },
      data: dataUpdate,
      include: {
        users: true,
      },
    });

    const chatData = {
      ...updatedChat,
      receiver: updatedChat.users.find((user) => user.id === receiverId),
    };

    delete chatData.users;

    res.status(200).json({
      message: "Create message successfully",
      data: { ...message, chat: chatData },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to create message" });
  }
};

export const updateMessage = async (req, res) => {
  const tokenUserId = req.userId;
  const messageId = req.params.id;
  const { isDeleted, text, chatId, lastMessageId } = req.body;
  try {
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
      include: {
        users: {
          where: {
            id: tokenUserId,
          },
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const message = await prisma.message.findUnique({
      where: {
        userId: tokenUserId,
        id: messageId,
      },
    });

    if (!message)
      return res.status(404).json({ message: "Cannot found message" });

    const dataUpdate = {};
    if (isDeleted) dataUpdate.isDeleted = true;
    if (text) {
      dataUpdate.text = text;
      dataUpdate.isUpdated = true;
    }

    const updatedMessage = await prisma.message.update({
      where: {
        userId: tokenUserId,
        id: messageId,
      },
      data: dataUpdate,
    });

    const dataUpdateChat = {};
    if (text && lastMessageId === messageId) {
      dataUpdateChat.lastMessage = text;
    }

    if (isDeleted && lastMessageId === messageId) {
      dataUpdateChat.lastMessage = `${chat.users[0].firstName} ${chat.users[0].lastName} unsent a message`;
    }

    const updatedChat = await prisma.chat.update({
      where: {
        id: chatId,
      },
      data: dataUpdateChat,
    });

    res.status(200).json({
      message: "Update message successfully",
      data: { ...updatedMessage, lastMessage: updatedChat.lastMessage },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to update message" });
  }
};
