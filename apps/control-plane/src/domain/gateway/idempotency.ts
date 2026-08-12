import { ActionReceipt } from "./action-request.js";

export type InFlightReservationResult = "ACQUIRED" | "IN_PROGRESS" | "COMPLETED";

export interface IdempotencyStorage {
  getReceipt(idempotencyKey: string): Promise<ActionReceipt | null>;
  saveReceipt(idempotencyKey: string, receipt: ActionReceipt): Promise<void>;
  reserveInFlight(idempotencyKey: string, metadata?: Partial<ActionReceipt>): Promise<InFlightReservationResult>;
  clearInFlight(idempotencyKey: string): Promise<void>;
}

export class InMemoryIdempotencyStorage implements IdempotencyStorage {
  private readonly receipts = new Map<string, ActionReceipt>();
  private readonly inFlightKeys = new Set<string>();

  async getReceipt(idempotencyKey: string): Promise<ActionReceipt | null> {
    return this.receipts.get(idempotencyKey) ?? null;
  }

  async saveReceipt(idempotencyKey: string, receipt: ActionReceipt): Promise<void> {
    this.inFlightKeys.delete(idempotencyKey);
    this.receipts.set(idempotencyKey, Object.freeze(receipt));
  }

  async reserveInFlight(idempotencyKey: string): Promise<InFlightReservationResult> {
    if (this.receipts.has(idempotencyKey)) {
      return "COMPLETED";
    }
    if (this.inFlightKeys.has(idempotencyKey)) {
      return "IN_PROGRESS";
    }
    this.inFlightKeys.add(idempotencyKey);
    return "ACQUIRED";
  }

  async clearInFlight(idempotencyKey: string): Promise<void> {
    this.inFlightKeys.delete(idempotencyKey);
  }
}

export class IdempotencyService {
  private readonly storage: IdempotencyStorage;

  constructor(storage?: IdempotencyStorage) {
    this.storage = storage ?? new InMemoryIdempotencyStorage();
  }

  async getReceipt(idempotencyKey: string): Promise<ActionReceipt | null> {
    return this.storage.getReceipt(idempotencyKey);
  }

  async saveReceipt(idempotencyKey: string, receipt: ActionReceipt): Promise<void> {
    await this.storage.saveReceipt(idempotencyKey, receipt);
  }

  async reserveInFlight(idempotencyKey: string, metadata?: Partial<ActionReceipt>): Promise<InFlightReservationResult> {
    return this.storage.reserveInFlight(idempotencyKey, metadata);
  }

  async clearInFlight(idempotencyKey: string): Promise<void> {
    await this.storage.clearInFlight(idempotencyKey);
  }
}

export { IdempotencyService as InMemoryIdempotencyService };

