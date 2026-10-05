/**
 * Checkout domain models — mirrors Flutter
 * `features/checkout/domain/models/{address,payment,order}_models.dart`.
 * Mock data lives in `src/mocks/checkout_mock_data.json`.
 */
import checkoutData from '../../mocks/checkout_mock_data.json';
import type { CartItem } from '../catalog/catalogModels';

// ── Address ─────────────────────────────────────────────────────────────

/** Flutter `AddressType`. */
export type AddressType = 'home' | 'office' | 'other';

/** Flutter `DeliveryAddress` (+ a web-only `id` for list keys / radio values). */
export interface DeliveryAddress {
  id: string;
  fullName: string;
  /** 10-digit local number, without the +91 prefix. */
  mobile: string;
  pincode: string;
  city: string;
  state: string;
  house: string;
  area: string;
  type: AddressType;
  /** Only set when `type` is `other`. */
  customLabel?: string;
  isDefault: boolean;
  /** [lat, lng] from the pin-location map. */
  location?: [number, number];
}

export interface AddressTypeOption {
  value: AddressType;
  label: string;
  icon: string;
}

export const addressTypes = checkoutData.addressTypes as AddressTypeOption[];

/** Flutter `MockAddresses.saved`. */
export const savedAddresses = checkoutData.savedAddresses as DeliveryAddress[];

/** Flutter `DeliveryAddress.label`. */
export function addressLabel(address: DeliveryAddress): string {
  if (address.type === 'other' && address.customLabel) return address.customLabel;
  return addressTypes.find((t) => t.value === address.type)?.label ?? '';
}

/** Flutter `formattedMobile` — e.g. "+91 98765 43210". */
export function formatMobile(mobile: string): string {
  return mobile.length === 10 ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : `+91 ${mobile}`;
}

/** Flutter `PincodeDirectory.lookup` — mock city/state auto-fill. */
export async function lookupPincode(
  pincode: string,
): Promise<{ city: string; state: string } | null> {
  await new Promise((resolve) => setTimeout(resolve, checkoutData.pincodeLookupDelayMs));
  const entry = (checkoutData.pincodes as Record<string, string[]>)[pincode];
  return entry ? { city: entry[0], state: entry[1] } : null;
}

// ── Delivery ────────────────────────────────────────────────────────────

/** Flutter `DeliveryOption`. */
export type DeliveryOptionValue = 'standard' | 'express';

export interface DeliveryOption {
  value: DeliveryOptionValue;
  label: string;
  eta: string;
  fee: number;
  icon: string;
}

export const deliveryOptions = checkoutData.deliveryOptions as DeliveryOption[];

export const deliveryOption = (value: DeliveryOptionValue): DeliveryOption =>
  deliveryOptions.find((o) => o.value === value) ?? deliveryOptions[0];

// ── Payment ─────────────────────────────────────────────────────────────

/** Flutter `PaymentMethod`. */
export type PaymentMethodValue = 'upi' | 'card' | 'netBanking' | 'cod';

export interface PaymentMethod {
  value: PaymentMethodValue;
  label: string;
  subtitle: string;
  icon: string;
  /** Flutter `PlacedOrder.paymentStatus`. */
  status: string;
}

export const paymentMethods = checkoutData.paymentMethods as PaymentMethod[];

/** Flutter `kNetBankingBanks`. */
export const netBankingBanks = checkoutData.netBankingBanks;

/** Flutter `PaymentArgs` — router state for /checkout/payment. */
export interface PaymentArgs {
  address: DeliveryAddress;
  delivery: DeliveryOptionValue;
}

// ── Order ───────────────────────────────────────────────────────────────

/** Flutter `OrderLine`. */
export interface OrderLine {
  name: string;
  quantity: number;
  total: number;
}

/** Flutter `PlacedOrder` — snapshot taken when "Place Order" succeeds. */
export interface PlacedOrder {
  orderId: string;
  lines: OrderLine[];
  total: number;
  address: DeliveryAddress;
  delivery: DeliveryOptionValue;
  method: PaymentMethodValue;
}

/** Flutter `OrderConfirmationArgs` — router state for /checkout/confirmation. */
export interface OrderConfirmationArgs {
  order: PlacedOrder;
}

/** Flutter `PlacedOrder.fromCart`. */
export function placeOrderFromCart(
  items: CartItem[],
  grandTotal: number,
  args: PaymentArgs,
  method: PaymentMethodValue,
): PlacedOrder {
  const number = 100000 + Math.floor(Math.random() * 900000);
  return {
    orderId: `#SC-${number}`,
    lines: items.map((item) => ({
      name: item.variant.productName,
      quantity: item.quantity,
      total: item.variant.price * item.quantity,
    })),
    total: grandTotal + deliveryOption(args.delivery).fee,
    address: args.address,
    delivery: args.delivery,
    method,
  };
}

/** Cash on delivery is collected later; every other method is prepaid. */
export const isOrderPaid = (order: PlacedOrder) => order.method !== 'cod';

export function customerFirstName(order: PlacedOrder): string {
  const name = order.address.fullName.trim();
  return name === '' ? 'there' : name.split(/\s+/)[0];
}

export const paymentDelays = {
  processingMs: checkoutData.paymentProcessingDelayMs,
  saveAddressMs: checkoutData.saveAddressDelayMs,
};

export const addressMapConfig = {
  ...checkoutData.map,
  defaultCenter: checkoutData.map.defaultCenter as [number, number],
};

export const mockGpsFix = {
  ...checkoutData.gps,
  location: checkoutData.gps.location as [number, number],
};
