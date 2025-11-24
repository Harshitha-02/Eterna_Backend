import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { MockDexRouter } from './mockDexRouter';
import { updateOrderStatus } from './db';
import { sleep } from './utils';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,   // REQUIRED for BullMQ v4
  enableReadyCheck: false
});

export const orderQueue = new Queue('orders', { connection });

const router = new MockDexRouter(1.0);

// Worker that processes jobs with concurrency 10
export const worker = new Worker(
  'orders',
  async (job: Job) => {
    const { order, wsSender }: any = job.data;
    const orderId = order.id;
    let attempts = job.attemptsMade || 0;

    // A helper to emit status both to DB and to connected WS (if present)
    const emit = async (status: string, payload: any = {}) => {
      try { await updateOrderStatus(orderId, status, { attempts }); } catch (e) { /* ignore DB errors here */ }
      if (wsSender) {
        try { wsSender(JSON.stringify({ orderId, status, ...payload })); } catch (e) { /* swallow */ }
      }
    };

    await emit('pending');

    // routing
    await emit('routing');
    let best: any;
    try {
      best = await router.findBestQuote(order.tokenIn, order.tokenOut, order.amountIn);
    } catch (err: any) {
      throw new Error('Failed while fetching quotes: ' + err?.message);
    }

    await emit('building', { chosenDex: best.dex, quotedPrice: best.price });

    // build tx: for mock we just wait a little
    await sleep(150 + Math.random() * 400);

    await emit('submitted', { chosenDex: best.dex });

    // attempt execution with exponential backoff up to 3 attempts
    const maxAttempts = 3;
    for (;;) {
      try {
        const res = await router.executeSwap(best.dex, orderId, order);
        attempts++;
        await updateOrderStatus(orderId, 'confirmed', { attempts, executedPrice: res.executedPrice, txHash: res.txHash });
        if (wsSender) wsSender(JSON.stringify({ orderId, status: 'confirmed', txHash: res.txHash, executedPrice: res.executedPrice }));
        return { txHash: res.txHash };
      } catch (err: any) {
        attempts++;
        const message = err?.message || String(err);
        await updateOrderStatus(orderId, 'failed', { attempts, lastError: message });
        if (attempts >= maxAttempts) {
          if (wsSender) wsSender(JSON.stringify({ orderId, status: 'failed', error: message }));
          throw new Error(`Execution failed after ${attempts} attempts: ${message}`);
        }
        // Exponential backoff
        const backoffMs = Math.pow(2, attempts) * 500; // 1000, 2000, 4000 etc
        if (wsSender) wsSender(JSON.stringify({ orderId, status: 'retrying', attempt: attempts, backoffMs }));
        await sleep(backoffMs);
      }
    }
  },
  { connection, concurrency: 10 }
);

worker.on('completed', (job, result) => {
  if (!job) return;   // prevents TS error
  console.log('Job completed', job.id, result);
});

worker.on('failed', (job, err) => {
  if (!job) return;
  console.error('Job failed', job.id, err?.message);
});

// helper to add job
export async function enqueueOrder(order: any, wsSender?: (msg: string) => void) {
  const jobId = order.id;
  await orderQueue.add('execute-order', { order, wsSender: undefined }, { jobId, removeOnComplete: true, attempts: 3, backoff: { type: 'exponential', delay: 500 } });
  // Note: we can't serialize wsSender into Redis. Instead we rely on worker events to forward messages
}