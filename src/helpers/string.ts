import accents from 'remove-accents';

export const trimString = (str?: string): string => {
  if (!str) {
    return '';
  }
  return str.replace(/\s\s+/g, ' ').trim();
};

export const cleanString = (str?: string): string => {
  if (!str) {
    return '';
  }
  return accents.remove(str).toLowerCase().replace(/\s\s+/g, ' ').trim();
};

export const normalizeString = (str?: string): string => {
  if (!str) {
    return '';
  }
  return accents.remove(str).toLowerCase()
    .replace(/\s\s+/g, ' ').replace(/-|:|,|\\|\//g, '').trim();
};
