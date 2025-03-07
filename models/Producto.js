const mongoose = require("mongoose");

const productoSchema = mongoose.Schema({
  nombre: { type: String, required: true },
  existencia: { type: Number, required: true },
  precio: { type: Number, required: true, trim: true },
  costo: { type: Number, required: true, trim: true },
  creado: { type: Date, default: Date.now },
  skuproveedor: { type: String, required: true },
  skuproducto: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  descripcion: { type: String },
});
// Hook 'pre-save' para generar el SKU antes de guardar el documento
productoSchema.pre("save", function (next) {
  if (!this.skuproveedor || !this.skuproducto) {
    // Throw an error if either field is missing
    return next(
      new Error("skuproveedor and skuproducto are required to generate sku.")
    );
  }
  // Generate the SKU by concatenating skuproveedor and skuproducto
  this.sku = `${this.skuproveedor}${this.skuproducto}`;
  next();
});

// Crear el modelo Producto a partir del esquema
const Producto = mongoose.model("Producto", productoSchema);

module.exports = Producto;
