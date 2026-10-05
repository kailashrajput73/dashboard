import { useCallback, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from '../../../routes/appRoutes';
import { useCart } from '../../../session/CartContext';
import {
  addressLabel,
  deliveryOption,
  deliveryOptions,
  formatMobile,
  savedAddresses,
} from '../../../services/checkout/checkoutModels';
import type {
  DeliveryAddress,
  DeliveryOptionValue,
  PaymentArgs,
} from '../../../services/checkout/checkoutModels';
import { SnackBar } from '../../../shared/SnackBar';
import { CheckoutShell, OrderSummary, fill, formatInr } from '../shared';
import checkoutMock from './Checkout.mock.json';
import { AddAddressDialog } from './AddAddressDialog';
import {
  SectionCard,
  SectionHead,
  SectionIcon,
  SectionTitle,
  SectionSubtitle,
  OptionGrid,
  OptionCard,
  HiddenRadio,
  RadioMark,
  AddressBody,
  AddressTop,
  AddressType,
  DefaultChip,
  AddressLine,
  AddAddressButton,
  DeliveryIcon,
  DeliveryText,
  OptionLabel,
  OptionSubtitle,
  Fee,
  Actions,
  BackLink,
  PrimaryButton,
} from '../shared/checkout.styles';

const { _currentStep, _labels } = checkoutMock;

/**
 * Web-only: step 2 writes its state into its own history entry before moving
 * to Payment, so browser Back restores added addresses and choices (Flutter
 * keeps the screen alive underneath instead).
 */
interface AddressStepState {
  addresses: DeliveryAddress[];
  selectedId: string | null;
  delivery: DeliveryOptionValue;
}

/**
 * Checkout step 2 of 4 — pick a shipping address and a delivery option
 * (Flutter `SelectAddressScreen`, route /checkout/address), with the order
 * summary alongside on web. "Add New Address" opens [AddAddressDialog]; the
 * saved address is added and selected.
 */
export function Checkout() {
  const navigate = useNavigate();
  const cart = useCart();
  const restored = useLocation().state as AddressStepState | null;

  const [addresses, setAddresses] = useState<DeliveryAddress[]>(
    () => restored?.addresses ?? savedAddresses,
  );
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (restored) return restored.selectedId;
    return (savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0])?.id ?? null;
  });
  const [delivery, setDelivery] = useState<DeliveryOptionValue>(
    () => restored?.delivery ?? 'standard',
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snack, setSnack] = useState<{ id: number; message: string } | null>(null);

  const showSnack = useCallback((message: string) => setSnack({ id: Date.now(), message }), []);
  const hideSnack = useCallback(() => setSnack(null), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  // Nothing to check out — send the user back to the (empty) cart.
  if (cart.isEmpty) return <Navigate to={AppRoutes.cart} replace />;

  const selected = addresses.find((a) => a.id === selectedId) ?? null;

  const saveAddress = (address: DeliveryAddress) => {
    // Flutter: a new default goes first and clears the old default.
    setAddresses((prev) =>
      address.isDefault
        ? [address, ...prev.map((a) => ({ ...a, isDefault: false }))]
        : [...prev, address],
    );
    setSelectedId(address.id);
    setDialogOpen(false);
    showSnack(fill(_labels.addressSaved, { label: addressLabel(address) }));
  };

  const proceed = () => {
    if (!selected) {
      showSnack(_labels.noAddress);
      return;
    }
    const stepState: AddressStepState = { addresses, selectedId, delivery };
    navigate(AppRoutes.selectAddress, { replace: true, state: stepState });
    const args: PaymentArgs = { address: selected, delivery };
    navigate(AppRoutes.payment, { state: args });
  };

  return (
    <CheckoutShell
      currentStep={_currentStep}
      aside={
        <OrderSummary
          delivery={deliveryOption(delivery)}
          withCoupon
          onCouponApplied={(c) => showSnack(fill(_labels.couponApplied, { code: c.code }))}
        />
      }
    >
      {/* Shipping address */}
      <SectionCard aria-labelledby="shipping-title">
        <SectionHead>
          <SectionIcon>
            <i className="pi pi-map-marker" aria-hidden />
          </SectionIcon>
          <div>
            <SectionTitle id="shipping-title">{_labels.shippingTitle}</SectionTitle>
            <SectionSubtitle>{_labels.shippingSubtitle}</SectionSubtitle>
          </div>
        </SectionHead>
        {addresses.length > 0 && (
          <OptionGrid $columns={2} role="radiogroup" aria-labelledby="shipping-title">
            {addresses.map((address) => {
              const isSelected = address.id === selectedId;
              return (
                <OptionCard key={address.id} $selected={isSelected}>
                  <HiddenRadio
                    name="address"
                    value={address.id}
                    checked={isSelected}
                    onChange={() => setSelectedId(address.id)}
                  />
                  <RadioMark $selected={isSelected} aria-hidden />
                  <AddressBody>
                    <AddressTop>
                      <AddressType>{addressLabel(address)}</AddressType>
                      {address.isDefault && <DefaultChip>{_labels.default}</DefaultChip>}
                    </AddressTop>
                    <AddressLine>{address.fullName}</AddressLine>
                    <AddressLine>
                      {address.house}, {address.area}
                    </AddressLine>
                    <AddressLine>
                      {address.city} - {address.pincode}, {address.state}
                    </AddressLine>
                    <AddressLine>{formatMobile(address.mobile)}</AddressLine>
                  </AddressBody>
                </OptionCard>
              );
            })}
          </OptionGrid>
        )}
        <AddAddressButton type="button" onClick={() => setDialogOpen(true)}>
          <i className="pi pi-plus" aria-hidden />
          {addresses.length > 0 ? _labels.addNewAddress : _labels.addFirstAddress}
        </AddAddressButton>
      </SectionCard>

      {/* Delivery options */}
      <SectionCard aria-labelledby="delivery-title">
        <SectionHead>
          <SectionIcon>
            <i className="pi pi-truck" aria-hidden />
          </SectionIcon>
          <div>
            <SectionTitle id="delivery-title">{_labels.deliveryTitle}</SectionTitle>
            <SectionSubtitle>{_labels.deliverySubtitle}</SectionSubtitle>
          </div>
        </SectionHead>
        <OptionGrid $columns={2} role="radiogroup" aria-labelledby="delivery-title">
          {deliveryOptions.map((option) => {
            const isSelected = option.value === delivery;
            return (
              <OptionCard key={option.value} $selected={isSelected}>
                <HiddenRadio
                  name="delivery"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => setDelivery(option.value)}
                />
                <RadioMark $selected={isSelected} aria-hidden />
                <DeliveryIcon>
                  <i className={`pi ${option.icon}`} aria-hidden />
                </DeliveryIcon>
                <DeliveryText>
                  <OptionLabel>{option.label}</OptionLabel>
                  <OptionSubtitle>{option.eta}</OptionSubtitle>
                </DeliveryText>
                <Fee $free={option.fee === 0}>
                  {option.fee === 0 ? _labels.free : formatInr(option.fee)}
                </Fee>
              </OptionCard>
            );
          })}
        </OptionGrid>

        <Actions>
          <BackLink type="button" onClick={() => navigate(AppRoutes.cart)}>
            <i className="pi pi-arrow-left" aria-hidden />
            {_labels.backToCart}
          </BackLink>
          <PrimaryButton type="button" onClick={proceed}>
            {_labels.proceed}
            <i className="pi pi-arrow-right" aria-hidden />
          </PrimaryButton>
        </Actions>
      </SectionCard>

      {dialogOpen && (
        <AddAddressDialog onCancel={closeDialog} onSave={saveAddress} onLocated={showSnack} />
      )}

      {snack && (
        <SnackBar
          key={snack.id}
          message={snack.message}
          onDismissed={hideSnack}
          durationMs={3000}
          webAlign="center"
        />
      )}
    </CheckoutShell>
  );
}
