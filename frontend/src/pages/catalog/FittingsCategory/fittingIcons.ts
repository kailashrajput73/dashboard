import categoryMock from './FittingsCategory.mock.json';

const iconMap = categoryMock._iconMap as Record<string, string>;

/** Flutter `appIcon` key → nearest primeicons class. */
export const fittingIconFor = (key: string): string => iconMap[key] ?? 'pi-filter';
