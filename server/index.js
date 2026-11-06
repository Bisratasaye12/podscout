import "dotenv/config";
import mongoose from "mongoose"; //create models for app users

import app from "./app.js";

const REQUIRED_ENV = ["MONGODB_URI", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(", ")}. See .env.example`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

//connect server to mongoDB atlas
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Server running on port: http://localhost:${PORT}`)
    )
  )
  .catch((error) => {
    console.error(`${error} did not connect`);
    process.exit(1);
  });
