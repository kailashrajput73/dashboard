import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'styled-components';
import { AppRoutes } from '../../../routes/appRoutes';
import { useMaybePop } from '../../../hooks/useMaybePop';
import { CartIconButton } from '../../../shared/CartIconButton';
import { StorefrontHeader } from '../../../shared/StorefrontHeader';
import { CircularProgress } from '../../../shared/CircularProgress';
import { CategoryImage } from '../../../shared/CategoryImage';
import { loadSanitaryWaresCatalog } from '../../../services/catalog/sanitaryWaresRepository';
import type {
  SanitaryCategory,
  SanitaryWaresCatalog,
} from '../../../services/catalog/sanitaryWaresModels';
import {
  cardCatalogueNumbers,
  cardMinPrice,
  cardUnit,
} from '../../../services/catalog/sanitaryCardGroups';
import type { SanitaryCardGroup } from '../../../services/catalog/sanitaryCardGroups';
import type { SanitaryConfiguratorArgs } from '../SanitaryConfigurator';
import { sanitaryIconFor } from './sanitaryIcons';
import categoryMock from './SanitaryWaresCategory.mock.json';
import {
  Screen,
  AppHeaderSlot,
  Header,
  HeaderInner,
  BackSlot,
  SearchSlot,
  HeaderTitle,
  ToolbarHeading,
  HeaderIconButton,
  Centered,
  Sidebar,
  SidebarBrand,
  SidebarBrandText,
  SidebarBrandTitle,
  SidebarBrandMeta,
  SidebarNav,
  AllIcon,
  CountPill,
  SidebarGap,
  SidebarSectionLabel,
  SidebarAllRow,
  SidebarTypeRow,
  TypeThumb,
  RowLabel,
  Content,
  ContentHeading,
  ContentTitle,
  ContentSubtitle,
  ResultsBar,
  ResultsCount,
  Grid,
  StateMessage,
  StateIcon,
  StateTitle,
  StateSubtitle,
  Card,
  CardMedia,
  AddBadge,
  AddBadgeLabel,
  AddBadgeCount,
  CardBody,
  CardPrice,
  Rupee,
  PriceUnit,
  PriceFrom,
  CardCatalogueNos,
  CardTitle,
} from './SanitaryWaresCategory.styles';

const { _header, _sidebar, _emptyState } = categoryMock;

const formatPrice = (value: number) => Math.round(value).toLocaleString('en-IN');

function cardGroupsFor(
  catalog: SanitaryWaresCatalog,
  selected: SanitaryCategory | null,
): SanitaryCardGroup[] {
  const categories = selected == null ? catalog.categories : [selected];
  return categories.flatMap((category) =>
    category.groups.filter((g) => g.products.length > 0).map((group) => ({ category, group })),
  );
}

function CatalogStateMessage({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <StateMessage>
      <StateIcon>
        <i className={`pi ${icon}`} aria-hidden="true" />
      </StateIcon>
      <StateTitle>{title}</StateTitle>
      {subtitle != null && <StateSubtitle>{subtitle}</StateSubtitle>}
    </StateMessage>
  );
}

function SanitaryProductCard({ card, onOpen }: { card: SanitaryCardGroup; onOpen: () => void }) {
  const theme = useTheme();
  const count = card.group.products.length;

  return (
    <Card type="button" onClick={onOpen}>
      <CardMedia>
        <CategoryImage
          imageAsset={card.category.imageAsset}
          fallbackIcon={sanitaryIconFor(card.category.icon)}
          fallbackIconColor={theme.colors.primary}
          fallbackBackground={theme.colors.surfaceContainer}
          fit="contain"
          radius={theme.radius.md}
          iconSize={theme.spacing.space8}
        />
        <AddBadge>
          <AddBadgeLabel>ADD</AddBadgeLabel>
          <AddBadgeCount>{count === 1 ? '1 Variant' : `${count} Variants`}</AddBadgeCount>
        </AddBadge>
      </CardMedia>
      <CardBody>
        <CardPrice>
          {count > 1 && <PriceFrom>From</PriceFrom>}
          <Rupee>₹</Rupee>
          {formatPrice(cardMinPrice(card))}
          <PriceUnit> /{cardUnit(card)}</PriceUnit>
        </CardPrice>
        <CardCatalogueNos title={cardCatalogueNumbers(card)}>
          {cardCatalogueNumbers(card)}
        </CardCatalogueNos>
        <CardTitle title={card.group.name}>{card.group.name}</CardTitle>
      </CardBody>
    </Card>
  );
}

function CategorySidebar({
  categories,
  selectedId,
  counts,
  allCount,
  onSelected,
}: {
  categories: SanitaryCategory[];
  selectedId: string | null;
  counts: Record<string, number>;
  allCount: number;
  onSelected: (id: string | null) => void;
}) {
  const theme = useTheme();
  const allSelected = selectedId == null;

  return (
    <SidebarNav aria-label="Sanitary categories">
      <SidebarAllRow
        type="button"
        $selected={allSelected}
        aria-pressed={allSelected}
        onClick={() => onSelected(null)}
      >
        <AllIcon $selected={allSelected}>
          <i className="pi pi-th-large" aria-hidden="true" />
        </AllIcon>
        {_sidebar.allLabel}
        <CountPill $selected={allSelected}>{allCount}</CountPill>
      </SidebarAllRow>
      <SidebarGap $size={theme.spacing.space3} />
      <SidebarSectionLabel>{_sidebar.sectionLabel}</SidebarSectionLabel>
      {categories.map((category) => {
        const isSelected = selectedId === category.id;
        return (
          <SidebarTypeRow
            key={category.id}
            type="button"
            title={category.name}
            $selected={isSelected}
            aria-pressed={isSelected}
            onClick={() => onSelected(category.id)}
          >
            <TypeThumb $selected={isSelected}>
              <CategoryImage
                imageAsset={category.imageAsset}
                fallbackIcon={sanitaryIconFor(category.icon)}
                fallbackIconColor={theme.colors.primary}
                fallbackBackground={theme.colors.surface}
                fit="contain"
                iconSize={16}
              />
            </TypeThumb>
            <RowLabel $selected={isSelected}>{category.shortName}</RowLabel>
            <CountPill $selected={isSelected}>{counts[category.id] ?? 0}</CountPill>
          </SidebarTypeRow>
        );
      })}
      <SidebarGap $size={theme.spacing.space2} />
    </SidebarNav>
  );
}

type CatalogState =
  { status: 'loading' } | { status: 'done'; catalog: SanitaryWaresCatalog | null };

/**
 * Category-level entry screen for Sanitary Wares (Flutter
 * `SanitaryWaresCategoryScreen`). Same layout and flow as PipesFittingCategory —
 * the sidebar picks a price-list category and the grid updates in place;
 * tapping a card opens the configurator. No Sort/Size/Brand/Class filters.
 */
export function SanitaryWaresCategory() {
  const theme = useTheme();
  const navigate = useNavigate();
  const maybePop = useMaybePop();

  const [catalogState, setCatalogState] = useState<CatalogState>({ status: 'loading' });
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadSanitaryWaresCatalog()
      .then((catalog) => active && setCatalogState({ status: 'done', catalog }))
      .catch(() => active && setCatalogState({ status: 'done', catalog: null }));
    return () => {
      active = false;
    };
  }, []);

  const catalog = catalogState.status === 'done' ? catalogState.catalog : null;
  const selected = catalog?.categories.find((c) => c.id === categoryId) ?? null;

  const cards = useMemo(
    () => (catalog ? cardGroupsFor(catalog, selected) : []),
    [catalog, selected],
  );

  /** Product-family count per sidebar category (web count pills). */
  const counts = useMemo(
    () =>
      Object.fromEntries(
        (catalog?.categories ?? []).map((c) => [c.id, cardGroupsFor(catalog!, c).length]),
      ),
    [catalog],
  );
  const allCount = catalog ? cardGroupsFor(catalog, null).length : 0;

  const title = selected?.name ?? catalog?.category ?? '';
  const subtitle = selected?.description ?? catalog?.description ?? '';

  const openConfigurator = (index: number) => {
    const state: SanitaryConfiguratorArgs = { cards, initialCardIndex: index };
    navigate(AppRoutes.sanitaryConfigurator, { state });
  };

  return (
    <Screen>
      <AppHeaderSlot>
        <StorefrontHeader sticky={false} />
      </AppHeaderSlot>
      <Header>
        <HeaderInner>
          <BackSlot>
            <HeaderIconButton type="button" aria-label="Back" onClick={maybePop}>
              <i className="pi pi-arrow-left" aria-hidden="true" />
            </HeaderIconButton>
          </BackSlot>
          <HeaderTitle>{_header.title}</HeaderTitle>
          {catalog != null && (
            <ToolbarHeading>
              <ContentTitle>{title}</ContentTitle>
              <ContentSubtitle>{subtitle}</ContentSubtitle>
            </ToolbarHeading>
          )}
          <SearchSlot>
            <HeaderIconButton
              type="button"
              aria-label="Search"
              onClick={() => navigate(AppRoutes.search)}
            >
              <i className="pi pi-search" aria-hidden="true" />
            </HeaderIconButton>
            <CartIconButton />
          </SearchSlot>
        </HeaderInner>
      </Header>

      <Sidebar $hiddenOnMobile={catalog == null}>
        <SidebarBrand>
          <HeaderIconButton type="button" aria-label="Back" onClick={maybePop}>
            <i className="pi pi-arrow-left" aria-hidden="true" />
          </HeaderIconButton>
          <SidebarBrandText>
            <SidebarBrandTitle>{_header.title}</SidebarBrandTitle>
            {catalog != null && <SidebarBrandMeta>{allCount} product groups</SidebarBrandMeta>}
          </SidebarBrandText>
        </SidebarBrand>
        {catalog != null && (
          <CategorySidebar
            categories={catalog.categories}
            selectedId={categoryId}
            counts={counts}
            allCount={allCount}
            onSelected={setCategoryId}
          />
        )}
      </Sidebar>

      <Content $fullOnMobile={catalog == null}>
        {catalogState.status === 'loading' ? (
          <Centered>
            <CircularProgress size={36} color={theme.colors.primary} />
          </Centered>
        ) : catalog == null ? (
          <CatalogStateMessage
            icon="pi-exclamation-circle"
            title="Unable to load catalog"
            subtitle="Please check your connection and try again."
          />
        ) : (
          <>
            <ContentHeading>
              <ContentTitle>{title}</ContentTitle>
              <ContentSubtitle>{subtitle}</ContentSubtitle>
            </ContentHeading>
            <ResultsBar>
              <ResultsCount>
                <strong>{cards.length}</strong> {cards.length === 1 ? 'result' : 'results'}
              </ResultsCount>
            </ResultsBar>
            {cards.length === 0 ? (
              <CatalogStateMessage
                icon="pi-box"
                title={_emptyState.title}
                subtitle={_emptyState.subtitle}
              />
            ) : (
              <Grid>
                {cards.map((card, index) => (
                  <SanitaryProductCard
                    key={`${card.category.id}/${card.group.name}`}
                    card={card}
                    onOpen={() => openConfigurator(index)}
                  />
                ))}
              </Grid>
            )}
          </>
        )}
      </Content>
    </Screen>
  );
}
