# podscout

[![CI](https://github.com/Bisratasaye12/podscout/actions/workflows/ci.yml/badge.svg)](https://github.com/Bisratasaye12/podscout/actions/workflows/ci.yml)

Search any podcast on iTunes, play episodes in the browser, and keep a list of shows you subscribe to.

The client is React with Material UI. The API is Express and MongoDB, with JWT auth. It also proxies iTunes search and podcast RSS feeds, because browsers can't fetch most feeds directly (CORS).

## How it fits together

```
React client (client/)
   │  axios, Bearer token from localStorage
   ▼
Express API (server/)
   ├── /user/signup, /user/signin   bcrypt + JWT (1h expiry)
   ├── /subscriptions               GET/PATCH, scoped to the token's user
   ├── /podcasts/search             iTunes Search API
   ├── /podcasts/:id/feed           iTunes lookup → fetch the show's RSS feed
   └── /health
   │
   ▼
MongoDB (users, subscriptions)
```

A few decisions worth knowing about:

- `/subscriptions` ignores any email sent by the client and uses the one inside the verified token. A user can't read or change someone else's list.
- Sign-in returns the same `401` for an unknown email and a wrong password, so the endpoint can't be used to find out who has an account.
- Responses never include the password hash.
- The server refuses to start if `MONGODB_URI` or `JWT_SECRET` is missing.

## Running it locally

You need Node 20+ and a MongoDB database (local or Atlas).

```bash
# API
cd server
cp .env.example .env    # fill in MONGODB_URI and JWT_SECRET
npm install
npm run dev             # http://localhost:5000

# client, in another terminal
cd client
cp .env.example .env
npm install
npm start               # http://localhost:3000
```

The client uses an older Create React App setup (react-scripts 3). On Node 17+ you may need `NODE_OPTIONS=--openssl-legacy-provider npm start`.

## Tests

```bash
cd server
npm test
```

17 tests run on Node's built-in test runner with Supertest. They cover signup and sign-in validation, auth failures, subscription scoping, error handling and the podcast proxy. Mongoose models and `fetch` are mocked, so the tests need no database or network. CI runs them on every push.

## API

| Method | Path | Auth | Body / query |
|---|---|---|---|
| POST | `/user/signup` | no | `email`, `password` (8+ chars), `firstName`, `lastName` |
| POST | `/user/signin` | no | `email`, `password` |
| GET | `/subscriptions` | yes | |
| PATCH | `/subscriptions` | yes | `subscriptions` (array) |
| GET | `/podcasts/search` | no | `?term=` |
| GET | `/podcasts/:id/feed` | no | iTunes collection id, returns RSS XML |
| GET | `/health` | no | |

## What's next

- Move the client from Create React App to Vite and React 18
- Refresh tokens instead of a 1 hour hard expiry
- Cache feeds on the server for a few minutes
