const mongoose = require("mongoose");

const ProveedorSchema = mongoose.Schema({
  rut: String,
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  telefono: { type: String, trim: true },
  creado: { type: Date, default: Date.now },
  direccioncalle: String,
  direccionnumero: String,
  direcciondepto: String,
  direccioncomuna: String,
  direccionregion: String,
  comision: { type: Number, required: true },
  codigo: String,
  estado: { type: Boolean, default: true },
});

module.exports = mongoose.model("Proveedor", ProveedorSchema);
