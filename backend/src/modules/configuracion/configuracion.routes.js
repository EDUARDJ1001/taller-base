const { Router } = require('express');
const { body, param } = require('express-validator');
const configuracionController = require('./configuracion.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');
const { permitirDuranteSetup, soloDuranteSetup } = require('../../middlewares/setupGuard');
const { upload, setUploadFolder } = require('../../middlewares/uploadMiddleware');

const router = Router();

const tiposLogo = ['logo', 'documentos', 'icono'];

const nombreTallerOpcional = body('nombre_taller')
  .optional()
  .trim()
  .isLength({ min: 2, max: 150 })
  .withMessage('El nombre del taller debe tener entre 2 y 150 caracteres');

const nombreTallerRequerido = body('nombre_taller')
  .trim()
  .isLength({ min: 2, max: 150 })
  .withMessage('El nombre del taller es requerido');

const datosTallerOpcionales = [
  body('razon_social').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Razon social demasiado larga'),
  body('eslogan').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Eslogan demasiado largo'),
  body('identidad_rtn').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }).withMessage('Identidad/RTN demasiado largo'),
  body('telefono').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('Telefono demasiado largo'),
  body('whatsapp').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('WhatsApp demasiado largo'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalido'),
  body('direccion').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Direccion demasiado larga'),
  body('ciudad').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Ciudad demasiado larga'),
  body('pais').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Pais demasiado largo'),
  body('moneda').optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 1, max: 10 }).withMessage('Moneda invalida'),
  body('locale').optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 2, max: 20 }).withMessage('Formato regional invalido'),
  body('color_primario').optional({ nullable: true, checkFalsy: true }).trim().matches(/^#[0-9a-fA-F]{6}$/).withMessage('El color debe ser hexadecimal, por ejemplo #265c7b'),
  body('logo_url').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('URL de logo demasiado larga'),
  body('logo_documentos_url').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('URL de logo demasiado larga'),
  body('icono_url').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('URL de icono demasiado larga')
];

// Estado del sistema: lo consulta la app al abrir, antes de iniciar sesion,
// para saber si muestra el asistente de bienvenida o la pantalla de login.
router.get('/estado', asyncHandler(configuracionController.getEstado));

// Asistente de bienvenida: guarda los datos del taller y crea el primer Admin.
router.post(
  '/setup',
  soloDuranteSetup,
  [
    nombreTallerRequerido,
    ...datosTallerOpcionales,
    body('admin.nombre').trim().notEmpty().withMessage('El nombre del administrador es requerido'),
    body('admin.apellido').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Apellido demasiado largo'),
    body('admin.username').trim().isLength({ min: 3, max: 80 }).withMessage('El usuario debe tener al menos 3 caracteres'),
    body('admin.email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email del administrador invalido'),
    body('admin.telefono').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('Telefono demasiado largo'),
    body('admin.password').isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres')
  ],
  validateRequest,
  asyncHandler(configuracionController.completarSetup)
);

// Logos: sin sesion mientras dura el asistente, solo Admin despues del setup.
router.post(
  '/logo',
  permitirDuranteSetup(authMiddleware, roleMiddleware('Admin')),
  setUploadFolder('branding'),
  upload.single('imagen'),
  [
    body('tipo').optional().isIn(tiposLogo).withMessage('Tipo de logo invalido')
  ],
  validateRequest,
  asyncHandler(configuracionController.subirLogo)
);

router.delete(
  '/logo/:tipo',
  permitirDuranteSetup(authMiddleware, roleMiddleware('Admin')),
  [
    param('tipo').isIn(tiposLogo).withMessage('Tipo de logo invalido')
  ],
  validateRequest,
  asyncHandler(configuracionController.eliminarLogo)
);

// Datos completos del taller (los usan facturas, cotizaciones y reportes).
router.get('/', authMiddleware, asyncHandler(configuracionController.getConfiguracion));

router.put(
  '/',
  authMiddleware,
  roleMiddleware('Admin'),
  [nombreTallerOpcional, ...datosTallerOpcionales],
  validateRequest,
  asyncHandler(configuracionController.updateConfiguracion)
);

module.exports = router;
