import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTheme } from 'styled-components';
import { useCart } from '../../../session/CartContext';
import type { CartCoupon } from '../../../session/CartContext';
import type { DeliveryOption } from '../../../services/checkout/checkoutModels';
import { CategoryImage } from '../../../shared/CategoryImage';
import shellMock from './checkoutShell.mock.json';
import { fill, formatInr } from './format';
import {
  SummaryCard,
  SummaryHead,
  SectionIcon,
  SectionSubtitle,
  SummaryTitle,
  SummaryBody,
  SummaryItems,
  SummaryItem,
  Thumb,
  ItemText,
  ItemName,
  ItemQty,
  ItemPrices,
  ItemTotal,
  ItemUnit,
  Rows,
  Row,
  RowValue,
  RowHint,
  TotalRow,
  TotalLabel,
  TotalValue,
  CouponBox,
  CouponToggle,
  CouponForm,
  CouponInput,
  CouponApply,
  CouponError,
  CouponApplied,
  TextButton,
  SecureBox,
  SecureTitle,
  SecureText,
  Marks,
  Mark,
  Mastercard,
} from './checkout.styles';

const { _summary: copy } = shellMock;

interface OrderSummaryProps {
  /** Chosen delivery option; omitted on the cart step (not picked yet). */
  delivery?: DeliveryOption;
  /** Lists the cart lines; the cart step shows them in its main column instead. */
  withItems?: boolean;
  /** Shows the "Have a Coupon?" box (cart and address steps). */
  withCoupon?: boolean;
  onCouponApplied?: (coupon: CartCoupon) => void;
}

/**
 * Sticky order summary for checkout steps 1–3. Rows follow Flutter
 * `showCheckoutPriceBreakdown`: subtotal, discount, shipping, GST, then the
 * chosen delivery option's fee.
 */
export function OrderSummary({
  delivery,
  withItems = true,
  withCoupon = false,
  onCouponApplied,
}: OrderSummaryProps) {
  const theme = useTheme();
  const cart = useCart();
  const { totals, coupon } = cart;
  const total = totals.grandTotal + (delivery?.fee ?? 0);

  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const applyCoupon = (event: FormEvent) => {
    event.preventDefault();
    if (!couponInput.trim()) {
      setCouponError(copy.emptyCoupon);
      return;
    }
    const match = cart.applyCoupon(couponInput);
    if (!match) {
      setCouponError(copy.invalidCoupon);
      return;
    }
    setCouponInput('');
    setCouponError(null);
    setCouponOpen(false);
    onCouponApplied?.(match);
  };

  const count = cart.items.length;

  return (
    <SummaryCard aria-labelledby="summary-title">
      <SummaryHead>
        <SectionIcon>
          <i className="pi pi-shopping-cart" aria-hidden />
        </SectionIcon>
        <div>
          <SummaryTitle id="summary-title">{copy.orderSummary}</SummaryTitle>
          <SectionSubtitle>
            {fill(count === 1 ? copy.itemCount : copy.itemsCount, { count })}
          </SectionSubtitle>
        </div>
      </SummaryHead>

      <SummaryBody>
        {withItems && (
          <SummaryItems>
            {cart.items.map(({ variant, quantity }) => (
              <SummaryItem key={variant.id}>
                <Thumb>
                  <CategoryImage
                    imageAsset={variant.imageAsset}
                    fallbackIcon="pi-box"
                    fallbackIconColor={theme.colors.outline}
                    fallbackBackground={theme.colors.surfaceContainer}
                    fit="contain"
                    iconSize={theme.spacing.space6}
                  />
                </Thumb>
                <ItemText>
                  <ItemName>{variant.productName}</ItemName>
                  <ItemQty>{fill(copy.qty, { qty: quantity })}</ItemQty>
                </ItemText>
                <ItemPrices>
                  <ItemTotal>{formatInr(variant.price * quantity)}</ItemTotal>
                  <ItemUnit>
                    {fill(copy.perUnit, { price: formatInr(variant.price), unit: variant.unit })}
                  </ItemUnit>
                </ItemPrices>
              </SummaryItem>
            ))}
          </SummaryItems>
        )}

        <Rows>
          <Row>
            <span>{copy.subtotal}</span>
            <RowValue>{formatInr(totals.subtotal)}</RowValue>
          </Row>
          {totals.discount > 0 && (
            <Row>
              <span>{fill(copy.discount, { code: coupon?.code ?? '' })}</span>
              <RowValue $tone="success">− {formatInr(totals.discount)}</RowValue>
            </Row>
          )}
          <Row>
            <span>{copy.shipping}</span>
            {totals.shipping === 0 ? (
              <RowValue $tone="success">{copy.free}</RowValue>
            ) : (
              <RowValue>{formatInr(totals.shipping)}</RowValue>
            )}
          </Row>
          {!delivery && totals.shipping > 0 && (
            <RowHint>
              {fill(copy.freeShippingHint, { amount: formatInr(totals.toFreeShipping) })}
            </RowHint>
          )}
          <Row>
            <span>{copy.tax}</span>
            <RowValue>{formatInr(totals.gst)}</RowValue>
          </Row>
          {delivery && (
            <Row>
              <span>{delivery.label}</span>
              {delivery.fee === 0 ? (
                <RowValue $tone="success">{copy.free}</RowValue>
              ) : (
                <RowValue>{formatInr(delivery.fee)}</RowValue>
              )}
            </Row>
          )}
        </Rows>

        <TotalRow>
          <TotalLabel>{copy.total}</TotalLabel>
          <TotalValue>{formatInr(total)}</TotalValue>
        </TotalRow>

        {withCoupon && (
          <CouponBox $applied={coupon !== null}>
            {coupon ? (
              <CouponApplied>
                <i className="pi pi-check-circle" aria-hidden />
                <span>
                  <strong>{coupon.code}</strong>
                  {coupon.label}
                </span>
                <TextButton type="button" onClick={cart.removeCoupon}>
                  {copy.remove}
                </TextButton>
              </CouponApplied>
            ) : (
              <>
                <CouponToggle
                  type="button"
                  aria-expanded={couponOpen}
                  onClick={() => setCouponOpen((open) => !open)}
                >
                  <i className="pi pi-ticket" aria-hidden />
                  <span>{copy.haveCoupon}</span>
                  <i className="pi pi-chevron-right" aria-hidden />
                </CouponToggle>
                {couponOpen && (
                  <CouponForm onSubmit={applyCoupon}>
                    <CouponInput
                      autoFocus
                      value={couponInput}
                      placeholder={copy.couponPlaceholder}
                      aria-label={copy.haveCoupon}
                      aria-invalid={couponError !== null}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        setCouponError(null);
                      }}
                    />
                    <CouponApply type="submit">{copy.apply}</CouponApply>
                  </CouponForm>
                )}
                {couponOpen && couponError && <CouponError role="alert">{couponError}</CouponError>}
              </>
            )}
          </CouponBox>
        )}

        <SecureBox>
          <i className="pi pi-verified" aria-hidden />
          <div>
            <SecureTitle>{copy.secureTitle}</SecureTitle>
            <SecureText>{copy.secureBody}</SecureText>
          </div>
          <Marks aria-label="Visa, Mastercard, RuPay, UPI">
            <Mark $brand="visa">VISA</Mark>
            <Mastercard aria-hidden />
            <Mark $brand="rupay">RuPay</Mark>
            <Mark $brand="upi">UPI</Mark>
          </Marks>
        </SecureBox>
      </SummaryBody>
    </SummaryCard>
  );
}
