import profileMock from '../../mocks/profile_mock_data.json';
import type { AppUserProfile } from '../../session/SessionContext';
import { isLocked, maskAccountNumber } from './profileModels';
import type {
  BankDetails,
  GstDetails,
  PanDetails,
  PersonalInfo,
  ProfileDetails,
  ProfileDocument,
  VerificationStatus,
} from './profileModels';

/**
 * Mirrors Flutter `InMemoryProfileRepository` + `ProfileController`: each user
 * is seeded with demo KYC data (PAN + Bank approved, GST pending) the first
 * time they're fetched. In-memory only — resets on reload.
 */
const store = new Map<string, ProfileDetails>();
const { _seed, _demoAddress, _saveDelayMs } = profileMock;

const delay = () => new Promise((resolve) => setTimeout(resolve, _saveDelayMs));

function seed(user: AppUserProfile): ProfileDetails {
  return {
    personal: {
      fullName: user.name,
      mobileNumber: user.phone ?? '',
      email: user.email ?? '',
      address: _demoAddress,
    },
    pan: {
      ..._seed.pan,
      nameOnDocument: user.name,
      status: _seed.pan.status as VerificationStatus,
    },
    gst: {
      ..._seed.gst,
      nameOnDocument: user.name,
      status: _seed.gst.status as VerificationStatus,
    },
    bank: {
      ..._seed.bank,
      nameOnAccount: user.name,
      status: _seed.bank.status as VerificationStatus,
    },
  };
}

function update(userId: string, change: (d: ProfileDetails) => ProfileDetails) {
  const current = store.get(userId);
  if (!current) throw new Error(`Profile for ${userId} not loaded`);
  const next = change(current);
  store.set(userId, next);
  return next;
}

function assertEditable(status: VerificationStatus) {
  if (isLocked(status)) throw new Error('Approved details cannot be changed.');
}

export interface PanInput {
  panNumber: string;
  nameOnDocument: string;
  document?: ProfileDocument;
}
export interface GstInput {
  gstNumber: string;
  nameOnDocument: string;
  document?: ProfileDocument;
}
export interface BankInput {
  accountNumber: string;
  ifscCode: string;
  nameOnAccount: string;
  document?: ProfileDocument;
}

export const mockProfileService = {
  async fetch(user: AppUserProfile): Promise<ProfileDetails> {
    if (!store.has(user.id)) store.set(user.id, seed(user));
    return store.get(user.id)!;
  },

  async savePersonal(userId: string, personal: PersonalInfo): Promise<ProfileDetails> {
    await delay();
    return update(userId, (d) => ({ ...d, personal }));
  },

  async savePan(userId: string, input: PanInput): Promise<ProfileDetails> {
    await delay();
    return update(userId, (d) => {
      assertEditable(d.pan.status);
      const pan: PanDetails = {
        panNumber: input.panNumber.trim().toUpperCase(),
        nameOnDocument: input.nameOnDocument.trim(),
        document: input.document ?? d.pan.document,
        status: 'pending',
      };
      return { ...d, pan };
    });
  },

  async saveGst(userId: string, input: GstInput): Promise<ProfileDetails> {
    await delay();
    return update(userId, (d) => {
      assertEditable(d.gst.status);
      const gst: GstDetails = {
        gstNumber: input.gstNumber.trim().toUpperCase(),
        nameOnDocument: input.nameOnDocument.trim(),
        document: input.document ?? d.gst.document,
        status: 'pending',
      };
      return { ...d, gst };
    });
  },

  async saveBank(userId: string, input: BankInput): Promise<ProfileDetails> {
    await delay();
    return update(userId, (d) => {
      assertEditable(d.bank.status);
      const bank: BankDetails = {
        accountNumber: maskAccountNumber(input.accountNumber),
        ifscCode: input.ifscCode.trim().toUpperCase(),
        nameOnAccount: input.nameOnAccount.trim(),
        document: input.document ?? d.bank.document,
        status: 'pending',
      };
      return { ...d, bank };
    });
  },
};
