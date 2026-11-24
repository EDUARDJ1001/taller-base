import { estadosVisita } from '../constants/app';
import { getBranding } from '../config/branding';

export const stripAccents = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

export const normalizeVisitStatus = (value) => {
  const source = stripAccents(value).toLowerCase();
  return estadosVisita.find((estado) => stripAccents(estado).toLowerCase() === source) || value;
};

// El formato regional y la moneda salen de la configuracion del taller
// (asistente de bienvenida / modulo Configuracion).
export const formatDate = (value) => {
  if (!value) return 'Sin fecha';

  const { locale } = getBranding();

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
};

export const formatCurrency = (value) => {
  const amount = Number(value || 0);
  const { locale, moneda } = getBranding();

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    // Moneda o formato regional no soportados por el navegador.
    return `${moneda} ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(amount)}`;
  }
};

export const vehicleLabel = (row) => {
  const parts = [row.marca, row.modelo].filter(Boolean).join(' ');
  return [row.placa, parts].filter(Boolean).join(' - ') || row.vehiculo || 'Sin dato';
};

export const optionLabel = (row, fields) => fields.map((field) => row[field]).filter(Boolean).join(' - ');

export const filterRows = (rows, query) => {
  if (!query.trim()) return rows;
  const needle = query.trim().toLowerCase();

  return rows.filter((row) => Object.values(row).some((value) => (
    value !== null
    && value !== undefined
    && String(value).toLowerCase().includes(needle)
  )));
};

export const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};
