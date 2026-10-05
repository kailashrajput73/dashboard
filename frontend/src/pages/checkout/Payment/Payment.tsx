import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from '../../../routes/appRoutes';
import { useCart } from '../../../session/CartContext';
import {
  deliveryOption,
  netBankingBanks,
  paymentDelays,
  paymentMethods,
  placeOrderFromCart,
} from '../../../services/checkout/checkoutModels';
import type {
  OrderConfirmationArgs,
  PaymentArgs,
  PaymentMethodValue,
} from '../../../services/checkout/checkoutModels';
import {
  PaymentValidators,
  formatCardNumber,
  formatExpiry,
} from '../../../services/checkout/paymentValidators';
import { CircularProgress } from '../../../shared/CircularProgress';
import { SnackBar } from '../../../shared/SnackBar';
import { CheckoutShell, OrderSummary, fill, formatInr } from '../shared';
import {
  SectionCard,
  SectionHead,
  SectionIcon,
  SectionTitle,
  SectionSubtitle,
  HiddenRadio,
  RadioMark,
  OptionLabel,
  OptionSubtitle,
  Field,
  Input,
  FieldError,
  Actions,
  BackLink,
  PrimaryButton,
} from '../shared/checkout.styles';
import paymentMock from './Payment.mock.json';
import {
  MethodList,
  MethodCard,
  MethodHeader,
  MethodIcon,
  MethodText,
  MethodDetails,
  FieldRow,
  Select,
  CodNote,
  SecureNote,
} from './Payment.styles';

const { _currentStep, _labels } = paymentMock;

type CardField = 'cardNumber' | 'expiry' | 'cvv' | 'cardName';

/**
 * Checkout step 3 of 4 — choose a payment method and place the order
 * (Flutter `PaymentScreen`, route /checkout/payment). The selected method
 * expands to collect its details. Payment is mocked: "Place Order" validates,
 * waits briefly, empties the cart and replaces this page with the confirmation.
 */
function PaymentView({ args }: { args: PaymentArgs }) {
  const navigate = useNavigate();
  const cart = useCart();
  const delivery = deliveryOption(args.delivery);
  const total = cart.totals.grandTotal + delivery.fee;

  const [method, setMethod] = useState<PaymentMethodValue>('upi');
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState<Record<CardField, string>>({
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardName: '',
  });
  const [bank, setBank] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [snack, setSnack] = useState<{ id: number; message: string } | null>(null);
  const hideSnack = useCallback(() => setSnack(null), []);
  const mounted = useRef(true);
  /** Set once the order is placed, so the emptied cart doesn't redirect to /cart. */
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const errors: Partial<Record<CardField | 'upi', string>> = {};
  if (submitted && method === 'upi') {
    const e = PaymentValidators.upiId(upi);
    if (e) errors.upi = e;
  }
  if (submitted && method === 'card') {
    const checks: Record<CardField, string | null> = {
      cardNumber: PaymentValidators.cardNumber(card.cardNumber),
      expiry: PaymentValidators.expiry(card.expiry),
      cvv: PaymentValidators.cvv(card.cvv),
      cardName: PaymentValidators.cardName(card.cardName),
    };
    for (const [key, value] of Object.entries(checks)) {
      if (value) errors[key as CardField] = value;
    }
  }

  const select = (value: PaymentMethodValue) => {
    if (value === method) return;
    setMethod(value);
    setSubmitted(false);
  };

  const placeOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (placing) return;
    setSubmitted(true);

    const invalid =
      (method === 'upi' && PaymentValidators.upiId(upi)) ||
      (method === 'card' &&
        (PaymentValidators.cardNumber(card.cardNumber) ||
          PaymentValidators.expiry(card.expiry) ||
          PaymentValidators.cvv(card.cvv) ||
          PaymentValidators.cardName(card.cardName)));
    if (invalid) return;
    if (method === 'netBanking' && !bank) {
      setSnack({ id: Date.now(), message: _labels.bankRequired });
      return;
    }

    setPlacing(true);
    await new Promise((resolve) => setTimeout(resolve, paymentDelays.processingMs));
    if (!mounted.current) return;

    setPlaced(true);
    const order = placeOrderFromCart(cart.items, cart.totals.grandTotal, args, method);
    const state: OrderConfirmationArgs = { order };
    // Replace this page so Back can't re-enter a paid checkout.
    navigate(AppRoutes.orderConfirmation, { replace: true, state });
    cart.clear();
  };

  if (cart.isEmpty && !placed) return <Navigate to={AppRoutes.cart} replace />;

  const details = (value: PaymentMethodValue) => {
    switch (value) {
      case 'upi':
        return (
          <Field>
            <Input
              value={upi}
              placeholder={_labels.upiHint}
              aria-label={_labels.upiHint}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={errors.upi ? true : undefined}
              onChange={(e) => setUpi(e.target.value)}
            />
            {errors.upi && <FieldError role="alert">{errors.upi}</FieldError>}
          </Field>
        );
      case 'card':
        return (
          <>
            <Field>
              <Input
                value={card.cardNumber}
                placeholder={_labels.cardNumber}
                aria-label={_labels.cardNumber}
                inputMode="numeric"
                autoComplete="cc-number"
                aria-invalid={errors.cardNumber ? true : undefined}
                onChange={(e) =>
                  setCard((c) => ({ ...c, cardNumber: formatCardNumber(e.target.value) }))
                }
              />
              {errors.cardNumber && <FieldError role="alert">{errors.cardNumber}</FieldError>}
            </Field>
            <FieldRow>
              <Field>
                <Input
                  value={card.expiry}
                  placeholder={_labels.expiry}
                  aria-label={_labels.expiry}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  aria-invalid={errors.expiry ? true : undefined}
                  onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                />
                {errors.expiry && <FieldError role="alert">{errors.expiry}</FieldError>}
              </Field>
              <Field>
                <Input
                  type="password"
                  value={card.cvv}
                  placeholder={_labels.cvv}
                  aria-label={_labels.cvv}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  aria-invalid={errors.cvv ? true : undefined}
                  onChange={(e) =>
                    setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))
                  }
                />
                {errors.cvv && <FieldError role="alert">{errors.cvv}</FieldError>}
              </Field>
            </FieldRow>
            <Field>
              <Input
                value={card.cardName}
                placeholder={_labels.cardName}
                aria-label={_labels.cardName}
                autoComplete="cc-name"
                aria-invalid={errors.cardName ? true : undefined}
                onChange={(e) => setCard((c) => ({ ...c, cardName: e.target.value }))}
              />
              {errors.cardName && <FieldError role="alert">{errors.cardName}</FieldError>}
            </Field>
          </>
        );
      case 'netBanking':
        return (
          <Select
            value={bank}
            aria-label={_labels.bankHint}
            $placeholder={bank === ''}
            onChange={(e) => setBank(e.target.value)}
          >
            <option value="" disabled>
              {_labels.bankHint}
            </option>
            {netBankingBanks.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        );
      case 'cod':
        return (
          <CodNote>
            <i className="pi pi-info-circle" aria-hidden />
            <span>{fill(_labels.codNote, { total: formatInr(total) })}</span>
          </CodNote>
        );
    }
  };

  return (
    <CheckoutShell currentStep={_currentStep} aside={<OrderSummary delivery={delivery} />}>
      <SectionCard as="form" aria-labelledby="payment-title" noValidate onSubmit={placeOrder}>
        <SectionHead>
          <SectionIcon>
            <i className="pi pi-credit-card" aria-hidden />
          </SectionIcon>
          <div>
            <SectionTitle id="payment-title">{_labels.title}</SectionTitle>
            <SectionSubtitle>{_labels.subtitle}</SectionSubtitle>
          </div>
        </SectionHead>

        <MethodList role="radiogroup" aria-labelledby="payment-title">
          {paymentMethods.map((option) => {
            const selected = option.value === method;
            return (
              <MethodCard key={option.value} $selected={selected}>
                <MethodHeader>
                  <HiddenRadio
                    name="payment"
                    value={option.value}
                    checked={selected}
                    onChange={() => select(option.value)}
                  />
                  <RadioMark $selected={selected} aria-hidden />
                  <MethodIcon $selected={selected}>
                    <i className={`pi ${option.icon}`} aria-hidden />
                  </MethodIcon>
                  <MethodText>
                    <OptionLabel>{option.label}</OptionLabel>
                    <OptionSubtitle>{option.subtitle}</OptionSubtitle>
                  </MethodText>
                </MethodHeader>
                {selected && <MethodDetails>{details(option.value)}</MethodDetails>}
              </MethodCard>
            );
          })}
        </MethodList>

        <SecureNote>
          <i className="pi pi-verified" aria-hidden />
          {_labels.secureNote}
        </SecureNote>

        <Actions>
          <BackLink type="button" onClick={() => navigate(-1)} disabled={placing}>
            <i className="pi pi-arrow-left" aria-hidden />
            {_labels.back}
          </BackLink>
          <PrimaryButton type="submit" disabled={placing} aria-busy={placing}>
            {placing ? (
              <CircularProgress size={20} strokeWidth={2.5} color="currentColor" />
            ) : (
              <i className="pi pi-lock" aria-hidden />
            )}
            {fill(_labels.placeOrder, { total: formatInr(total) })}
          </PrimaryButton>
        </Actions>
      </SectionCard>

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

export function Payment() {
  const args = useLocation().state as PaymentArgs | null;

  // Web-only: no router state (opened by URL / after a refresh) → back to step 2.
  if (!args?.address) return <Navigate to={AppRoutes.selectAddress} replace />;

  return <PaymentView args={args} />;
}
