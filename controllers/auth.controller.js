import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { signToken } from "../utils/tokenActions.js";
const SALT = 10;

export const register = async (req, res) => {
  const { password } = req.body;

  try {
    //hash password
    const hashedPassword = await bcrypt.hash(password.toString(), SALT);

    //create a new user and save to db
    const newUser = await prisma.user.create({
      data: {
        ...req.body,
        password: hashedPassword,
      },
    });

    const payload = {
      id: newUser.id,
    };
    const token = signToken(payload);

    const { password: passwordUser, ...userInfo } = newUser;
    const AGE = 1000 * 60 * 60 * 24 * 7;
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: true,
        maxAge: AGE,
        sameSite: "None",
      })
      .status(200)
      .json({ message: "Create user successfully", data: userInfo });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Email is already used" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    //check if the user exists

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user)
      return res
        .status(404)
        .json({ message: "Email or password is not correct" });

    //check if password is correct

    const isValidPassword = await bcrypt.compare(
      password.toString(),
      user.password
    );

    if (!isValidPassword)
      return res
        .status(404)
        .json({ message: "Email or password is not correct" });

    //generate cookie token and send to the client
    const { password: userPassword, ...userInfo } = user;
    const payload = {
      id: user.id,
    };
    const token = signToken(payload);
    const AGE = 1000 * 60 * 60 * 24 * 7;
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: true,
        maxAge: AGE,
        sameSite: "None",
      })
      .status(200)
      .json({ message: "Login successfully", data: userInfo });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to login" });
  }
};
export const logout = (req, res) => {
  res.clearCookie("token").status(200).json({ message: "Logout successfully" });
};
