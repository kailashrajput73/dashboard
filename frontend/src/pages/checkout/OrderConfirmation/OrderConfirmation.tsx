import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from '../../../routes/appRoutes';
import {
  addressLabel,
  customerFirstName,
  deliveryOption,
  isOrderPaid,
  paymentMethods,
} from '../../../services/checkout/checkoutModels';
import type { OrderConfirmationArgs, PlacedOrder } from '../../../services/checkout/checkoutModels';
import { CheckoutShell, fill, formatInr } from '../shared';
import { PrimaryButton } from '../shared/checkout.styles';
import confirmationMock from './OrderConfirmation.mock.json';
import {
  Hero,
  SuccessHalo,
  SuccessDot,
  Badge,
  Heading,
  OrderId,
  Cards,
  InfoCard,
  InfoRow,
  InfoLabel,
  InfoValue,
  Status,
  SummaryHeading,
  LineList,
  Line,
  TotalLine,
  TotalLabel,
  TotalValue,
  ContinueBar,
} from './OrderConfirmation.styles';

const { _currentStep, _labels } = confirmationMock;

/** "3 - 5 business days" → "3 - 5 Business Days". */
const titleCase = (text: string) =>
  text
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

function OrderConfirmationView({ order }: { order: PlacedOrder }) {
  const navigate = useNavigate();
  const paid = isOrderPaid(order);
  const { address } = order;
  const count = order.lines.length;
  const status = paymentMethods.find((m) => m.value === order.method)?.status ?? '';

  // Flutter `popUntil(isFirst)` → back to where the user shopped.
  const continueShopping = () => navigate(AppRoutes.categoryBrowse, { replace: true });

  // Flutter `PopScope(canPop: false)`: browser Back also continues shopping
  // instead of stepping into the finished checkout.
  useEffect(() => {
    window.history.pushState(window.history.state, '');
    const onPop = () => navigate(AppRoutes.categoryBrowse, { replace: true });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [navigate]);

  return (
    <CheckoutShell currentStep={_currentStep}>
      <Hero>
        <SuccessHalo aria-hidden>
          <SuccessDot>
            <i className="pi pi-check" />
          </SuccessDot>
        </SuccessHalo>
        <Badge>{_labels.badge}</Badge>
        <Heading>{fill(_labels.thankYou, { name: customerFirstName(order) })}</Heading>
        <OrderId>
          {_labels.orderId}
          <strong>{order.orderId}</strong>
        </OrderId>
      </Hero>

      <Cards>
        <InfoCard>
          <InfoRow $divided>
            <InfoLabel>{_labels.estimatedDelivery}</InfoLabel>
            <InfoValue $strong>{titleCase(deliveryOption(order.delivery).eta)}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>{_labels.shippingTo}</InfoLabel>
            <InfoValue title={`${address.house}, ${address.area}, ${address.city}`}>
              {addressLabel(address)}, {address.house}, {address.city}
            </InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>{_labels.paymentStatus}</InfoLabel>
            <Status $paid={paid}>
              <i className={`pi ${paid ? 'pi-check-circle' : 'pi-clock'}`} aria-hidden />
              {status}
            </Status>
          </InfoRow>
        </InfoCard>

        <InfoCard>
          <SummaryHeading>
            {fill(_labels.summary, {
              count,
              noun: count === 1 ? _labels.item : _labels.items,
            })}
          </SummaryHeading>
          <LineList>
            {order.lines.map((line) => (
              <Line key={line.name}>
                <span>{fill(_labels.lineName, { qty: line.quantity, name: line.name })}</span>
                <span>{formatInr(line.total)}</span>
              </Line>
            ))}
          </LineList>
          <TotalLine>
            <TotalLabel>{paid ? _labels.totalPaid : _labels.amountPayable}</TotalLabel>
            <TotalValue>{formatInr(order.total)}</TotalValue>
          </TotalLine>
        </InfoCard>
      </Cards>

      <ContinueBar>
        <PrimaryButton type="button" onClick={continueShopping}>
          {_labels.continueShopping}
          <i className="pi pi-home" aria-hidden />
        </PrimaryButton>
      </ContinueBar>
    </CheckoutShell>
  );
}

/**
 * Checkout step 4 of 4 — order placed (Flutter `OrderConfirmationScreen`,
 * route /checkout/confirmation). Payment replaced its own history entry with
 * this one and emptied the cart.
 */
export function OrderConfirmation() {
  const args = useLocation().state as OrderConfirmationArgs | null;

  // Web-only: no order in router state (opened by URL) → nothing to confirm.
  if (!args?.order) return <Navigate to={AppRoutes.categoryBrowse} replace />;

  return <OrderConfirmationView order={args.order} />;
}
