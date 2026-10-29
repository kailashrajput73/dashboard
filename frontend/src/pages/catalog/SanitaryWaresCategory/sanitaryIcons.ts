import categoryMock from './SanitaryWaresCategory.mock.json';

const iconMap = categoryMock._iconMap as Record<string, string>;

/** Flutter `appIcon` key → nearest primeicons class. */
export const sanitaryIconFor = (key: string): string => iconMap[key] ?? 'pi-filter';
