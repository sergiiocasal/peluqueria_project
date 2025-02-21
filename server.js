require('dotenv').config(); // Carga las variables de entorno desde el archivo .env

const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000; // Usamos el puerto de .env o 5000 por defecto

// Middleware
app.use(cors());
app.use(bodyParser.json()); // Para poder leer el cuerpo de las solicitudes en formato JSON

// Conexión a la base de datos MySQL usando variables de entorno
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT, // Asegúrate de usar el puerto adecuado
});

db.connect((err) => {
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
    totavisitas INT DEFAULT 0,
    nombre VARCHAR(255) DEFAULT NULL
  );
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error("Error al crear la tabla:", err.message);
  } else {
    console.log("✅ Tabla 'clientes' verificada/creada");
  }
});

// Endpoint para comprobar si el teléfono está registrado
app.get("/comprobar-visitas", (req, res) => {
  const { telefono } = req.query;

  db.query("SELECT * FROM clientes WHERE telefono = ?", [telefono], (err, results) => {
    if (err) {
      return res.status(500).json({ mensaje: "Error en la base de datos" });
    }

    if (results.length === 0) {
      return res.json({ telefonoRegistrado: false }); // No existe el teléfono
    } else {
      return res.json({ telefonoRegistrado: true, visitas: results[0].visitas }); // El teléfono ya existe
    }
  });
});

// Endpoint para registrar una visita
app.post("/registrar-visita", (req, res) => {
  const { telefono, nombre } = req.body;

  // Si el teléfono ya está registrado
  db.query("SELECT * FROM clientes WHERE telefono = ?", [telefono], (err, results) => {
    if (err) {
      return res.status(500).json({ mensaje: "Error en la base de datos" });
    }

    if (results.length > 0) {
      // Si ya tiene visitas, no permitimos actualizar el nombre
      if (results[0].visitas > 0 && nombre) {
        return res.status(400).json({ mensaje: "El nombre no debe ser actualizado después de la primera visita." });
      }

      // Actualizar el contador de visitas
      let nuevasVisitas = results[0].visitas + 1;
      const totalVisitas = results[0].totavisitas + 1;

      // Si las visitas llegan a 10, se reinician a 0
      if (nuevasVisitas === 10) {
        nuevasVisitas = 0;
      }

      // Actualizamos la base de datos con las nuevas visitas
      db.query(
        "UPDATE clientes SET visitas = ?, totavisitas = ? WHERE telefono = ?",
        [nuevasVisitas, totalVisitas, telefono],
        (err) => {
          if (err) {
            return res.status(500).json({ mensaje: "Error al actualizar las visitas" });
          }
          res.json({
            mensaje:
              nuevasVisitas === 0
                ? `¡Felicidades! Has alcanzado 10 visitas. Tu próxima visita, te invitamos nosotros.`
                : `Llevas ${nuevasVisitas} visitas este mes. Total de visitas acumuladas: ${totalVisitas}.`,
          });
        }
      );
    } else {
      // Si el cliente no existe, creamos un nuevo cliente con el nombre y la primera visita
      db.query(
        "INSERT INTO clientes (telefono, nombre, visitas, totavisitas) VALUES (?, ?, ?, ?)",
        [telefono, nombre, 1, 1],
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

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
