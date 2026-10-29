import categoryMock from './ElectricalsCategory.mock.json';

const iconMap = categoryMock._iconMap as Record<string, string>;

/** Flutter `appIcon` key → nearest primeicons class. */
export const electricalIconFor = (key: string): string => iconMap[key] ?? 'pi-bolt';
