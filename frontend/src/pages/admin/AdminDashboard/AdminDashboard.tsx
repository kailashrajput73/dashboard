import { useCallback, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppRoutes } from '../../../routes/appRoutes';
import { useSession } from '../../../session/SessionContext';
import { StorefrontHeader } from '../../../shared/StorefrontHeader';
import { StorefrontFooter } from '../../../shared/StorefrontFooter';
import { WebSideMenu } from '../../../shared/WebSideMenu';
import { SnackBar } from '../../../shared/SnackBar';
import { userInitials } from '../../../shared/userInitials';
import { fill } from '../../checkout/shared/format';
import data from '../../../mocks/admin_dashboard_mock_data.json';
import {
  daysOfCover,
  formatCount,
  formatDelta,
  formatRupees,
  formatRupeesCompact,
} from '../../../services/admin/adminDashboardModels';
import type {
  ActivityRow,
  CategorySalesRow,
  DashboardKpi,
  DispatchRow,
  DispatchStatus,
  QuotationRow,
  QuotationStatus,
  ReferralPartnerRow,
  RevenuePoint,
  StockAlertRow,
  StockStatus,
  TopProductRow,
  WarehouseRow,
} from '../../../services/admin/adminDashboardModels';
import type { UserRole } from '../../../services/auth/authModels';
import { useAdminMenu } from '../adminMenu';
import { RevenueTrendChart } from './RevenueTrendChart';
import mock from './AdminDashboard.mock.json';
import * as S from './AdminDashboard.styles';
import type { Tone } from './AdminDashboard.styles';

const L = mock._labels;
const kpis = data.kpis as DashboardKpi[];
const trend = data.revenueTrend.points as RevenuePoint[];
const categorySales = data.categorySales.rows as CategorySalesRow[];
const topProducts = data.topProducts.rows as TopProductRow[];
const stockAlerts = data.stockAlerts.rows as StockAlertRow[];
const dispatches = data.dispatches.recent as DispatchRow[];
const warehouses = data.warehouses.rows as WarehouseRow[];
const partners = data.referralPartners.rows as ReferralPartnerRow[];
const activity = data.recentActivity as ActivityRow[];
const seedQuotations = data.quotations.recent as QuotationRow[];
const roleLabel = (role: UserRole) => mock._roleLabels[role];

const stockTone: Record<StockStatus, Tone> = {
  outOfStock: 'critical',
  critical: 'serious',
  low: 'warning',
};
const quotationTone: Record<QuotationStatus, Tone> = { pending: 'warning', sold: 'good' };
const dispatchTone: Record<DispatchStatus, Tone> = {
  readyToDispatch: 'neutral',
  inTransit: 'info',
  delivered: 'good',
  delayed: 'critical',
};
/** Space used: fine < 75%, filling up < 90%, nearly full from 90%. */
const utilizationTone = (pct: number): Tone =>
  pct >= 90 ? 'critical' : pct >= 75 ? 'warning' : 'info';

const formatKpi = (kpi: DashboardKpi) =>
  kpi.format === 'currency' ? formatRupeesCompact(kpi.value) : formatCount(kpi.value);

/**
 * Web-only admin dashboard: the storefront chrome (StorefrontHeader, side
 * menu with Dashboard + Product master, StorefrontFooter) around a business
 * overview — sales, popular products, stock alerts, quotations, dispatches,
 * warehouses, referral partners and users. All data is sample data from
 * `admin_dashboard_mock_data.json`.
 */
export function AdminDashboard() {
  const { isLoggedIn, user } = useSession();
  const adminMenu = useAdminMenu('dashboard');
  const [quotations, setQuotations] = useState(seedQuotations);
  const [showTrendTable, setShowTrendTable] = useState(false);
  const [snack, setSnack] = useState<{ key: number; message: string } | null>(null);
  const hideSnack = useCallback(() => setSnack(null), []);

  if (!isLoggedIn || !user.isAdmin) return <Navigate to={AppRoutes.main} replace />;

  const notify = (message: string) => setSnack({ key: Date.now(), message });
  const comingSoon = (action: string) => notify(fill(mock._comingSoon, { action }));

  const confirmSale = (row: QuotationRow) => {
    setQuotations((rows) =>
      rows.map((q) => (q.id === row.id ? { ...q, status: 'sold' as const } : q)),
    );
    notify(`Sale confirmed for ${row.quotationLabel}. Rewards credited.`);
  };

  const trendTotal = trend.slice(-4).reduce((sum, p) => sum + p.revenue, 0);
  const trendPrev = trend.slice(-8, -4).reduce((sum, p) => sum + p.revenue, 0);
  const trendDelta = ((trendTotal - trendPrev) / trendPrev) * 100;
  const categoryTotal = categorySales.reduce((sum, r) => sum + r.revenue, 0);
  const categoryMax = Math.max(...categorySales.map((r) => r.revenue));
  const dispatchTotal = data.dispatches.statuses.reduce((sum, s) => sum + s.count, 0);
  const roleMax = Math.max(...data.users.byRole.map((r) => r.count));
  // Sales confirmed on this page move from the pending to the sold totals.
  const confirmed = quotations.filter((r, i) => r.status !== seedQuotations[i].status);
  const confirmedValue = confirmed.reduce((sum, r) => sum + r.grandTotal, 0);
  const { summary } = data.quotations;
  const pendingCount = summary.pending - confirmed.length;
  const soldCount = summary.sold + confirmed.length;
  const conversionPct = Math.round((soldCount / (soldCount + pendingCount)) * 100);

  return (
    <S.Shell>
      <StorefrontHeader />

      <S.ShellBody>
        <WebSideMenu {...adminMenu} />

        <S.Main>
          {/* ── Page head ─────────────────────────────────────────────── */}
          <S.PageHead>
            <S.HeadText>
              <S.Title>{mock._title}</S.Title>
              <S.Greeting>{fill(mock._greeting, { name: user.name })}</S.Greeting>
              <S.MetaRow>
                <S.MetaChip>
                  <i className="pi pi-calendar" aria-hidden />
                  {data.period.label} · {data.period.range}
                </S.MetaChip>
                <S.MetaText>
                  {mock._updatedPrefix} {data.period.lastUpdated}
                </S.MetaText>
              </S.MetaRow>
            </S.HeadText>
            <S.QuickActions>
              {mock._quickActions.map((action, i) => (
                <S.QuickAction
                  key={action.id}
                  type="button"
                  $primary={i === 0}
                  onClick={() => comingSoon(action.label)}
                >
                  <i className={`pi ${action.icon}`} aria-hidden />
                  {action.label}
                </S.QuickAction>
              ))}
            </S.QuickActions>
          </S.PageHead>

          {/* ── KPI tiles ─────────────────────────────────────────────── */}
          <S.KpiGrid aria-label="Key figures">
            {kpis.map((kpi, i) => {
              const good = kpi.deltaPct === 0 || kpi.deltaPct > 0 === kpi.upIsGood;
              return (
                <S.KpiTile key={kpi.id} $index={i}>
                  <S.KpiTop>
                    <S.KpiLabel>{kpi.label}</S.KpiLabel>
                    <S.KpiIcon>
                      <i className={`pi ${kpi.icon}`} aria-hidden />
                    </S.KpiIcon>
                  </S.KpiTop>
                  <S.KpiValue>{formatKpi(kpi)}</S.KpiValue>
                  <S.KpiFoot>
                    <S.Delta $good={good} title={data.period.comparedTo}>
                      <i
                        className={`pi ${kpi.deltaPct >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'}`}
                        aria-hidden
                      />
                      {formatDelta(kpi.deltaPct)}
                      <S.VisuallyHidden> {data.period.comparedTo}</S.VisuallyHidden>
                    </S.Delta>
                    <S.KpiCaption>{kpi.caption}</S.KpiCaption>
                  </S.KpiFoot>
                </S.KpiTile>
              );
            })}
          </S.KpiGrid>

          <S.Grid>
            {/* ── Revenue trend ───────────────────────────────────────── */}
            <S.Card $lg={8} aria-labelledby="admin-trend">
              <S.CardHead>
                <div>
                  <S.CardTitle id="admin-trend">{data.revenueTrend.title}</S.CardTitle>
                  <S.CardSubtitle>{data.revenueTrend.subtitle}</S.CardSubtitle>
                </div>
                <S.TextButton type="button" onClick={() => setShowTrendTable((v) => !v)}>
                  <i
                    className={`pi ${showTrendTable ? 'pi-chart-line' : 'pi-table'}`}
                    aria-hidden
                  />
                  {showTrendTable ? L.showChart : L.showTable}
                </S.TextButton>
              </S.CardHead>
              <S.TrendSummary>
                <S.TrendValue>{formatRupeesCompact(trendTotal)}</S.TrendValue>
                <S.Delta $good={trendDelta >= 0}>
                  <i
                    className={`pi ${trendDelta >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'}`}
                    aria-hidden
                  />
                  {formatDelta(trendDelta)}
                </S.Delta>
                <S.KpiCaption>last 4 weeks, vs the 4 weeks before</S.KpiCaption>
              </S.TrendSummary>
              {showTrendTable ? (
                <S.TableScroll>
                  <S.Table>
                    <thead>
                      <tr>
                        <th scope="col">{L.week}</th>
                        <S.NumHead scope="col">{L.revenue}</S.NumHead>
                        <S.NumHead scope="col">{L.orders}</S.NumHead>
                      </tr>
                    </thead>
                    <tbody>
                      {trend.map((p) => (
                        <tr key={p.weekStart}>
                          <td>{p.label}</td>
                          <S.NumCell>{formatRupees(p.revenue)}</S.NumCell>
                          <S.NumCell>{formatCount(p.orders)}</S.NumCell>
                        </tr>
                      ))}
                    </tbody>
                  </S.Table>
                </S.TableScroll>
              ) : (
                <RevenueTrendChart
                  points={trend}
                  title={data.revenueTrend.title}
                  labels={{ week: L.week, revenue: L.revenue, orders: L.orders }}
                />
              )}
            </S.Card>

            {/* ── Sales by category ───────────────────────────────────── */}
            <S.Card $lg={4} aria-labelledby="admin-category">
              <S.CardHead>
                <div>
                  <S.CardTitle id="admin-category">{data.categorySales.title}</S.CardTitle>
                  <S.CardSubtitle>{data.categorySales.subtitle}</S.CardSubtitle>
                </div>
              </S.CardHead>
              <S.BarList>
                {categorySales.map((row) => (
                  <S.BarRow
                    key={row.categoryId}
                    title={`${row.name}: ${formatRupees(row.revenue)} · ${formatCount(row.orders)} ${L.orders.toLowerCase()}`}
                  >
                    <S.BarThumb src={row.imageAsset} alt="" loading="lazy" />
                    <S.BarLabelRow>
                      <S.BarName>{row.name}</S.BarName>
                      <S.BarValue>
                        <strong>{formatRupeesCompact(row.revenue)}</strong> ·{' '}
                        {Math.round((row.revenue / categoryTotal) * 100)}%
                      </S.BarValue>
                    </S.BarLabelRow>
                    <S.BarTrack>
                      <S.BarFill $pct={(row.revenue / categoryMax) * 100} />
                    </S.BarTrack>
                  </S.BarRow>
                ))}
              </S.BarList>
            </S.Card>

            {/* ── Popular products ────────────────────────────────────── */}
            <S.Card $lg={7} aria-labelledby="admin-top">
              <S.CardHead>
                <div>
                  <S.CardTitle id="admin-top">{data.topProducts.title}</S.CardTitle>
                  <S.CardSubtitle>{data.topProducts.subtitle}</S.CardSubtitle>
                </div>
                <S.TextButton type="button" onClick={() => comingSoon(data.topProducts.title)}>
                  {L.viewAll}
                  <i className="pi pi-arrow-right" aria-hidden />
                </S.TextButton>
              </S.CardHead>
              <S.TableScroll>
                <S.Table>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">{L.product}</th>
                      <S.NumHead scope="col">{L.unitsSold}</S.NumHead>
                      <S.NumHead scope="col">{L.revenue}</S.NumHead>
                      <S.NumHead scope="col">{L.trend}</S.NumHead>
                      <S.NumHead scope="col">{L.stockLeft}</S.NumHead>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((row, i) => {
                      const alert = stockAlerts.find((a) => a.sku === row.sku);
                      return (
                        <tr key={row.sku}>
                          <td>
                            <S.Rank>{i + 1}</S.Rank>
                          </td>
                          <td>
                            <S.ProductCell>
                              <S.ProductName>{row.name}</S.ProductName>
                              <S.ProductMeta>
                                {row.category} · {formatRupees(row.unitPrice)}
                              </S.ProductMeta>
                            </S.ProductCell>
                          </td>
                          <S.NumCell>{formatCount(row.unitsSold)}</S.NumCell>
                          <S.NumCell>{formatRupeesCompact(row.revenue)}</S.NumCell>
                          <S.NumCell>
                            <S.TrendText $good={row.trendPct >= 0}>
                              <i
                                className={`pi ${row.trendPct >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'}`}
                                aria-hidden
                              />
                              {formatDelta(row.trendPct)}
                            </S.TrendText>
                          </S.NumCell>
                          <S.NumCell>
                            {alert ? (
                              <S.StatusChip $tone={stockTone[alert.status]}>
                                <i
                                  className={`pi ${mock._stockStatus[alert.status].icon}`}
                                  aria-hidden
                                />
                                {alert.stock === 0
                                  ? mock._stockStatus.outOfStock.label
                                  : formatCount(alert.stock)}
                              </S.StatusChip>
                            ) : (
                              formatCount(row.stock)
                            )}
                          </S.NumCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </S.Table>
              </S.TableScroll>
            </S.Card>

            {/* ── Stock alerts ────────────────────────────────────────── */}
            <S.Card $lg={5} aria-labelledby="admin-stock">
              <S.CardHead>
                <div>
                  <S.CardTitle id="admin-stock">{data.stockAlerts.title}</S.CardTitle>
                  <S.CardSubtitle>{data.stockAlerts.subtitle}</S.CardSubtitle>
                </div>
                <S.TextButton type="button" onClick={() => comingSoon(data.stockAlerts.title)}>
                  {L.viewAll}
                  <i className="pi pi-arrow-right" aria-hidden />
                </S.TextButton>
              </S.CardHead>
              <S.AlertList>
                {stockAlerts.map((row) => {
                  const status = mock._stockStatus[row.status];
                  const tone = stockTone[row.status];
                  const days = daysOfCover(row);
                  return (
                    <S.AlertItem key={row.sku}>
                      <S.AlertText>
                        <S.ProductName>{row.name}</S.ProductName>
                        <S.ProductMeta>
                          {row.sku} · {row.warehouse}
                        </S.ProductMeta>
                      </S.AlertText>
                      <S.AlertSide>
                        <S.StatusChip $tone={tone}>
                          <i className={`pi ${status.icon}`} aria-hidden />
                          {status.label}
                        </S.StatusChip>
                      </S.AlertSide>
                      <S.AlertMeterRow>
                        <S.Meter
                          $pct={(row.stock / row.reorderLevel) * 100}
                          $tone={tone}
                          role="meter"
                          aria-valuemin={0}
                          aria-valuemax={row.reorderLevel}
                          aria-valuenow={row.stock}
                          aria-label={`${row.name} stock`}
                        />
                        <S.MeterText>
                          <strong>{formatCount(row.stock)}</strong> /{' '}
                          {formatCount(row.reorderLevel)}
                          {row.stock > 0 && ` · ~${days} ${L.daysCover}`}
                        </S.MeterText>
                        <S.SmallButton
                          type="button"
                          $filled={row.status === 'outOfStock'}
                          onClick={() => notify(`Reorder raised for ${row.sku}.`)}
                        >
                          {L.reorder}
                        </S.SmallButton>
                      </S.AlertMeterRow>
                    </S.AlertItem>
                  );
                })}
              </S.AlertList>
            </S.Card>

            {/* ── Quotations ──────────────────────────────────────────── */}
            <S.Card $md={1} $lg={4} aria-labelledby="admin-quotes">
              <S.CardHead>
                <div>
                  <S.CardTitle id="admin-quotes">{data.quotations.title}</S.CardTitle>
                  <S.CardSubtitle>{data.quotations.subtitle}</S.CardSubtitle>
                </div>
              </S.CardHead>
              <S.StatPair>
                <S.MiniStat $tone="warning">
                  <S.MiniStatLabel $tone="warning">
                    <i className={`pi ${mock._quotationStatus.pending.icon}`} aria-hidden />
                    {L.pendingQuotes}
                  </S.MiniStatLabel>
                  <S.MiniStatValue>{formatCount(pendingCount)}</S.MiniStatValue>
                  <S.MiniStatCaption>
                    {formatRupeesCompact(summary.pendingValue - confirmedValue)}
                  </S.MiniStatCaption>
                </S.MiniStat>
                <S.MiniStat $tone="good">
                  <S.MiniStatLabel $tone="good">
                    <i className={`pi ${mock._quotationStatus.sold.icon}`} aria-hidden />
                    {L.soldQuotes}
                  </S.MiniStatLabel>
                  <S.MiniStatValue>{formatCount(soldCount)}</S.MiniStatValue>
                  <S.MiniStatCaption>
                    {formatRupeesCompact(summary.soldValue + confirmedValue)}
                  </S.MiniStatCaption>
                </S.MiniStat>
              </S.StatPair>
              <S.ConversionRow>
                <S.MeterText>{L.conversion}</S.MeterText>
                <S.Meter
                  $pct={conversionPct}
                  $tone="good"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={conversionPct}
                  aria-label={L.conversion}
                />
                <S.MeterText>
                  <strong>{conversionPct}%</strong>
                </S.MeterText>
              </S.ConversionRow>
              <S.RowList>
                {quotations.map((row) => {
                  const status = mock._quotationStatus[row.status];
                  return (
                    <S.RowItem key={row.id}>
                      <S.RowText>
                        <S.RowTitle>{row.quotationLabel}</S.RowTitle>
                        <S.RowMeta>
                          {row.customerName} · {roleLabel(row.role)}
                        </S.RowMeta>
                      </S.RowText>
                      <S.RowSide>
                        <S.RowAmount>{formatRupees(row.grandTotal)}</S.RowAmount>
                        {row.status === 'pending' ? (
                          <S.SmallButton type="button" onClick={() => confirmSale(row)}>
                            {L.confirmSale}
                          </S.SmallButton>
                        ) : (
                          <S.StatusChip $tone={quotationTone[row.status]}>
                            <i className={`pi ${status.icon}`} aria-hidden />
                            {status.label}
                          </S.StatusChip>
                        )}
                      </S.RowSide>
                    </S.RowItem>
                  );
                })}
              </S.RowList>
            </S.Card>

            {/* ── Dispatches ──────────────────────────────────────────── */}
            <S.Card $md={1} $lg={4} aria-labelledby="admin-dispatch">
              <S.CardHead>
                <div>
                  <S.CardTitle id="admin-dispatch">{data.dispatches.title}</S.CardTitle>
                  <S.CardSubtitle>
                    {data.dispatches.subtitle} · {formatCount(dispatchTotal)}
                  </S.CardSubtitle>
                </div>
              </S.CardHead>
              <S.Stack role="img" aria-label="Dispatch status split">
                {data.dispatches.statuses.map((s) => (
                  <S.StackSegment
                    key={s.status}
                    $tone={dispatchTone[s.status as DispatchStatus]}
                    $grow={s.count}
                    title={`${s.label}: ${s.count}`}
                  />
                ))}
              </S.Stack>
              <S.LegendGrid>
                {data.dispatches.statuses.map((s) => {
                  const key = s.status as DispatchStatus;
                  return (
                    <S.LegendItem key={s.status} $tone={dispatchTone[key]}>
                      <i className={`pi ${mock._dispatchStatus[key].icon}`} aria-hidden />
                      {s.label}
                      <strong>{s.count}</strong>
                    </S.LegendItem>
                  );
                })}
              </S.LegendGrid>
              <S.RowList>
                {dispatches.map((row) => {
                  const status = mock._dispatchStatus[row.status];
                  return (
                    <S.RowItem key={row.id}>
                      <S.RowText>
                        <S.RowTitle>
                          {row.id} · {row.customerName}
                        </S.RowTitle>
                        <S.RowMeta>
                          {row.destination} · {row.eta}
                        </S.RowMeta>
                      </S.RowText>
                      <S.StatusChip $tone={dispatchTone[row.status]}>
                        <i className={`pi ${status.icon}`} aria-hidden />
                        {status.label}
                      </S.StatusChip>
                    </S.RowItem>
                  );
                })}
              </S.RowList>
            </S.Card>

            {/* ── Warehouses ──────────────────────────────────────────── */}
            <S.Card $lg={4} aria-labelledby="admin-warehouse">
              <S.CardHead>
                <div>
                  <S.CardTitle id="admin-warehouse">{data.warehouses.title}</S.CardTitle>
                  <S.CardSubtitle>{data.warehouses.subtitle}</S.CardSubtitle>
                </div>
              </S.CardHead>
              <S.WarehouseList>
                {warehouses.map((row) => (
                  <S.WarehouseItem key={row.id}>
                    <S.WarehouseTop>
                      <S.RowTitle>{row.name}</S.RowTitle>
                      <S.MeterText>
                        <strong>{row.utilizationPct}%</strong> {L.utilization.toLowerCase()}
                      </S.MeterText>
                    </S.WarehouseTop>
                    <S.Meter
                      $pct={row.utilizationPct}
                      $tone={utilizationTone(row.utilizationPct)}
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={row.utilizationPct}
                      aria-label={`${row.name} ${L.utilization}`}
                    />
                    <S.WarehouseStats>
                      <span>
                        <strong>{formatCount(row.skus)}</strong> {L.skus}
                      </span>
                      <span>
                        <strong>{row.pendingPicks}</strong> {L.pendingPicks.toLowerCase()}
                      </span>
                      <span>
                        <strong>{row.lowStockSkus}</strong> {L.lowStockSkus.toLowerCase()}
                      </span>
                    </S.WarehouseStats>
                  </S.WarehouseItem>
                ))}
              </S.WarehouseList>
            </S.Card>

            {/* ── Referral partners ───────────────────────────────────── */}
            <S.Card $lg={7} aria-labelledby="admin-partners">
              <S.CardHead>
                <div>
                  <S.CardTitle id="admin-partners">{data.referralPartners.title}</S.CardTitle>
                  <S.CardSubtitle>{data.referralPartners.subtitle}</S.CardSubtitle>
                </div>
                <S.TextButton type="button" onClick={() => comingSoon(data.referralPartners.title)}>
                  {L.viewAll}
                  <i className="pi pi-arrow-right" aria-hidden />
                </S.TextButton>
              </S.CardHead>
              <S.TableScroll>
                <S.Table>
                  <thead>
                    <tr>
                      <th scope="col">Partner</th>
                      <S.NumHead scope="col">{L.referrals}</S.NumHead>
                      <S.NumHead scope="col">{L.convertedRevenue}</S.NumHead>
                      <S.NumHead scope="col">{L.rewardPoints}</S.NumHead>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <S.PartnerCell>
                            <S.Avatar aria-hidden>{userInitials(row.name)}</S.Avatar>
                            <S.RowText>
                              <S.RowTitle>{row.name}</S.RowTitle>
                              <S.RowMeta>
                                {roleLabel(row.role)} · {row.city}
                              </S.RowMeta>
                            </S.RowText>
                          </S.PartnerCell>
                        </td>
                        <S.NumCell>{row.referrals}</S.NumCell>
                        <S.NumCell>{formatRupeesCompact(row.convertedRevenue)}</S.NumCell>
                        <S.NumCell>{formatCount(row.rewardPoints)}</S.NumCell>
                      </tr>
                    ))}
                  </tbody>
                </S.Table>
              </S.TableScroll>
            </S.Card>

            {/* ── Users + KYC queue ───────────────────────────────────── */}
            <S.Card $lg={5} aria-labelledby="admin-users">
              <S.CardHead>
                <div>
                  <S.CardTitle id="admin-users">{data.users.title}</S.CardTitle>
                  <S.CardSubtitle>{data.users.subtitle}</S.CardSubtitle>
                </div>
              </S.CardHead>
              <S.UsersHead>
                <S.TrendValue>{formatCount(data.users.total)}</S.TrendValue>
                <S.KpiCaption>
                  {L.totalUsers} · +{formatCount(data.users.newThisPeriod)} {L.newUsers}
                </S.KpiCaption>
              </S.UsersHead>
              <S.BarList>
                {data.users.byRole.map((row) => (
                  <S.BarRow key={row.role} $noThumb>
                    <S.BarLabelRow>
                      <S.BarName>{row.label}</S.BarName>
                      <S.BarValue>
                        <strong>{formatCount(row.count)}</strong> ·{' '}
                        {Math.round((row.count / data.users.total) * 100)}%
                      </S.BarValue>
                    </S.BarLabelRow>
                    <S.BarTrack>
                      <S.BarFill $pct={(row.count / roleMax) * 100} />
                    </S.BarTrack>
                  </S.BarRow>
                ))}
              </S.BarList>

              <S.SubHeading>{L.kycQueue}</S.SubHeading>
              <S.RowList>
                {data.users.kycQueue.map((row) => (
                  <S.RowItem key={row.id}>
                    <S.Avatar aria-hidden>{userInitials(row.name)}</S.Avatar>
                    <S.RowText>
                      <S.RowTitle>{row.name}</S.RowTitle>
                      <S.RowMeta>
                        {row.document} · {row.submittedAt}
                      </S.RowMeta>
                    </S.RowText>
                    <S.SmallButton type="button" onClick={() => comingSoon(L.kycQueue)}>
                      {L.review}
                    </S.SmallButton>
                  </S.RowItem>
                ))}
              </S.RowList>
            </S.Card>

            {/* ── Recent activity ─────────────────────────────────────── */}
            <S.Card $lg={12} aria-labelledby="admin-activity">
              <S.CardHead>
                <S.CardTitle id="admin-activity">{L.recentActivity}</S.CardTitle>
              </S.CardHead>
              <S.ActivityGrid>
                {activity.map((row) => (
                  <S.RowItem key={row.id}>
                    <S.ActivityIcon>
                      <i className={`pi ${row.icon}`} aria-hidden />
                    </S.ActivityIcon>
                    <S.RowText>
                      <S.RowTitle $wrap>{row.text}</S.RowTitle>
                      <S.RowMeta>
                        {row.actor} · {row.time}
                      </S.RowMeta>
                    </S.RowText>
                  </S.RowItem>
                ))}
              </S.ActivityGrid>
            </S.Card>
          </S.Grid>
        </S.Main>
      </S.ShellBody>

      <StorefrontFooter />

      {snack && (
        <SnackBar
          key={snack.key}
          message={snack.message}
          onDismissed={hideSnack}
          webAlign="center"
        />
      )}
    </S.Shell>
  );
}
