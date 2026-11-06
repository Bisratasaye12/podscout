import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  if (scheme !== "Bearer" || !token)
    return res.status(401).json({ message: "Missing auth token" });

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decodedData.id;
    req.userEmail = decodedData.email;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default auth;
