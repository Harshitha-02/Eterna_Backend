export type OrderType = 'market' | 'limit' | 'sniper';

export interface OrderRequest {
  type: OrderType; // for this demo we accept market only but validated
  tokenIn: string;
  tokenOut: string;
  amountIn: number; // in tokenIn's base units
  slippage: number; // 0.01 = 1%
}

export interface OrderRecord {
  id: string;
  type: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  slippage: number;
  status: string;
  createdAt: string;
  lastError?: string | null;
  attempts: number;
  executedPrice?: number;
  txHash?: string;
}