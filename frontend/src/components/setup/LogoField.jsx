import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { assetUrl, eliminarLogo, subirLogo } from '../../api/client';
import { logoPlaceholderSrc } from '../../config/branding';
import { validateImageFile } from '../../utils/validation';

/**
 * Campo de logo: sube la imagen al taller y devuelve la URL guardada.
 * Sirve igual en el asistente de bienvenida (sin token) y en Configuracion (Admin).
 */
function LogoField({ label, hint, tipo = 'logo', url = '', token, onChange, variant = 'wide' }) {
  const inputRef = useRef(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const seleccionar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const validacion = validateImageFile(file);

    if (validacion) {
      setError(validacion);
      return;
    }

    setError('');
    setWorking(true);

    try {
      const data = await subirLogo({ file, tipo, token });
      onChange?.(data.url || '');
    } catch (err) {
      setError(err?.message || 'No se pudo subir la imagen.');
    } finally {
      setWorking(false);
    }
  };

  const quitar = async () => {
    setError('');
    setWorking(true);

    try {
      await eliminarLogo({ tipo, token });
      onChange?.('');
    } catch (err) {
      setError(err?.message || 'No se pudo quitar la imagen.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="logo-field">
      <span className="logo-field-label">{label}</span>

      <div className={`logo-field-preview logo-field-preview-${variant}`}>
        <img src={url ? assetUrl(url) : logoPlaceholderSrc} alt={url ? label : 'Sin logo cargado'} />
        {!url ? <small>Sin logo</small> : null}
      </div>

      <div className="logo-field-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={working}
        >
          {working ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <ImagePlus size={16} aria-hidden="true" />}
          {url ? 'Cambiar' : 'Subir imagen'}
        </button>

        {url ? (
          <button className="ghost-button" type="button" onClick={quitar} disabled={working}>
            <Trash2 size={16} aria-hidden="true" />
            Quitar
          </button>
        ) : null}

        <input
          ref={inputRef}
          className="visually-hidden-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={seleccionar}
        />
      </div>

      {hint ? <small className="logo-field-hint">{hint}</small> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

export default LogoField;
