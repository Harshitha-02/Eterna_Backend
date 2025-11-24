import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { v4 as uuidv4 } from 'uuid';
import { initDb, insertOrder } from './db';
import { enqueueOrder } from './queue';
import type { OrderRequest, OrderRecord } from './types';

async function start() {
  const fastify = Fastify({ logger: true });

  await initDb();
  await fastify.register(websocketPlugin);

  fastify.post('/api/orders/execute', async (request, reply) => {
    const body = request.body as Partial<OrderRequest>;
    if (!body || !body.tokenIn || !body.tokenOut || !body.amountIn) {
      return reply.status(400).send({ error: 'tokenIn, tokenOut and amountIn are required' });
    }

    if (body.type && body.type !== 'market') {
      return reply.status(400).send({ error: 'Only market orders are supported in this mock' });
    }

    const id = uuidv4();
    const record: OrderRecord = {
      id,
      type: 'market',
      tokenIn: body.tokenIn,
      tokenOut: body.tokenOut,
      amountIn: body.amountIn,
      slippage: body.slippage ?? 0.01,
      status: 'received',
      createdAt: new Date().toISOString(),
      attempts: 0,
    };

    await insertOrder(record);
    await enqueueOrder(record);

    return reply.send({ orderId: id });
  });

    fastify.get('/api/orders/ws', { websocket: true }, (connection, req) => {
    const url = new URL(req.raw.url || '', `http://${req.headers.host}`);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      connection.socket.send(JSON.stringify({ error: 'orderId required as query param' }));
      connection.socket.close();
      return;
    }

    let lastSentStatus: string | undefined;

    const send = (payload: any) => {
      if (connection.socket.readyState === connection.socket.OPEN) {
        connection.socket.send(JSON.stringify(payload));
      }
    };

    // WS is connected
    send({ orderId, status: 'ws_connected' });

    // Poll database every 700ms
    const interval = setInterval(async () => {
      try {
        const { getOrder } = await import('./db');
        const row = await getOrder(orderId);

        if (!row) {
          send({ orderId, status: 'not_found' });
          return;
        }

        if (row.status !== lastSentStatus) {
          lastSentStatus = row.status;
          send({
            orderId,
            status: row.status,
            txHash: row.tx_hash,
            executedPrice: row.executed_price,
            lastError: row.last_error
          });
        }
      } catch (e: any) {
        send({
          orderId,
          status: 'error',
          error: e.message
        });
      }
    }, 700);

    connection.socket.on('close', () => clearInterval(interval));
  });


  fastify.get('/health', async () => ({ uptime: process.uptime() }));

  const port = Number(process.env.PORT || 3001);
  fastify.listen({ port, host: '0.0.0.0' }).then(() => console.log(`Server listening on ${port}`));
}

start();
