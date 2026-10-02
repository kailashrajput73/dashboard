// Browser storage adapter.
// Helpers never throw: reads return `fallback`, writes return `false`.
// Values supported: string | number | boolean | null (JSON-serialized on disk).
// Usage: import { storage } from "../utils/storage"; await storage.getItem(key, fallback);
// No Keychain on web — secure* helpers reuse localStorage.

import { StorageBase } from "./storage-base";
import type { AssertNoExtras, StorageItemValue } from "./storage-base";

export class Storage extends StorageBase {
  // General KV — backed by browser localStorage.
  async getItem<Fallback extends StorageItemValue>(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null> {
    try {
      const raw = localStorage.getItem(key);
      return this.retrieve(raw, fallback);
    } catch (e) {
      this.warn("getItem", key, e);
      return fallback;
    }
  }

  async setItem<Value extends StorageItemValue>(
    key: string,
    value: Value,
  ): Promise<boolean> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      this.warn("setItem", key, e);
      return false;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      this.warn("removeItem", key, e);
      return false;
    }
  }

  // Browsers have no Keychain — secure* helpers fall through to localStorage.
  async secureGet<Fallback extends StorageItemValue>(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null> {
    return this.getItem(key, fallback);
  }

  async secureSet<Value extends StorageItemValue>(
    key: string,
    value: Value,
  ): Promise<boolean> {
    return this.setItem(key, value);
  }

  async secureRemove(key: string): Promise<boolean> {
    return this.removeItem(key);
  }
}

export const storage = new Storage();

// Compile-time guard: any new method must be declared in storage-base.ts first.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentional compile-time-only assertion
export type _NoExtras = AssertNoExtras<Exclude<keyof Storage, keyof StorageBase>>;
