import { useEffect, useMemo, useState } from 'react';
import { Info, Loader2, Save } from 'lucide-react';
import { updateConfiguracion } from '../api/client';
import LogoField from '../components/setup/LogoField';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { brandingDefaults, localesDisponibles, monedasDisponibles } from '../config/branding';
import { useBranding } from '../context/BrandingContext';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CAMPOS_TEXTO = [
  { name: 'nombre_taller', label: 'Nombre del taller *', maxLength: 150, wide: true },
  { name: 'eslogan', label: 'Eslogan', maxLength: 200, wide: true },
  { name: 'razon_social', label: 'Razon social', maxLength: 200 },
  { name: 'identidad_rtn', label: 'Identidad / RTN', maxLength: 50 },
  { name: 'telefono', label: 'Telefono', maxLength: 30 },
  { name: 'whatsapp', label: 'WhatsApp', maxLength: 30 },
  { name: 'email', label: 'Email', maxLength: 150, type: 'email' },
  { name: 'ciudad', label: 'Ciudad', maxLength: 100 },
  { name: 'pais', label: 'Pais', maxLength: 100 }
];

const desdeConfiguracion = (configuracion = {}) => ({
  nombre_taller: configuracion.nombre_taller || '',
  razon_social: configuracion.razon_social || '',
  eslogan: configuracion.eslogan || '',
  identidad_rtn: configuracion.identidad_rtn || '',
  telefono: configuracion.telefono || '',
  whatsapp: configuracion.whatsapp || '',
  email: configuracion.email || '',
  direccion: configuracion.direccion || '',
  ciudad: configuracion.ciudad || '',
  pais: configuracion.pais || '',
  moneda: configuracion.moneda || brandingDefaults.moneda,
  locale: configuracion.locale || brandingDefaults.locale,
  color_primario: configuracion.color_primario || brandingDefaults.color_primario,
  logo_url: configuracion.logo_url || '',
  logo_documentos_url: configuracion.logo_documentos_url || '',
  icono_url: configuracion.icono_url || ''
});

/** Identidad del taller despues del asistente: mismos datos, editables por el Admin. */
function ConfiguracionPage({ session, data, loading, error, onRefresh, showToast, onRequestError }) {
  const { aplicar } = useBranding();
  const configuracion = data?.configuracion;
  const [form, setForm] = useState(() => desdeConfiguracion(configuracion));
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (configuracion) {
      setForm(desdeConfiguracion(configuracion));
    }
  }, [configuracion]);

  const esAdmin = session?.user?.rol === 'Admin';
  const token = session?.token;

  const cambiar = (campo) => (event) => {
    const { value } = event.target;
    setForm((actual) => ({ ...actual, [campo]: value }));
    setErrores((actual) => ({ ...actual, [campo]: '' }));
  };

  const cambiarLogo = (campo) => (url) => {
    const siguiente = { ...form, [campo]: url };
    setForm(siguiente);
    aplicar(siguiente);
  };

  const campos = useMemo(() => CAMPOS_TEXTO, []);

  const guardar = async (event) => {
    event.preventDefault();

    const siguientes = {};

    if (form.nombre_taller.trim().length < 2) {
      siguientes.nombre_taller = 'Escribe el nombre del taller';
    }

    if (form.email && !emailPattern.test(form.email.trim())) {
      siguientes.email = 'Ingresa un email valido';
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(form.color_primario)) {
      siguientes.color_primario = 'Usa un color hexadecimal, por ejemplo #265c7b';
    }

    setErrores(siguientes);

    if (Object.keys(siguientes).length) return;

    setGuardando(true);

    try {
      const payload = await updateConfiguracion(form, token);
      aplicar(payload.configuracion || form);
      showToast?.('Configuracion guardada correctamente');
      onRefresh?.();
    } catch (err) {
      showToast?.(onRequestError ? onRequestError(err) : err.message, 'danger');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <section className="panel">
        <EmptyState text="Cargando configuracion..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <ErrorState text={error} onRetry={onRefresh} />
      </section>
    );
  }

  if (!esAdmin) {
    return (
      <section className="panel">
        <EmptyState text="Solo el administrador puede cambiar los datos del taller." />
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="module-hint">
        <Info size={15} aria-hidden="true" />
        Nombre, logos y datos de contacto del taller. Se usan en la app, en las facturas y en las cotizaciones.
      </p>

      <form className="config-form" onSubmit={guardar}>
        <h3>Identidad</h3>
        <div className="setup-logos">
          <LogoField
            label="Logo de la app"
            hint="Menu, login y barra superior."
            tipo="logo"
            url={form.logo_url}
            token={token}
            onChange={cambiarLogo('logo_url')}
          />
          <LogoField
            label="Logo para documentos"
            hint="Facturas y cotizaciones. Si esta vacio se usa el logo de la app."
            tipo="documentos"
            url={form.logo_documentos_url}
            token={token}
            onChange={cambiarLogo('logo_documentos_url')}
          />
          <LogoField
            label="Icono del navegador"
            hint="Cuadrado, para la pestana del navegador."
            tipo="icono"
            url={form.icono_url}
            token={token}
            onChange={cambiarLogo('icono_url')}
            variant="square"
          />
        </div>

        <h3>Datos del taller</h3>
        <div className="config-grid">
          {campos.map((campo) => (
            <label className={campo.wide ? 'field field-wide' : 'field'} key={campo.name}>
              {campo.label}
              <input
                type={campo.type || 'text'}
                value={form[campo.name]}
                onChange={cambiar(campo.name)}
                maxLength={campo.maxLength}
                aria-invalid={Boolean(errores[campo.name])}
              />
              {errores[campo.name] ? <span className="field-error">{errores[campo.name]}</span> : null}
            </label>
          ))}

          <label className="field field-wide">
            Direccion
            <textarea value={form.direccion} onChange={cambiar('direccion')} rows={2} maxLength={500} />
          </label>

          <label className="field">
            Color principal
            <span className="color-input">
              <input type="color" value={form.color_primario} onChange={cambiar('color_primario')} />
              <input
                value={form.color_primario}
                onChange={cambiar('color_primario')}
                maxLength={7}
                aria-label="Color principal en hexadecimal"
                aria-invalid={Boolean(errores.color_primario)}
              />
            </span>
            {errores.color_primario ? <span className="field-error">{errores.color_primario}</span> : null}
          </label>

          <label className="field">
            Moneda
            <select value={form.moneda} onChange={cambiar('moneda')}>
              {monedasDisponibles.map((moneda) => (
                <option key={moneda.value} value={moneda.value}>{moneda.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            Formato regional
            <select value={form.locale} onChange={cambiar('locale')}>
              {localesDisponibles.map((locale) => (
                <option key={locale.value} value={locale.value}>{locale.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="config-actions">
          <button className="primary-button" type="submit" disabled={guardando}>
            {guardando ? <Loader2 size={17} className="spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ConfiguracionPage;
