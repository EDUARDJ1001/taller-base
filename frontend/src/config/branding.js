import { assetUrl } from '../api/client';
import logoPlaceholder from '../assets/logo.svg';

// Identidad del taller. Todo esto se define en el asistente de bienvenida
// (primer arranque) y se puede cambiar despues en el modulo Configuracion.
// Mientras no haya datos, la app usa estos valores neutros.
export const brandingDefaults = {
  nombre_taller: 'Mi Taller',
  razon_social: '',
  eslogan: '',
  identidad_rtn: '',
  telefono: '',
  whatsapp: '',
  email: '',
  direccion: '',
  ciudad: '',
  pais: '',
  moneda: 'USD',
  locale: 'es-419',
  color_primario: '#265c7b',
  logo_url: '',
  logo_documentos_url: '',
  icono_url: ''
};

export const monedasDisponibles = [
  { value: 'USD', label: 'USD - Dolar estadounidense' },
  { value: 'HNL', label: 'HNL - Lempira hondureno' },
  { value: 'GTQ', label: 'GTQ - Quetzal guatemalteco' },
  { value: 'NIO', label: 'NIO - Cordoba nicaraguense' },
  { value: 'CRC', label: 'CRC - Colon costarricense' },
  { value: 'MXN', label: 'MXN - Peso mexicano' },
  { value: 'DOP', label: 'DOP - Peso dominicano' },
  { value: 'COP', label: 'COP - Peso colombiano' },
  { value: 'PEN', label: 'PEN - Sol peruano' },
  { value: 'CLP', label: 'CLP - Peso chileno' },
  { value: 'ARS', label: 'ARS - Peso argentino' },
  { value: 'EUR', label: 'EUR - Euro' }
];

export const localesDisponibles = [
  { value: 'es-419', label: 'Espanol (Latinoamerica)' },
  { value: 'es-HN', label: 'Espanol (Honduras)' },
  { value: 'es-GT', label: 'Espanol (Guatemala)' },
  { value: 'es-MX', label: 'Espanol (Mexico)' },
  { value: 'es-CO', label: 'Espanol (Colombia)' },
  { value: 'es-ES', label: 'Espanol (Espana)' },
  { value: 'en-US', label: 'Ingles (Estados Unidos)' }
];

const limpiar = (valores = {}) => Object.fromEntries(
  Object.entries(valores).filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
);

// Copia en memoria del branding, para que utilidades que no son componentes
// (formatters, generacion de PDF) puedan leerlo sin pasar props por todas partes.
let brandingActual = { ...brandingDefaults };

export const getBranding = () => brandingActual;

export const setBrandingStore = (valores = {}) => {
  brandingActual = { ...brandingDefaults, ...limpiar(valores) };
  return brandingActual;
};

export const logoPlaceholderSrc = logoPlaceholder;

/** Logo para la app (sidebar, login, topbar). Cae al marcador de posicion si no hay. */
export const brandLogoSrc = (branding = brandingActual) => (
  branding?.logo_url ? assetUrl(branding.logo_url) : logoPlaceholder
);

/** Logo para documentos impresos (factura, cotizacion). Reutiliza el de la app si no hay uno aparte. */
export const brandDocumentLogoSrc = (branding = brandingActual) => {
  const url = branding?.logo_documentos_url || branding?.logo_url;
  return url ? assetUrl(url) : logoPlaceholder;
};

export const brandName = (branding = brandingActual) => branding?.nombre_taller || brandingDefaults.nombre_taller;

export const brandTagline = (branding = brandingActual) => branding?.eslogan || '';

/** Titulo de la pestana, favicon y color principal del tema. */
export const applyDocumentBranding = (branding = brandingActual) => {
  if (typeof document === 'undefined') return;

  document.title = brandName(branding);

  const color = branding?.color_primario || brandingDefaults.color_primario;
  document.documentElement.style.setProperty('--color-primario', color);

  const iconUrl = branding?.icono_url || branding?.logo_url;

  if (!iconUrl) return;

  let link = document.querySelector('link[rel="icon"]');

  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  link.href = assetUrl(iconUrl);
};
