const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json()); // Para poder leer el cuerpo de las solicitudes en formato JSON

// Conexión a la base de datos MySQL usando las variables de entorno de Railway
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Conexión a la base de datos
connection.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err.message);
  } else {
    console.log("✅ Conectado a MySQL");
  }
});

// Crear la tabla "clientes" si no existe
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telefono VARCHAR(15) UNIQUE NOT NULL,
    visitas INT DEFAULT 0,
    totavisitas INT DEFAULT 0
  );
`;

connection.query(createTableQuery, (err, results) => {
  if (err) {
    console.error("Error al crear la tabla:", err.message);
  } else {
    console.log("✅ Tabla 'clientes' verificada o creada.");
  }
});

// Endpoint para registrar una visita
app.post("/registrar-visita", (req, res) => {
  const { telefono } = req.body;

  // Validación de que el número de teléfono tenga 9 dígitos
  if (!telefono || !telefono.match(/^\d{9}$/)) {
    return res.status(400).json({ mensaje: "Número de teléfono inválido" });
  }

  // Buscar al cliente por teléfono en la base de datos
  connection.query("SELECT * FROM clientes WHERE telefono = ?", [telefono], (err, results) => {
    if (err) {
      return res.status(500).json({ mensaje: "Error en la base de datos" });
    }

    if (results.length > 0) {
      // Si el cliente ya existe, actualizamos el contador de visitas
      const row = results[0];
      let nuevasVisitas = row.visitas + 1;
      const totalVisitas = row.totavisitas + 1;

      // Si las visitas llegan a 10, se reinician a 0
      if (nuevasVisitas === 10) {
        nuevasVisitas = 0;
      }

      // Actualizamos la base de datos con las nuevas visitas
      connection.query(
        "UPDATE clientes SET visitas = ?, totavisitas = ? WHERE telefono = ?",
        [nuevasVisitas, totalVisitas, telefono],
        (err) => {
          if (err) {
            return res.status(500).json({ mensaje: "Error al actualizar las visitas" });
          }
          res.json({
            mensaje: nuevasVisitas === 0
              ? `¡Felicidades! Has alcanzado 10 visitas, tu contador de visitas se ha reiniciado.`
              : `Llevas ${nuevasVisitas} visitas este mes. Total de visitas acumuladas: ${totalVisitas}.`,
          });
        }
      );
    } else {
      // Si el cliente no existe, creamos un nuevo cliente con 1 visita
      connection.query(
        "INSERT INTO clientes (telefono, visitas, totavisitas) VALUES (?, ?, ?)",
        [telefono, 1, 1],
        (err) => {
          if (err) {
            return res.status(500).json({ mensaje: "Error al registrar el cliente" });
          }
          res.json({ mensaje: "Primera visita registrada." });
        }
      );
    }
  });
});

// Endpoint para consultar las visitas de un cliente
app.get("/ver-visitas/:telefono", (req, res) => {
  const { telefono } = req.params;

  connection.query("SELECT visitas, totavisitas FROM clientes WHERE telefono = ?", [telefono], (err, results) => {
    if (err) {
      return res.status(500).json({ mensaje: "Error en la base de datos" });
    }

    if (results.length === 0) {
      return res.status(404).json({ mensaje: "Cliente no encontrado" });
    }

    const row = results[0];
    res.json({
      mensaje: `Llevas ${row.visitas} visitas este mes. Total de visitas acumuladas: ${row.totavisitas}.`,
    });
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
