import jwt from "jsonwebtoken";

export const signToken = (payload) => {
  try {
    const AGE = 1000 * 60 * 60 * 24 * 7;

    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: AGE,
    });
    return token;
  } catch (error) {
    console.log(error);
  }
};
