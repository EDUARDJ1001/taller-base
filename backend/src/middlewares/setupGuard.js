const configuracionModel = require('../modules/configuracion/configuracion.model');
const { errorResponse } = require('../utils/responses');

// Ejecuta una lista de middlewares en orden, como lo haria Express.
const runChain = (middlewares, req, res, next) => {
  let index = 0;

  const step = (error) => {
    if (error) return next(error);

    const middleware = middlewares[index];
    index += 1;

    if (!middleware) return next();

    return middleware(req, res, step);
  };

  return step();
};

/**
 * Deja pasar sin sesion mientras el sistema esta en blanco (asistente de bienvenida).
 * En cuanto el setup esta completo, exige los middlewares indicados (auth + rol).
 * Asi el mismo endpoint sirve para el asistente y para la pantalla de Configuracion.
 */
const permitirDuranteSetup = (...middlewares) => async (req, res, next) => {
  try {
    if (await configuracionModel.setupPendiente()) {
      req.setupPendiente = true;
      return next();
    }
  } catch (error) {
    return next(error);
  }

  return runChain(middlewares, req, res, next);
};

/** Bloquea el endpoint cuando el sistema ya fue configurado. */
const soloDuranteSetup = async (req, res, next) => {
  try {
    if (await configuracionModel.setupPendiente()) {
      req.setupPendiente = true;
      return next();
    }
  } catch (error) {
    return next(error);
  }

  return errorResponse(
    res,
    'El sistema ya fue configurado. Inicia sesion para cambiar los datos del taller.',
    undefined,
    409
  );
};

module.exports = {
  permitirDuranteSetup,
  soloDuranteSetup
};
