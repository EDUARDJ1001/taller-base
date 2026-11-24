const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const configuracionModel = require('./configuracion.model');
const { successResponse, errorResponse } = require('../../utils/responses');
const { cleanupUploadedFile } = require('../../middlewares/uploadMiddleware');

const HASH_ROUNDS = 10;

// tipo de logo -> columna de configuracion_taller
const CAMPOS_LOGO = {
  logo: 'logo_url',
  documentos: 'logo_documentos_url',
  icono: 'icono_url'
};

// El nombre lo pone el frontend si aun no se configuro (ver src/config/branding.js).
const DEFAULTS_PUBLICOS = {
  moneda: 'USD',
  locale: 'es-419',
  color_primario: '#265c7b'
};

// Lo minimo que necesita la pantalla de bienvenida / login antes de autenticarse.
const mapPublico = (configuracion) => ({
  nombre_taller: configuracion?.nombre_taller || '',
  eslogan: configuracion?.eslogan || '',
  logo_url: configuracion?.logo_url || '',
  icono_url: configuracion?.icono_url || '',
  color_primario: configuracion?.color_primario || DEFAULTS_PUBLICOS.color_primario,
  moneda: configuracion?.moneda || DEFAULTS_PUBLICOS.moneda,
  locale: configuracion?.locale || DEFAULTS_PUBLICOS.locale
});

const soloCamposEditables = (body = {}) => {
  const fields = {};

  configuracionModel.CAMPOS_EDITABLES.forEach((campo) => {
    if (body[campo] === undefined) return;

    const valor = body[campo];
    fields[campo] = typeof valor === 'string' ? valor.trim() : valor;
  });

  return fields;
};

// Borrado best-effort del logo anterior (disco local o Vercel Blob).
const borrarArchivoPublico = (url) => {
  if (!url) return;

  if (/^https?:\/\//i.test(url)) {
    cleanupUploadedFile({ url });
    return;
  }

  if (!url.startsWith('/uploads/')) return;

  const baseUploadDir = process.env.UPLOAD_DIR || 'uploads';
  const relative = url.replace(/^\/uploads\//, '');

  cleanupUploadedFile({ path: path.resolve(baseUploadDir, relative) });
};

// GET /api/configuracion/estado  (publico)
const getEstado = async (req, res) => {
  const configuracion = await configuracionModel.get();
  const pendiente = await configuracionModel.setupPendiente();

  return successResponse(res, 'Estado de configuracion obtenido', {
    configurado: !pendiente,
    setup_pendiente: pendiente,
    branding: mapPublico(configuracion)
  });
};

// GET /api/configuracion  (cualquier usuario autenticado: facturas y reportes usan estos datos)
const getConfiguracion = async (req, res) => {
  const configuracion = await configuracionModel.get();

  return successResponse(res, 'Configuracion obtenida correctamente', { configuracion });
};

// PUT /api/configuracion  (Admin)
const updateConfiguracion = async (req, res) => {
  const fields = soloCamposEditables(req.body);

  if (!Object.keys(fields).length) {
    return errorResponse(res, 'No se enviaron campos para actualizar', undefined, 400);
  }

  const configuracion = await configuracionModel.update(fields);

  return successResponse(res, 'Configuracion actualizada correctamente', { configuracion });
};

// POST /api/configuracion/setup  (publico, solo mientras el sistema esta en blanco)
const completarSetup = async (req, res) => {
  const pendiente = await configuracionModel.setupPendiente();

  if (!pendiente) {
    return errorResponse(res, 'El sistema ya fue configurado. Inicia sesion para cambiar los datos.', undefined, 409);
  }

  const { admin = {}, ...resto } = req.body;
  const configuracion = soloCamposEditables(resto);

  try {
    const password_hash = await bcrypt.hash(admin.password, HASH_ROUNDS);
    const resultado = await configuracionModel.completarSetup({
      configuracion,
      admin: {
        nombre: String(admin.nombre || '').trim(),
        apellido: admin.apellido ? String(admin.apellido).trim() : null,
        username: String(admin.username || '').trim(),
        email: admin.email ? String(admin.email).trim() : null,
        telefono: admin.telefono ? String(admin.telefono).trim() : null,
        password_hash
      }
    });

    const token = jwt.sign(
      {
        id: resultado.usuario.id,
        username: resultado.usuario.username,
        rol_id: resultado.usuario.rol_id,
        rol: 'Admin',
        nombre: resultado.usuario.nombre,
        apellido: resultado.usuario.apellido
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return successResponse(res, 'Configuracion inicial completada', {
      configuracion: resultado.configuracion,
      token,
      user: resultado.usuario
    }, 201);
  } catch (error) {
    // 23505: unique_violation (username o email repetidos)
    if (error.code === '23505') {
      return errorResponse(res, 'Ya existe un usuario con ese nombre de usuario o email', error.detail, 409);
    }

    // 23514: check_violation, 23502: not_null_violation
    if (error.code === '23514' || error.code === '23502') {
      return errorResponse(res, 'Los datos enviados no son validos', error.detail, 400);
    }

    throw error;
  }
};

// POST /api/configuracion/logo?tipo=logo|documentos|icono
// Durante el asistente va sin token; despues del setup exige Admin (ver setupGuard).
const subirLogo = async (req, res) => {
  if (!req.file) {
    return errorResponse(res, 'Debes adjuntar una imagen', undefined, 400);
  }

  const tipo = String(req.body.tipo || req.query.tipo || 'logo');
  const campo = CAMPOS_LOGO[tipo];

  if (!campo) {
    cleanupUploadedFile(req.file);
    return errorResponse(res, 'Tipo de logo invalido. Usa logo, documentos o icono.', undefined, 400);
  }

  const actual = await configuracionModel.get();
  const configuracion = await configuracionModel.updateLogo(campo, req.file.url);

  borrarArchivoPublico(actual?.[campo]);

  return successResponse(res, 'Logo actualizado correctamente', {
    tipo,
    campo,
    url: req.file.url,
    configuracion
  }, 201);
};

// DELETE /api/configuracion/logo/:tipo
const eliminarLogo = async (req, res) => {
  const tipo = String(req.params.tipo || '');
  const campo = CAMPOS_LOGO[tipo];

  if (!campo) {
    return errorResponse(res, 'Tipo de logo invalido. Usa logo, documentos o icono.', undefined, 400);
  }

  const actual = await configuracionModel.get();
  const configuracion = await configuracionModel.updateLogo(campo, null);

  borrarArchivoPublico(actual?.[campo]);

  return successResponse(res, 'Logo eliminado correctamente', { tipo, campo, configuracion });
};

module.exports = {
  getEstado,
  getConfiguracion,
  updateConfiguracion,
  completarSetup,
  subirLogo,
  eliminarLogo
};
