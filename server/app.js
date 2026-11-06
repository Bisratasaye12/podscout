import express from "express"; //framework to create routing
import cors from "cors"; //enable cross origin request

import userRoutes from "./routes/users.js";
import subscriptionsRoutes from "./routes/subscriptions.js";

const app = express(); //do this w every express app
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  optionsSuccessStatus: 200,
};

app.use(express.json({ limit: "1mb" }));
app.use(cors(corsOptions));

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use("/user", userRoutes);
app.use("/subscriptions", subscriptionsRoutes);

app.use((req, res) => res.status(404).json({ message: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ message: "Malformed JSON body" });

  console.error(err);
  res.status(err.status || 500).json({ message: "Something went wrong" });
});

export default app;
