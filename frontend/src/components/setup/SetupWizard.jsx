import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Loader2,
  Palette,
  Sparkles,
  UserCog
} from 'lucide-react';
import { completarSetup } from '../../api/client';
import {
  brandingDefaults,
  localesDisponibles,
  monedasDisponibles
} from '../../config/branding';
import { useBranding } from '../../context/BrandingContext';
import { saveSession } from '../../utils/session';
import LogoField from './LogoField';

const PASOS = [
  { key: 'bienvenida', titulo: 'Bienvenido', icon: Sparkles },
  { key: 'taller', titulo: 'Datos del taller', icon: Building2 },
  { key: 'identidad', titulo: 'Logos y apariencia', icon: Palette },
  { key: 'admin', titulo: 'Cuenta de administrador', icon: UserCog },
  { key: 'resumen', titulo: 'Confirmar', icon: Check }
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const valorInicialTaller = (branding) => ({
  nombre_taller: branding?.nombre_taller || '',
  razon_social: branding?.razon_social || '',
  eslogan: branding?.eslogan || '',
  identidad_rtn: branding?.identidad_rtn || '',
  telefono: branding?.telefono || '',
  whatsapp: branding?.whatsapp || '',
  email: branding?.email || '',
  direccion: branding?.direccion || '',
  ciudad: branding?.ciudad || '',
  pais: branding?.pais || '',
  moneda: branding?.moneda || brandingDefaults.moneda,
  locale: branding?.locale || brandingDefaults.locale,
  color_primario: branding?.color_primario || brandingDefaults.color_primario,
  logo_url: branding?.logo_url || '',
  logo_documentos_url: branding?.logo_documentos_url || '',
  icono_url: branding?.icono_url || ''
});

/**
 * Asistente de bienvenida. Se muestra solo mientras el sistema esta en blanco
 * (sin datos del taller y sin usuarios). Al terminar deja la sesion del Admin
 * creado ya iniciada.
 */
function SetupWizard({ onReady }) {
  const { branding, aplicar, marcarConfigurado } = useBranding();
  const [paso, setPaso] = useState(0);
  const [taller, setTaller] = useState(() => valorInicialTaller(branding));
  const [admin, setAdmin] = useState({
    nombre: '',
    apellido: '',
    username: '',
    email: '',
    telefono: '',
    password: '',
    confirmacion: ''
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  const pasoActual = PASOS[paso];

  const cambiarTaller = (campo) => (event) => {
    const { value } = event.target;
    setTaller((actual) => ({ ...actual, [campo]: value }));
    setErrores((actual) => ({ ...actual, [campo]: '' }));
  };

  const cambiarAdmin = (campo) => (event) => {
    const { value } = event.target;
    setAdmin((actual) => ({ ...actual, [campo]: value }));
    setErrores((actual) => ({ ...actual, [campo]: '' }));
  };

  const cambiarLogo = (campo) => (url) => {
    const siguiente = { ...taller, [campo]: url };
    setTaller(siguiente);
    // Reflejar el logo nuevo de inmediato en el resto de la app.
    aplicar(siguiente);
  };

  const validarPaso = (indice) => {
    const siguientes = {};

    if (PASOS[indice].key === 'taller') {
      if (taller.nombre_taller.trim().length < 2) {
        siguientes.nombre_taller = 'Escribe el nombre del taller';
      }

      if (taller.email && !emailPattern.test(taller.email.trim())) {
        siguientes.email = 'Ingresa un email valido';
      }
    }

    if (PASOS[indice].key === 'admin') {
      if (!admin.nombre.trim()) {
        siguientes.nombre = 'El nombre es requerido';
      }

      if (admin.username.trim().length < 3) {
        siguientes.username = 'El usuario debe tener al menos 3 caracteres';
      }

      if (admin.password.length < 6) {
        siguientes.password = 'La contrasena debe tener al menos 6 caracteres';
      }

      if (admin.password !== admin.confirmacion) {
        siguientes.confirmacion = 'Las contrasenas no coinciden';
      }

      if (admin.email && !emailPattern.test(admin.email.trim())) {
        siguientes.adminEmail = 'Ingresa un email valido';
      }
    }

    setErrores(siguientes);

    return Object.keys(siguientes).length === 0;
  };

  const avanzar = () => {
    if (!validarPaso(paso)) return;

    setErrorGeneral('');
    setPaso((actual) => Math.min(actual + 1, PASOS.length - 1));
  };

  const retroceder = () => {
    setErrorGeneral('');
    setErrores({});
    setPaso((actual) => Math.max(actual - 1, 0));
  };

  const finalizar = async () => {
    if (!validarPaso(1)) {
      setPaso(1);
      return;
    }

    if (!validarPaso(3)) {
      setPaso(3);
      return;
    }

    setGuardando(true);
    setErrorGeneral('');

    try {
      const data = await completarSetup({
        ...taller,
        admin: {
          nombre: admin.nombre,
          apellido: admin.apellido,
          username: admin.username,
          email: admin.email,
          telefono: admin.telefono,
          password: admin.password
        }
      });

      const session = { token: data.token, user: data.user };
      saveSession(session);
      aplicar(data.configuracion || taller);
      marcarConfigurado();
      onReady?.(session);
    } catch (error) {
      setErrorGeneral(error?.message || 'No se pudo guardar la configuracion inicial.');
      setGuardando(false);
    }
  };

  const resumen = useMemo(() => ([
    ['Taller', taller.nombre_taller],
    ['Eslogan', taller.eslogan],
    ['Identidad / RTN', taller.identidad_rtn],
    ['Telefono', taller.telefono],
    ['WhatsApp', taller.whatsapp],
    ['Email', taller.email],
    ['Direccion', [taller.direccion, taller.ciudad, taller.pais].filter(Boolean).join(', ')],
    ['Moneda', taller.moneda],
    ['Administrador', [admin.nombre, admin.apellido].filter(Boolean).join(' ')],
    ['Usuario', admin.username]
  ].filter(([, valor]) => Boolean(valor))), [admin.apellido, admin.nombre, admin.username, taller]);

  return (
    <main className="setup-shell">
      <section className="setup-panel" aria-label="Asistente de bienvenida">
        <ol className="setup-steps">
          {PASOS.map((item, indice) => {
            const Icon = item.icon;
            const estado = indice === paso ? 'actual' : indice < paso ? 'listo' : 'pendiente';

            return (
              <li key={item.key} className={`setup-step setup-step-${estado}`}>
                <span className="setup-step-icon">
                  {indice < paso ? <Check size={15} aria-hidden="true" /> : <Icon size={15} aria-hidden="true" />}
                </span>
                <span className="setup-step-label">{item.titulo}</span>
              </li>
            );
          })}
        </ol>

        <div className="setup-body">
          {pasoActual.key === 'bienvenida' ? (
            <div className="setup-intro">
              <h1>Configura tu taller</h1>
              <p>
                Este sistema esta en blanco. En unos pasos defines el nombre del taller,
                sus logos y la cuenta de administrador con la que vas a entrar.
              </p>
              <ul className="setup-list">
                <li>Datos del taller: nombre, contacto y direccion.</li>
                <li>Logos: para la app, para las facturas y el icono del navegador.</li>
                <li>Cuenta de administrador: el primer usuario del sistema.</li>
              </ul>
              <small>Todo esto se puede cambiar despues en el modulo Configuracion.</small>
            </div>
          ) : null}

          {pasoActual.key === 'taller' ? (
            <div className="setup-grid">
              <h2>Datos del taller</h2>
              <label className="field field-wide">
                Nombre del taller *
                <input
                  value={taller.nombre_taller}
                  onChange={cambiarTaller('nombre_taller')}
                  maxLength={150}
                  placeholder="Ej. Taller Central"
                  aria-invalid={Boolean(errores.nombre_taller)}
                  autoFocus
                />
                {errores.nombre_taller ? <span className="field-error">{errores.nombre_taller}</span> : null}
              </label>

              <label className="field field-wide">
                Eslogan (opcional)
                <input
                  value={taller.eslogan}
                  onChange={cambiarTaller('eslogan')}
                  maxLength={200}
                  placeholder="Ej. Servicio automotriz integral"
                />
              </label>

              <label className="field">
                Razon social (opcional)
                <input value={taller.razon_social} onChange={cambiarTaller('razon_social')} maxLength={200} />
              </label>

              <label className="field">
                Identidad / RTN (opcional)
                <input value={taller.identidad_rtn} onChange={cambiarTaller('identidad_rtn')} maxLength={50} />
              </label>

              <label className="field">
                Telefono
                <input value={taller.telefono} onChange={cambiarTaller('telefono')} maxLength={30} />
              </label>

              <label className="field">
                WhatsApp
                <input value={taller.whatsapp} onChange={cambiarTaller('whatsapp')} maxLength={30} />
              </label>

              <label className="field">
                Email
                <input
                  type="email"
                  value={taller.email}
                  onChange={cambiarTaller('email')}
                  maxLength={150}
                  aria-invalid={Boolean(errores.email)}
                />
                {errores.email ? <span className="field-error">{errores.email}</span> : null}
              </label>

              <label className="field">
                Ciudad
                <input value={taller.ciudad} onChange={cambiarTaller('ciudad')} maxLength={100} />
              </label>

              <label className="field">
                Pais
                <input value={taller.pais} onChange={cambiarTaller('pais')} maxLength={100} />
              </label>

              <label className="field field-wide">
                Direccion
                <textarea value={taller.direccion} onChange={cambiarTaller('direccion')} rows={2} maxLength={500} />
              </label>
            </div>
          ) : null}

          {pasoActual.key === 'identidad' ? (
            <div className="setup-grid">
              <h2>Logos y apariencia</h2>

              <div className="setup-logos">
                <LogoField
                  label="Logo de la app"
                  hint="Se muestra en el menu, el login y la barra superior. JPG, PNG o WebP."
                  tipo="logo"
                  url={taller.logo_url}
                  onChange={cambiarLogo('logo_url')}
                />
                <LogoField
                  label="Logo para documentos (opcional)"
                  hint="Para facturas y cotizaciones. Si no subes uno se usa el logo de la app."
                  tipo="documentos"
                  url={taller.logo_documentos_url}
                  onChange={cambiarLogo('logo_documentos_url')}
                />
                <LogoField
                  label="Icono del navegador (opcional)"
                  hint="Cuadrado, se usa en la pestana del navegador."
                  tipo="icono"
                  url={taller.icono_url}
                  onChange={cambiarLogo('icono_url')}
                  variant="square"
                />
              </div>

              <label className="field">
                Color principal
                <span className="color-input">
                  <input type="color" value={taller.color_primario} onChange={cambiarTaller('color_primario')} />
                  <input
                    value={taller.color_primario}
                    onChange={cambiarTaller('color_primario')}
                    maxLength={7}
                    aria-label="Color principal en hexadecimal"
                  />
                </span>
              </label>

              <label className="field">
                Moneda
                <select value={taller.moneda} onChange={cambiarTaller('moneda')}>
                  {monedasDisponibles.map((moneda) => (
                    <option key={moneda.value} value={moneda.value}>{moneda.label}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                Formato regional
                <select value={taller.locale} onChange={cambiarTaller('locale')}>
                  {localesDisponibles.map((locale) => (
                    <option key={locale.value} value={locale.value}>{locale.label}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {pasoActual.key === 'admin' ? (
            <div className="setup-grid">
              <h2>Cuenta de administrador</h2>
              <p className="setup-note">
                Es el primer usuario del sistema. Con el podras crear al resto del personal
                (cajeros y mecanicos) desde el modulo Usuarios.
              </p>

              <label className="field">
                Nombre *
                <input
                  value={admin.nombre}
                  onChange={cambiarAdmin('nombre')}
                  maxLength={100}
                  aria-invalid={Boolean(errores.nombre)}
                  autoFocus
                />
                {errores.nombre ? <span className="field-error">{errores.nombre}</span> : null}
              </label>

              <label className="field">
                Apellido
                <input value={admin.apellido} onChange={cambiarAdmin('apellido')} maxLength={100} />
              </label>

              <label className="field">
                Usuario *
                <input
                  value={admin.username}
                  onChange={cambiarAdmin('username')}
                  maxLength={80}
                  autoComplete="username"
                  aria-invalid={Boolean(errores.username)}
                />
                {errores.username ? <span className="field-error">{errores.username}</span> : null}
              </label>

              <label className="field">
                Email
                <input
                  type="email"
                  value={admin.email}
                  onChange={cambiarAdmin('email')}
                  maxLength={150}
                  aria-invalid={Boolean(errores.adminEmail)}
                />
                {errores.adminEmail ? <span className="field-error">{errores.adminEmail}</span> : null}
              </label>

              <label className="field">
                Contrasena *
                <input
                  type="password"
                  value={admin.password}
                  onChange={cambiarAdmin('password')}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errores.password)}
                />
                {errores.password ? <span className="field-error">{errores.password}</span> : null}
              </label>

              <label className="field">
                Confirmar contrasena *
                <input
                  type="password"
                  value={admin.confirmacion}
                  onChange={cambiarAdmin('confirmacion')}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errores.confirmacion)}
                />
                {errores.confirmacion ? <span className="field-error">{errores.confirmacion}</span> : null}
              </label>

              <label className="field">
                Telefono
                <input value={admin.telefono} onChange={cambiarAdmin('telefono')} maxLength={30} />
              </label>
            </div>
          ) : null}

          {pasoActual.key === 'resumen' ? (
            <div className="setup-grid">
              <h2>Revisa antes de guardar</h2>
              <dl className="setup-summary">
                {resumen.map(([etiqueta, valor]) => (
                  <div key={etiqueta}>
                    <dt>{etiqueta}</dt>
                    <dd>{valor}</dd>
                  </div>
                ))}
              </dl>
              <p className="setup-note">
                Al guardar se crea la cuenta de administrador y entraras al sistema con ella.
              </p>
            </div>
          ) : null}

          {errorGeneral ? <div className="form-error">{errorGeneral}</div> : null}
        </div>

        <footer className="setup-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={retroceder}
            disabled={paso === 0 || guardando}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Atras
          </button>

          <span className="setup-progress">Paso {paso + 1} de {PASOS.length}</span>

          {paso < PASOS.length - 1 ? (
            <button className="primary-button" type="button" onClick={avanzar}>
              {paso === 0 ? 'Comenzar' : 'Siguiente'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={finalizar} disabled={guardando}>
              {guardando ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
              {guardando ? 'Guardando...' : 'Guardar y entrar'}
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}

export default SetupWizard;
