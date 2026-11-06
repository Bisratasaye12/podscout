import { test, describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

process.env.JWT_SECRET = "test-secret";

const { default: app } = await import("../app.js");
const { default: User } = await import("../models/user.js");
const { default: Subscriptions } = await import("../models/subscriptions.js");

const tokenFor = (email) =>
  jwt.sign({ email, id: "user-id" }, process.env.JWT_SECRET, { expiresIn: "1h" });

beforeEach(() => mock.restoreAll());

describe("GET /health", () => {
  test("responds ok", async () => {
    const res = await request(app).get("/health");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: "ok" });
  });
});

describe("POST /user/signup", () => {
  const valid = {
    email: "Ada@Example.com",
    password: "longenough",
    firstName: "Ada",
    lastName: "Lovelace",
  };

  test("rejects an invalid email", async () => {
    const res = await request(app).post("/user/signup").send({ ...valid, email: "nope" });
    assert.equal(res.status, 400);
  });

  test("rejects a short password", async () => {
    const res = await request(app).post("/user/signup").send({ ...valid, password: "short" });
    assert.equal(res.status, 400);
  });

  test("rejects a duplicate user", async () => {
    mock.method(User, "findOne", async () => ({ email: "ada@example.com" }));
    const res = await request(app).post("/user/signup").send(valid);
    assert.equal(res.status, 409);
  });

  test("creates a user without leaking the password hash", async () => {
    mock.method(User, "findOne", async () => null);
    const create = mock.method(User, "create", async (doc) => ({ _id: "u1", ...doc }));
    mock.method(Subscriptions, "create", async (doc) => doc);

    const res = await request(app).post("/user/signup").send(valid);

    assert.equal(res.status, 201);
    assert.equal(create.mock.calls[0].arguments[0].email, "ada@example.com");
    assert.equal(res.body.userData.password, undefined);
    assert.equal(jwt.verify(res.body.token, "test-secret").email, "ada@example.com");
  });
});

describe("POST /user/signin", () => {
  test("returns the same 401 for unknown email and wrong password", async () => {
    mock.method(User, "findOne", async () => null);
    const unknown = await request(app)
      .post("/user/signin")
      .send({ email: "x@example.com", password: "whatever1" });

    const password = await bcrypt.hash("correct-pass", 4);
    mock.method(User, "findOne", async () => ({ _id: "u1", email: "x@example.com", password }));
    const wrong = await request(app)
      .post("/user/signin")
      .send({ email: "x@example.com", password: "wrong-pass" });

    assert.equal(unknown.status, 401);
    assert.equal(wrong.status, 401);
    assert.deepEqual(unknown.body, wrong.body);
  });

  test("signs in with the right password", async () => {
    const password = await bcrypt.hash("correct-pass", 4);
    mock.method(User, "findOne", async () => ({ _id: "u1", name: "X", email: "x@example.com", password }));

    const res = await request(app)
      .post("/user/signin")
      .send({ email: "x@example.com", password: "correct-pass" });

    assert.equal(res.status, 200);
    assert.equal(res.body.userData.password, undefined);
  });
});

describe("/subscriptions", () => {
  test("requires a token", async () => {
    const res = await request(app).get("/subscriptions");
    assert.equal(res.status, 401);
  });

  test("rejects a bad token", async () => {
    const res = await request(app).get("/subscriptions").set("Authorization", "Bearer junk");
    assert.equal(res.status, 401);
  });

  test("reads the token owner's subscriptions, not the email in the query", async () => {
    const findOne = mock.method(Subscriptions, "findOne", async () => ({ subscriptions: [1, 2] }));

    const res = await request(app)
      .get("/subscriptions?email=victim@example.com")
      .set("Authorization", `Bearer ${tokenFor("me@example.com")}`);

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [1, 2]);
    assert.deepEqual(findOne.mock.calls[0].arguments[0], { email: "me@example.com" });
  });

  test("rejects a non-array update", async () => {
    const res = await request(app)
      .patch("/subscriptions")
      .set("Authorization", `Bearer ${tokenFor("me@example.com")}`)
      .send({ subscriptions: "nope" });
    assert.equal(res.status, 400);
  });

  test("passes database errors to the error handler", async () => {
    mock.method(Subscriptions, "findOne", async () => {
      throw new Error("db down");
    });
    mock.method(console, "error", () => {});

    const res = await request(app)
      .get("/subscriptions")
      .set("Authorization", `Bearer ${tokenFor("me@example.com")}`);
    assert.equal(res.status, 500);
  });
});

describe("/podcasts", () => {
  test("search needs a term", async () => {
    const res = await request(app).get("/podcasts/search");
    assert.equal(res.status, 400);
  });

  test("search returns iTunes results", async () => {
    mock.method(globalThis, "fetch", async () => ({
      ok: true,
      json: async () => ({ results: [{ trackId: 1 }] }),
    }));
    const res = await request(app).get("/podcasts/search?term=ai");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [{ trackId: 1 }]);
  });

  test("feed rejects a non-numeric id", async () => {
    const res = await request(app).get("/podcasts/abc/feed");
    assert.equal(res.status, 400);
  });

  test("feed returns the RSS XML", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async (url) =>
      url.includes("lookup")
        ? { ok: true, json: async () => ({ results: [{ feedUrl: "https://feed.example/rss" }] }) }
        : { ok: true, text: async () => "<rss><channel/></rss>" }
    );

    const res = await request(app).get("/podcasts/42/feed");

    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /xml/);
    assert.equal(res.text, "<rss><channel/></rss>");
    assert.equal(fetchMock.mock.calls[1].arguments[0], "https://feed.example/rss");
  });
});

describe("unknown routes", () => {
  test("return JSON 404", async () => {
    const res = await request(app).get("/nope");
    assert.equal(res.status, 404);
    assert.equal(res.body.message, "Not found");
  });
});
