import { Pool } from 'pg';
import type { OrderRecord } from './types';

// Simple pg wrapper. Set DATABASE_URL env var (postgres://user:pass@host:port/db)
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orders' });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      type TEXT,
      token_in TEXT,
      token_out TEXT,
      amount_in NUMERIC,
      slippage NUMERIC,
      status TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      last_error TEXT,
      attempts INT DEFAULT 0,
      executed_price NUMERIC,
      tx_hash TEXT
    );
  `);
}

export async function insertOrder(record: OrderRecord) {
  await pool.query(
    `INSERT INTO orders(id, type, token_in, token_out, amount_in, slippage, status, created_at, attempts) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [record.id, record.type, record.tokenIn, record.tokenOut, record.amountIn, record.slippage, record.status, record.createdAt, record.attempts]
  );
}

export async function updateOrderStatus(id: string, status: string, update: Partial<OrderRecord> = {}) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  fields.push(`status = $${idx++}`); values.push(status);
  if (update.lastError !== undefined) { fields.push(`last_error = $${idx++}`); values.push(update.lastError); }
  if (update.attempts !== undefined) { fields.push(`attempts = $${idx++}`); values.push(update.attempts); }
  if (update.executedPrice !== undefined) { fields.push(`executed_price = $${idx++}`); values.push(update.executedPrice); }
  if (update.txHash !== undefined) { fields.push(`tx_hash = $${idx++}`); values.push(update.txHash); }
  values.push(id);
  const q = `UPDATE orders SET ${fields.join(', ')} WHERE id = $${idx}`;
  await pool.query(q, values);
}

export async function getOrder(id: string) {
  const r = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  return r.rows[0];
}