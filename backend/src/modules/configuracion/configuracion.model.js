const { query, transaction } = require('../../config/db');

const CONFIG_SELECT = `
  c.id,
  c.nombre_taller,
  c.razon_social,
  c.eslogan,
  c.identidad_rtn,
  c.telefono,
  c.whatsapp,
  c.email,
  c.direccion,
  c.ciudad,
  c.pais,
  c.moneda,
  c.locale,
  c.color_primario,
  c.logo_url,
  c.logo_documentos_url,
  c.icono_url,
  c.setup_completado,
  c.fecha_setup,
  c.fecha_actualizacion
`;

// Campos que el taller puede editar (desde el asistente o desde Configuracion).
const CAMPOS_EDITABLES = [
  'nombre_taller',
  'razon_social',
  'eslogan',
  'identidad_rtn',
  'telefono',
  'whatsapp',
  'email',
  'direccion',
  'ciudad',
  'pais',
  'moneda',
  'locale',
  'color_primario',
  'logo_url',
  'logo_documentos_url',
  'icono_url'
];

// La fila 1 la crea la migracion 010; este INSERT es un seguro por si la base
// se preparo a mano y la fila no existe.
const ensureRow = async (client = null) => {
  const run = client ? client.query.bind(client) : query;
  await run('INSERT INTO configuracion_taller (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
};

const get = async () => {
  await ensureRow();

  const result = await query(`SELECT ${CONFIG_SELECT} FROM configuracion_taller c WHERE c.id = 1 LIMIT 1`);

  return result.rows[0] || null;
};

const contarUsuariosActivos = async () => {
  const result = await query("SELECT COUNT(*)::int AS total FROM usuarios WHERE estado = 'Activo'::estado_general");

  return result.rows[0]?.total || 0;
};

// El asistente de bienvenida solo esta disponible mientras el sistema esta "en blanco":
// sin setup marcado como completado y sin ningun usuario activo que pueda entrar.
const setupPendiente = async () => {
  const configuracion = await get();

  if (configuracion?.setup_completado) {
    return false;
  }

  const usuarios = await contarUsuariosActivos();

  return usuarios === 0;
};

const buildUpdate = (fields, startIndex = 1) => {
  const sets = [];
  const params = [];
  let index = startIndex;

  CAMPOS_EDITABLES.forEach((campo) => {
    if (fields[campo] === undefined) return;

    sets.push(`${campo} = $${index}`);
    params.push(fields[campo] === '' ? null : fields[campo]);
    index += 1;
  });

  return { sets, params, nextIndex: index };
};

const update = async (fields = {}) => {
  await ensureRow();

  const { sets, params } = buildUpdate(fields);

  if (!sets.length) {
    return get();
  }

  const result = await query(
    `
      UPDATE configuracion_taller c
      SET ${sets.join(', ')}
      WHERE c.id = 1
      RETURNING ${CONFIG_SELECT}
    `,
    params
  );

  return result.rows[0] || null;
};

const updateLogo = async (campo, url) => {
  if (!CAMPOS_EDITABLES.includes(campo)) {
    throw new Error(`Campo de logo no permitido: ${campo}`);
  }

  return update({ [campo]: url });
};

// Guarda los datos del taller y crea el primer usuario Admin en una sola transaccion:
// si algo falla, el sistema sigue "en blanco" y el asistente se puede repetir.
const completarSetup = async ({ configuracion = {}, admin }) => {
  return transaction(async (client) => {
    await ensureRow(client);

    const rolResult = await client.query(
      "SELECT id FROM roles WHERE nombre = 'Admin' AND estado = 'Activo'::estado_general LIMIT 1"
    );
    const rolAdmin = rolResult.rows[0];

    if (!rolAdmin) {
      throw Object.assign(
        new Error('El rol Admin no existe. Aplica las migraciones antes de iniciar el asistente.'),
        { statusCode: 500 }
      );
    }

    const usuarioResult = await client.query(
      `
        INSERT INTO usuarios (rol_id, nombre, apellido, username, email, telefono, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, rol_id, nombre, apellido, username, email, telefono, estado, fecha_creacion
      `,
      [
        rolAdmin.id,
        admin.nombre,
        admin.apellido || null,
        admin.username,
        admin.email || null,
        admin.telefono || null,
        admin.password_hash
      ]
    );

    const { sets, params, nextIndex } = buildUpdate(configuracion);
    const setClauses = [...sets, 'setup_completado = TRUE', 'fecha_setup = NOW()'];

    const configResult = await client.query(
      `
        UPDATE configuracion_taller c
        SET ${setClauses.join(', ')}
        WHERE c.id = $${nextIndex}
        RETURNING ${CONFIG_SELECT}
      `,
      [...params, 1]
    );

    return {
      configuracion: configResult.rows[0] || null,
      usuario: { ...usuarioResult.rows[0], rol: 'Admin' }
    };
  });
};

module.exports = {
  CAMPOS_EDITABLES,
  get,
  update,
  updateLogo,
  contarUsuariosActivos,
  setupPendiente,
  completarSetup
};
