import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.userId = payload.id;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token is not valid" });
  }
};
