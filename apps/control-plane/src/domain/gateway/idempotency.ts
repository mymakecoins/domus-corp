import { ActionReceipt } from "./action-request.js";

export class IdempotencyService {
  private readonly receipts = new Map<string, ActionReceipt>();

  getReceipt(idempotencyKey: string): ActionReceipt | null {
    return this.receipts.get(idempotencyKey) ?? null;
  }

  saveReceipt(idempotencyKey: string, receipt: ActionReceipt): void {
    this.receipts.set(idempotencyKey, Object.freeze(receipt));
  }
}
