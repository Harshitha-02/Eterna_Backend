import { sleep } from './utils';
import { v4 as uuidv4 } from 'uuid';

export class MockDexRouter {
  // basePrice is a synthetic price (e.g., tokenOut per tokenIn)
  constructor(private basePrice = 1.0) {}

  async getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number) {
    await sleep(200 + Math.random() * 200);
    const price = this.basePrice * (0.98 + Math.random() * 0.04); // 2% variance
    const fee = 0.003;
    return { dex: 'raydium', price, fee, amountOut: amount * price * (1 - fee) };
  }

  async getMeteoraQuote(tokenIn: string, tokenOut: string, amount: number) {
    await sleep(200 + Math.random() * 200);
    const price = this.basePrice * (0.97 + Math.random() * 0.05); // 3-5% variance
    const fee = 0.002;
    return { dex: 'meteora', price, fee, amountOut: amount * price * (1 - fee) };
  }

  async findBestQuote(tokenIn: string, tokenOut: string, amount: number) {
    const [r, m] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteoraQuote(tokenIn, tokenOut, amount),
    ]);

    // Choose best executed amountOut (higher is better)
    return r.amountOut >= m.amountOut ? r : m;
  }

  async executeSwap(dex: string, orderId: string, order: any) {
    // Simulate network delay 2000-3000ms
    await sleep(2000 + Math.random() * 1000);
    // 8% chance to fail to allow retry logic to be tested
    if (Math.random() < 0.08) {
      throw new Error(`Mock ${dex} execution failed (simulated)`);
    }
    const txHash = uuidv4().replace(/-/g, '');
    const executedPrice = this.basePrice * (0.98 + Math.random() * 0.04);
    return { txHash, executedPrice };
  }
}