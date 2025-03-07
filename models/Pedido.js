const mongoose = require("mongoose");
const Proveedor = require("./Proveedor"); // Importar el modelo de Proveedor

const PedidoSchema = mongoose.Schema({
  numeropedido: {
    type: String,
    required: true,
    unique: true,
  },
  pedido: {
    type: Array,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  envio: {
    type: Number,
    required: true,
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Cliente",
  },
  vendedor: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Usuario",
  },
  proveedor: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Proveedor",
  },
  estado: {
    type: String,
    default: "Pendiente",
  },
  creado: {
    type: Date,
    default: Date.now,
  },
  notas: {
    type: [String],
    default: [],
  },
  comisionPagada: { type: Boolean, default: false },
});

// Middleware para generar el número de pedido antes de guardar
PedidoSchema.pre("validate", async function (next) {
  if (this.isNew && !this.numeropedido) {
    try {
      console.log("Generando número de pedido...");

      // Asegurarse de que el campo proveedor esté presente
      if (!this.proveedor) {
        throw new Error(
          'El campo "proveedor" es obligatorio para generar el número de pedido.'
        );
      }

      // Obtener el código del proveedor desde su ID
      const proveedor = await Proveedor.findById(this.proveedor);
      if (!proveedor) {
        throw new Error("No se encontró un proveedor con el ID proporcionado.");
      }

      const codigoProveedor = proveedor.codigo; // Suponiendo que el campo "codigo" está definido en el modelo de Proveedor
      if (!codigoProveedor) {
        throw new Error("El proveedor no tiene un código asignado.");
      }

      // Obtener el último pedido del mismo proveedor
      const lastPedido = await mongoose
        .model("Pedido")
        .findOne({ proveedor: this.proveedor })
        .sort({ creado: -1 });

      // Manejar el caso donde no hay pedidos previos para el proveedor
      const lastNumero =
        lastPedido && lastPedido.numeropedido
          ? parseInt(lastPedido.numeropedido.split("-")[1], 10)
          : 0;

      // Generar el nuevo número de pedido
      this.numeropedido = `${codigoProveedor}-${(lastNumero + 1)
        .toString()
        .padStart(5, "0")}`;
      console.log("Número de pedido generado:", this.numeropedido);
    } catch (error) {
      console.error("Error al generar número de pedido:", error);
      return next(error); // Pasar el error al manejador global
    }
  }
  next();
});

// Convertir ObjectId a string en la respuesta JSON
PedidoSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString(); // Convertir _id a id y asegurarse de que sea un string
    delete ret._id; // Eliminar el campo _id
    delete ret.__v; // Eliminar el campo __v
    return ret;
  },
});

module.exports = mongoose.model("Pedido", PedidoSchema);
