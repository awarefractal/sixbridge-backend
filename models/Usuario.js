const mongoose = require("mongoose");
const validateRUT = require("../utils/validateRUT");

const ComisionHistorySchema = new mongoose.Schema({
  pedidoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pedido",
    required: true,
  },
  fecha: { type: Date, default: Date.now },
  monto: { type: Number, required: true },
  pagadoPor: { type: String, required: true }, // Admin who marked it as paid
});

const UsuarioSchema = mongoose.Schema({
  rut: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: validateRUT,
      message: (props) => `${props.value} no es un RUT válido`,
    },
  },
  nombre: { type: String, required: true },
  ndocumento: String,
  email: { type: String, required: true, unique: true },
  telefono: String,
  creado: { type: Date, default: Date.now },
  direccioncalle: String,
  direccionnumero: String,
  direcciondepto: String,
  direccioncomuna: String,
  direccionregion: String,
  direccionprovincia: String,
  cuentabanconumero: String,
  cuentabanconombre: String,
  cuentabancotipocuenta: String,
  carnetfrente: String,
  carnetreverso: String,
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["vendedor", "administrador"], // Valores permitidos
    default: "vendedor", // Valor predeterminado
  },
  comisionHistory: [ComisionHistorySchema],
});

UsuarioSchema.pre("save", function (next) {
  if (this.rut) {
    // Format RUT as 12.345.678-9 or 1.234.567-8
    const cleanedRUT = this.rut.replace(/[^0-9kK]/g, "").replace(/\s/g, "");
    const number = cleanedRUT.slice(0, -1);
    const dv = cleanedRUT.slice(-1).toUpperCase();

    let formattedNumber = "";
    if (number.length <= 7) {
      formattedNumber = `${number.slice(0, 1)}.${number.slice(
        1,
        4
      )}.${number.slice(4, 7)}`;
    } else {
      formattedNumber = `${number.slice(0, 2)}.${number.slice(
        2,
        5
      )}.${number.slice(5, 8)}`;
    }

    this.rut = `${formattedNumber}-${dv}`;
  }
  next();
});

module.exports = mongoose.model("Usuario", UsuarioSchema);
