//extract all logic from the router.get functions in routes/user
//and put in here to avoid that user.js file becoming too complex

import User from "../models/user.js"; //create user instances
import Subscriptions from "../models/subscriptions.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const createToken = (user) =>
  jwt.sign({ email: user.email, id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

// never send the password hash back to the client
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
});

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const signin = async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  try {
    const existingUser = await User.findOne({ email });
    const isPasswordCorrect =
      existingUser && (await bcrypt.compare(password, existingUser.password));

    // same response for unknown email and wrong password, so the endpoint
    // can't be used to check which emails are registered
    if (!isPasswordCorrect)
      return res.status(401).json({ message: "Invalid credentials" });

    res
      .status(200)
      .json({ userData: publicUser(existingUser), token: createToken(existingUser) });
  } catch (error) {
    next(error);
  }
};

const signup = async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const { password, firstName, lastName } = req.body;

  if (!EMAIL_PATTERN.test(email))
    return res.status(400).json({ message: "A valid email is required" });
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH)
    return res.status(400).json({
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  if (!firstName?.trim() || !lastName?.trim())
    return res.status(400).json({ message: "First and last name are required" });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const userData = await User.create({
      email,
      password: hashedPassword,
      name: `${firstName.trim()} ${lastName.trim()}`,
    });

    await Subscriptions.create({
      email,
      subscriptions: [],
    });

    res
      .status(201)
      .json({ userData: publicUser(userData), token: createToken(userData) });
  } catch (error) {
    next(error);
  }
};

export { signin, signup };
