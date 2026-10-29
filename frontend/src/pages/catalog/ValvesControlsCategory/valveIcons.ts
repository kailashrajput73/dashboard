import categoryMock from './ValvesControlsCategory.mock.json';

const iconMap = categoryMock._iconMap as Record<string, string>;

/** Flutter `appIcon` key → nearest primeicons class. */
export const valveIconFor = (key: string): string => iconMap[key] ?? 'pi-filter';
