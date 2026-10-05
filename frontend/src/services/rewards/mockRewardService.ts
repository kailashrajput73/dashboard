import rewardsMock from '../../mocks/rewards_mock_data.json';
import type { RewardLedgerEntry } from './rewardModels';

/**
 * Mirrors Flutter `InMemoryRewardRepository.withDemoSeed()`: the seed ledger
 * is copied onto whichever user asks first, and the balance is always derived
 * from the ledger (earned − redeemed).
 */
const seed = rewardsMock._mockSeedEntries as RewardLedgerEntry[];

const entriesForUser = (requesterId: string): RewardLedgerEntry[] =>
  seed
    .map((e) => ({
      ...e,
      id: `${e.id}-${requesterId}`,
      requesterId,
      quotationId: `${e.quotationId}-${requesterId}`,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const mockRewardService = {
  async getLedgerEntriesForUser(requesterId: string): Promise<RewardLedgerEntry[]> {
    return entriesForUser(requesterId);
  },

  async getBalanceForUser(requesterId: string): Promise<number> {
    return entriesForUser(requesterId).reduce(
      (sum, e) => (e.type === 'earned' ? sum + e.points : sum - e.points),
      0,
    );
  },
};
