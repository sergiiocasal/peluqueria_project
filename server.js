// Requerimos las dependencias necesarias
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json()); // Para poder leer el cuerpo de las solicitudes en formato JSON

// Conexión a la base de datos SQLite
const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err.message);
  } else {
    console.log("✅ Conectado a SQLite");
  }
});

// Crear la tabla "clientes" si no existe
db.run(`CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telefono TEXT UNIQUE NOT NULL,
  visitas INTEGER DEFAULT 0,
  totavisitas INTEGER DEFAULT 0
)`);

// Endpoint para registrar una visita
app.post("/registrar-visita", (req, res) => {
  const { telefono } = req.body;

  // Validación de que el número de teléfono tenga 9 dígitos
  if (!telefono || !telefono.match(/^\d{9}$/)) {
    return res.status(400).json({ mensaje: "Número de teléfono inválido" });
  }

  // Buscar al cliente por teléfono en la base de datos
  db.get("SELECT * FROM clientes WHERE telefono = ?", [telefono], (err, row) => {
    if (err) {
      return res.status(500).json({ mensaje: "Error en la base de datos" });
    }

    if (row) {
      // Si el cliente ya existe, actualizamos el contador de visitas
      let nuevasVisitas = row.visitas + 1;
      const totalVisitas = row.totavisitas + 1;

      // Si las visitas llegan a 10, se reinician a 0
      if (nuevasVisitas === 10) {
        nuevasVisitas = 0;
      }

      // Actualizamos la base de datos con las nuevas visitas
      db.run("UPDATE clientes SET visitas = ?, totavisitas = ? WHERE telefono = ?", [nuevasVisitas, totalVisitas, telefono], (err) => {
        if (err) {
          return res.status(500).json({ mensaje: "Error al actualizar las visitas" });
        }
        res.json({
          mensaje: nuevasVisitas === 0
            ? `¡Felicidades! Has alcanzado 10 visitas, tu contador de visitas se ha reiniciado.`
            : `Llevas ${nuevasVisitas} visitas este mes. Total de visitas acumuladas: ${totalVisitas}.`,
        });
      });
    } else {
      // Si el cliente no existe, creamos un nuevo cliente con 1 visita
      db.run("INSERT INTO clientes (telefono, visitas, totavisitas) VALUES (?, ?, ?)", [telefono, 1, 1], (err) => {
        if (err) {
          return res.status(500).json({ mensaje: "Error al registrar el cliente" });
        }
        res.json({ mensaje: "Primera visita registrada." });
      });
    }
  });
});

// Endpoint para consultar las visitas de un cliente
app.get("/ver-visitas/:telefono", (req, res) => {
  const { telefono } = req.params;

  db.get("SELECT visitas, totavisitas FROM clientes WHERE telefono = ?", [telefono], (err, row) => {
    if (err) {
      return res.status(500).json({ mensaje: "Error en la base de datos" });
    }

    if (!row) {
      return res.status(404).json({ mensaje: "Cliente no encontrado" });
    }

    res.json({
      mensaje: `Llevas ${row.visitas} visitas este mes. Total de visitas acumuladas: ${row.totavisitas}.`,
    });
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
