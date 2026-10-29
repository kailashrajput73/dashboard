import type { Dispatch, SetStateAction } from 'react';
import type { MasterData, MasterStatus } from '../../../services/admin/productMasterModels';

export type MasterTabId = 'category' | 'subCategory' | 'brand' | 'productGroup';

export interface MasterTabProps {
  data: MasterData;
  setData: Dispatch<SetStateAction<MasterData>>;
  notify: (message: string) => void;
}

export const flipStatus = (status: MasterStatus): MasterStatus =>
  status === 'active' ? 'inactive' : 'active';
