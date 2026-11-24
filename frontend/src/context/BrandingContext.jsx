import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getConfiguracion, getEstadoConfiguracion } from '../api/client';
import { applyDocumentBranding, getBranding, setBrandingStore } from '../config/branding';

const BrandingContext = createContext(null);

/**
 * Carga la identidad del taller al abrir la app:
 *   - /configuracion/estado (publico) dice si falta el asistente de bienvenida
 *     y trae el branding minimo para el login.
 *   - /configuracion (con sesion) completa los datos que usan facturas,
 *     cotizaciones y reportes.
 * Tambien mantiene sincronizada la copia en memoria de src/config/branding.js.
 */
export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(() => getBranding());
  const [configurado, setConfigurado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const aplicar = useCallback((valores) => {
    const siguiente = setBrandingStore(valores);
    setBranding(siguiente);
    applyDocumentBranding(siguiente);
    return siguiente;
  }, []);

  const recargarEstado = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getEstadoConfiguracion();
      aplicar(data.branding || {});
      setConfigurado(Boolean(data.configurado));
    } catch (err) {
      setError(err?.message || 'No se pudo consultar la configuracion del taller.');
      setConfigurado(null);
    } finally {
      setLoading(false);
    }
  }, [aplicar]);

  // Datos completos (telefono, direccion, RTN...). Si falla no bloquea la app:
  // la interfaz sigue funcionando con el branding publico.
  const cargarCompleta = useCallback(async (token) => {
    if (!token) return null;

    try {
      const data = await getConfiguracion(token);

      return data?.configuracion ? aplicar(data.configuracion) : null;
    } catch {
      return null;
    }
  }, [aplicar]);

  useEffect(() => {
    recargarEstado();
  }, [recargarEstado]);

  const value = useMemo(() => ({
    branding,
    configurado,
    loading,
    error,
    aplicar,
    recargarEstado,
    cargarCompleta,
    marcarConfigurado: () => setConfigurado(true)
  }), [aplicar, branding, cargarCompleta, configurado, error, loading, recargarEstado]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export const useBranding = () => {
  const context = useContext(BrandingContext);

  if (!context) {
    throw new Error('useBranding debe usarse dentro de BrandingProvider');
  }

  return context;
};
