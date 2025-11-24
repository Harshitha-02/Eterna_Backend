🚀 Eterna – Order Execution Engine (Mock Implementation)

Market order execution • DEX routing • WebSocket live updates • BullMQ queue • PostgreSQL persistence

📌 Overview

This project implements a mock Solana order execution engine, designed to simulate how a real trading backend routes and executes swap orders across multiple DEXs.

The system supports:

✔ Market Orders

✔ DEX Routing (Raydium vs Meteora — simulated)

✔ Real-time WebSocket status updates

✔ Concurrent execution using BullMQ (Redis)

✔ Retry logic + exponential backoff

✔ Persistent order storage in PostgreSQL

✔ Docker-based infrastructure (Redis + Postgres)

This mock implementation focuses on backend architecture, concurrency, and real-time streaming, not real Solana transactions.

🎯 Why Market Order?

Market orders demonstrate the pure execution lifecycle — immediate routing, quote comparison, transaction building, and confirmation.

To extend this engine:

Limit Order → add price watcher before queueing

Sniper Order → trigger execution on token launch/migration event

(Explained in README as required by assignment.)

🧩 Architecture
Client
  |-- POST /api/orders/execute
        |-- Validate input
        |-- Insert into Postgres
        |-- Add job to Redis queue (BullMQ)
Worker (BullMQ)
        |-- pending
        |-- routing (compare mock DEX prices)
        |-- building
        |-- submitted
        |-- confirmed / failed (with retries)
WebSocket Client
        |-- Receives real-time lifecycle updates from DB polling

🛠 Tech Stack
Backend

Node.js + TypeScript

Fastify

@fastify/websocket

BullMQ

Redis

PostgreSQL

Docker Compose

Dev Tools

Jest (unit & integration tests)

Postman / Thunder Client

Docker

📦 Project Setup
1. Clone Repo
git clone https://github.com/Harshitha-02/Eterna_Backend.git
cd Eterna_Backend

2. Install Dependencies
npm install

3. Start Redis + PostgreSQL
docker compose up -d


Services started:

Redis → localhost:6379

PostgreSQL → localhost:5432 (user: postgres, pass: postgres, db: orders)

4. Start Backend
npm run dev


Backend will run at:

http://localhost:3001

🔥 API Documentation
POST /api/orders/execute

Creates a new market order.

Request Body:
{
  "type": "market",
  "tokenIn": "USDC",
  "tokenOut": "SOL",
  "amountIn": 100,
  "slippage": 0.01
}

Response:
{
  "orderId": "uuid"
}

🔌 WebSocket Streaming

To listen for live order status updates, connect to:

ws://localhost:3001/api/orders/ws?orderId=<id>

Example Messages:
{ "status": "ws_connected" }
{ "status": "pending" }
{ "status": "routing" }
{ "status": "building" }
{ "status": "submitted" }
{ "status": "confirmed", "txHash": "abc123", "executedPrice": 1.002 }


If execution fails → you will see:

{ "status": "failed", "lastError": "..." }

⚙️ Order Lifecycle
Stage	Meaning
pending	Order received by queue
routing	Comparing Raydium vs Meteora mock quotes
building	Preparing swap transaction
submitted	Sent to network (mock)
confirmed	Executed successfully (txHash & price returned)
failed	Error occurred (auto retries up to 3 times)
🧪 Testing

Run all Jest tests:

npm test


Includes:

DEX quote comparison tests

Queue retry behavior tests

API tests using Supertest

Status lifecycle verification

📁 Postman Collection

Included in this repo as:

postman_collection.json


Import it in Postman → ready to use.

🐳 Docker Setup

Start infrastructure:

docker compose up -d


Stop:

docker compose down

☁️ Deployment Guide (Render / Railway)

Environment variables required:

PORT=3001
DATABASE_URL=postgres://...
REDIS_URL=redis://...


Build command:

npm install && npm run build


Start command:

npm start



Demo must show:

3–5 orders created

Live WebSocket updates

Queue processing

DEX routing logs

Order confirmation

DB entries

✨ Author

Harshitha
Eterna Backend — Order Execution Engine
