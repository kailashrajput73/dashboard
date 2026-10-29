import { useCallback, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'styled-components';
import mockData from '../../../mocks/mockData.json';
import { AppRoutes } from '../../../routes/appRoutes';
import { useMaybePop } from '../../../hooks/useMaybePop';
import { useCart } from '../../../session/CartContext';
import { CategoryImage } from '../../../shared/CategoryImage';
import { CartIconButton } from '../../../shared/CartIconButton';
import { StorefrontHeader } from '../../../shared/StorefrontHeader';
import { SnackBar } from '../../../shared/SnackBar';
import { cardUnit, fittingVariantFor } from '../../../services/catalog/fittingCardGroups';
import type { FittingCardGroup } from '../../../services/catalog/fittingCardGroups';
import type { FittingProduct } from '../../../services/catalog/fittingsModels';
import { ConfiguratorDropdown } from '../PipeConfigurator/PipeConfigurator';
import { fittingIconFor } from '../FittingsCategory';
import configuratorMock from './FittingConfigurator.mock.json';
import {
  Screen,
  TopBar,
  TopBarInner,
  BackButton,
  TopBarContext,
  SearchPill,
  MobileCartSlot,
  Body,
  Media,
  Details,
  DetailsInner,
  Eyebrow,
  BrandChip,
  Title,
  FieldLabel,
  FieldGap,
  SpecSheet,
  SpecTitle,
  SpecRows,
  SpecRow,
  CartCard,
  CartInfo,
  CartLabel,
  CartPrice,
  CartUnit,
  CartSize,
  AddToCartButton,
} from './FittingConfigurator.styles';

/**
 * Route `state` for the configurator. Flutter passes `cards` and
 * `initialCard`; router state is structured-cloned, so the card is passed by
 * index to keep the identity check in `onProductChanged` working.
 */
export interface FittingConfiguratorArgs {
  cards: FittingCardGroup[];
  initialCardIndex: number;
}

const { _addToCart, _labels } = configuratorMock;

const formatPrice = (value: number) => Math.round(value).toLocaleString('en-IN');

function FittingConfiguratorView({ cards, initialCardIndex }: FittingConfiguratorArgs) {
  const theme = useTheme();
  const navigate = useNavigate();
  const maybePop = useMaybePop();
  const { addVariant } = useCart();

  const initialCard = cards[initialCardIndex];
  const [cardIndex, setCardIndex] = useState(initialCardIndex);
  const [product, setProduct] = useState<FittingProduct>(initialCard.group.products[0]);
  const [snackBar, setSnackBar] = useState<{ id: number; message: string } | null>(null);
  const dismissSnackBar = useCallback(() => setSnackBar(null), []);

  const card = cards[cardIndex];

  /** `_siblingCards` — product families of the initially opened card's category. */
  const siblingIndexes = cards
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.category.id === initialCard.category.id)
    .map(({ i }) => i);

  const variantOptions = card.group.products.map((p) => p.variant);
  const productOptions = siblingIndexes.map((i) => cards[i].group.name);

  const onVariantChanged = (variant: string) => {
    const match = card.group.products.find((p) => p.variant === variant);
    if (match) setProduct(match);
  };

  const onProductChanged = (name: string) => {
    const nextIndex = siblingIndexes.find((i) => cards[i].group.name === name);
    if (nextIndex == null || nextIndex === cardIndex) return;
    setCardIndex(nextIndex);
    setProduct(cards[nextIndex].group.products[0]);
  };

  const addToCart = () => {
    addVariant(fittingVariantFor(product, card));
    setSnackBar((prev) => ({
      id: (prev?.id ?? 0) + 1,
      message: `${product.catalogueNo} ${product.productName} added to cart`,
    }));
  };

  const specRows: [string, string][] = [
    [_labels.catalogueNo, product.catalogueNo],
    ...Object.entries(product.specs),
    ...(product.hsnCode != null ? [[_labels.hsnCode, product.hsnCode] as [string, string]] : []),
    ...(product.packingQty != null
      ? [[_labels.standardPacking, `${product.packingQty} ${product.unit}`] as [string, string]]
      : []),
  ];

  return (
    <Screen>
      <StorefrontHeader webOnly sticky={false} />
      <TopBar>
        <TopBarInner>
          <BackButton type="button" aria-label="Back" onClick={maybePop}>
            <i className="pi pi-arrow-left" aria-hidden="true" />
          </BackButton>
          <TopBarContext>{card.category.name}</TopBarContext>
          <SearchPill type="button" onClick={() => navigate(AppRoutes.search)}>
            <i className="pi pi-search" aria-hidden="true" />
            {_labels.searchProducts}
          </SearchPill>
          <MobileCartSlot>
            <CartIconButton />
          </MobileCartSlot>
        </TopBarInner>
      </TopBar>

      <Body>
        <Media>
          <CategoryImage
            imageAsset={card.category.imageAsset}
            fallbackIcon={fittingIconFor(card.category.icon)}
            fallbackIconColor={theme.colors.primary}
            fallbackBackground={theme.colors.surfaceContainer}
            fit="contain"
            radius={theme.radius.lg}
            iconSize={72}
          />
        </Media>

        <Details>
          <DetailsInner>
            <Eyebrow>
              <BrandChip>{product.catalogueNo}</BrandChip>
              {card.category.name}
            </Eyebrow>
            <Title>
              {product.productName} – {product.variant}
            </Title>
            <FieldLabel>{_labels.variant}</FieldLabel>
            <ConfiguratorDropdown
              value={product.variant}
              options={variantOptions}
              hint="Select variant"
              onChange={variantOptions.length <= 1 ? null : onVariantChanged}
            />
            <FieldGap $size={theme.spacing.space2} />
            <FieldLabel>{_labels.product}</FieldLabel>
            <ConfiguratorDropdown
              value={card.group.name}
              options={productOptions}
              hint="Select product"
              onChange={productOptions.length <= 1 ? null : onProductChanged}
            />

            <SpecSheet aria-label={_labels.specifications}>
              <SpecTitle>{_labels.specifications}</SpecTitle>
              <SpecRows>
                {specRows.map(([label, value], i) => (
                  <SpecRow key={label} $striped={i % 2 === 0}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </SpecRow>
                ))}
              </SpecRows>
            </SpecSheet>

            <CartCard>
              <CartInfo>
                <CartLabel>{_labels.selectedVariant}</CartLabel>
                <CartPrice>
                  ₹{formatPrice(product.price)}
                  <CartUnit>/ {cardUnit(card)}</CartUnit>
                </CartPrice>
                <CartSize>
                  {product.catalogueNo} · {product.variant}
                </CartSize>
              </CartInfo>
              <AddToCartButton type="button" onClick={addToCart}>
                <i className="pi pi-cart-plus" aria-hidden="true" />
                Add to Cart
              </AddToCartButton>
            </CartCard>
          </DetailsInner>
        </Details>
      </Body>

      {snackBar && (
        <SnackBar
          key={snackBar.id}
          message={snackBar.message}
          onDismissed={dismissSnackBar}
          durationMs={_addToCart.snackBarDurationMs}
          webAlign="center"
          action={{
            label: _addToCart.viewCartLabel,
            onPressed: () => navigate(AppRoutes.cart),
          }}
        />
      )}
    </Screen>
  );
}

/**
 * Product configurator opened from a card in FittingsCategory (Flutter
 * `_FittingConfiguratorScreen`): Variant + Product pickers, the spec
 * sheet and an "Add to Cart" action.
 */
export function FittingConfigurator() {
  const args = useLocation().state as FittingConfiguratorArgs | null;

  // Web-only: no data without router state (opened by URL / after a refresh),
  // so fall back to the Fittings category screen.
  if (!args || !args.cards?.[args.initialCardIndex]?.group.products.length) {
    return (
      <Navigate
        to={AppRoutes.categoryBrowse}
        replace
        state={{ categoryId: mockData.catalog.fittingsCategoryId }}
      />
    );
  }

  return <FittingConfiguratorView {...args} />;
}
