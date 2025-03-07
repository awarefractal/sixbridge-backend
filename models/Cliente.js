const mongoose = require("mongoose");

const ClientesSchema = mongoose.Schema({
  rut: String,
  rutdv: String,
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  telefono: { type: String, trim: true },
  creado: { type: Date, default: Date.now },
  direccioncalle: String,
  direccionnumero: String,
  direcciondepto: String,
  direccioncomuna: String,
  direccionregion: String,
  direccionprovincia: String,
  vendedor: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Usuario",
  },
});

module.exports = mongoose.model("Cliente", ClientesSchema);
