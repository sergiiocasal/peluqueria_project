// Cargar las variables de entorno
require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();  // Importamos sqlite3
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3977;  // Usamos el puerto de .env o 5000 por defecto

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(helmet.referrerPolicy({ policy: 'unsafe-url' }));
app.use(cors({
  origin: (origin, callback) => {
    const ACCEPTED_ORIGINS = [
      // 
      // AQUI VAN LOS DOMINIOS PERMITIDOS
      // 
    ];

    if (ACCEPTED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    if (!origin) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
}));

app.disable('x-powered-by');

// Configuración de la conexión con la base de datos SQLite usando la URL de Turso
const db = new sqlite3.Database("libsql://peluqueria-sergiiocasal.turso.io", (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos SQLite:', err.message);
    return;
  }
  console.log('✅ Conectado a la base de datos SQLite de Turso');
});

// Crear la tabla "clientes" si no existe
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telefono TEXT UNIQUE NOT NULL,
    visitas INTEGER DEFAULT 0,
    totalvisitas INTEGER DEFAULT 0,
    nombre TEXT DEFAULT NULL
  );
`;

db.run(createTableQuery, (err) => {
  if (err) {
    console.error('Error al crear la tabla:', err.message);
  } else {
    console.log('✅ Tabla "clientes" verificada/creada');
  }
});

// Ruta para comprobar si el teléfono está registrado
app.get('/comprobar-visitas', (req, res) => {
  const { telefono } = req.query;

  db.get('SELECT * FROM clientes WHERE telefono = ?', [telefono], (err, row) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error en la base de datos' });
    }

    if (!row) {
      return res.json({ telefonoRegistrado: false });  // No existe el teléfono
    } else {
      return res.json({ telefonoRegistrado: true, visitas: row.visitas });  // El teléfono ya existe
    }
  });
});

// Ruta para registrar una visita
app.post('/registrar-visita', (req, res) => {
  const { telefono, nombre } = req.body;

  // Si el teléfono ya está registrado
  db.get('SELECT * FROM clientes WHERE telefono = ?', [telefono], (err, row) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error en la base de datos' });
    }

    if (row) {
      // Si ya tiene visitas, no permitimos actualizar el nombre
      if (row.visitas > 0 && nombre) {
        return res.status(400).json({ mensaje: 'El nombre no debe ser actualizado después de la primera visita.' });
      }

      // Actualizar el contador de visitas
      let nuevasVisitas = row.visitas + 1;
      const totalVisitas = row.totalvisitas + 1;

      // Si las visitas llegan a 10, se reinician a 0
      if (nuevasVisitas === 10) {
        nuevasVisitas = 0;
      }

      // Actualizamos la base de datos con las nuevas visitas
      db.run(
        'UPDATE clientes SET visitas = ?, totalvisitas = ? WHERE telefono = ?',
        [nuevasVisitas, totalVisitas, telefono],
        (err) => {
          if (err) {
            return res.status(500).json({ mensaje: 'Error al actualizar las visitas' });
          }
          res.json({
            mensaje:
              nuevasVisitas === 0
                ? '¡Felicidades! Has alcanzado 10 visitas. Tu próxima visita, te invitamos nosotros.'
                : `Llevas ${nuevasVisitas} visitas este mes. Total de visitas acumuladas: ${totalVisitas}.`,
          });
        }
      );
    } else {
      // Si el cliente no existe, creamos un nuevo cliente con el nombre y la primera visita
      db.run(
        'INSERT INTO clientes (telefono, nombre, visitas, totalvisitas) VALUES (?, ?, ?, ?)',
        [telefono, nombre, 1, 1],
        (err) => {
          if (err) {
            return res.status(500).json({ mensaje: 'Error al registrar el cliente' });
          }
          res.json({ mensaje: 'Primera visita registrada.' });
        }
      );
    }
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
