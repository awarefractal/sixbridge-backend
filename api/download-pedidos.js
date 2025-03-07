const express = require("express");
const mongoose = require("mongoose");
const { json2csv } = require("json-2-csv");
const Pedido = require("../models/Pedido"); // Ajusta la ruta a tu modelo Pedido
const Producto = require("../models/Producto"); // Importar el modelo de Producto

const router = express.Router();

// Middleware para verificar si el usuario es un "administrador"
const authenticateAdmin = (req, res, next) => {
  console.log("Middleware authenticateAdmin ejecutado");
  // Reemplaza esto con tu lógica de autenticación real
  const user = req.user; // Asumiendo que tienes datos del usuario en req.user
  if (!user || user.role !== "administrador") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  next();
};

// Función para limpiar un objeto de MongoDB
const cleanMongoObject = (obj) => {
  if (obj && typeof obj === "object") {
    // Si es un ObjectId, convertirlo a string
    if (obj instanceof mongoose.Types.ObjectId) {
      return obj.toString();
    }
    // Si es un objeto con propiedades buffer, eliminarlas
    if (obj.buffer && Array.isArray(obj.buffer)) {
      return obj.toString();
    }
    // Limpiar recursivamente las propiedades del objeto
    const cleaned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cleaned[key] = cleanMongoObject(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
};

// Ruta para descargar CSV
router.get("/download-pedidos", authenticateAdmin, async (req, res) => {
  console.log("Ruta /download-pedidos llamada");
  try {
    console.log("Obteniendo pedidos de la base de datos...");
    // Obtener todos los pedidos de MongoDB usando Mongoose
    const pedidos = await Pedido.find({})
      .populate("cliente", "nombre email") // Campos que necesitas del cliente
      .populate("vendedor", "nombre email") // Campos que necesitas del vendedor
      .populate("proveedor", "nombre codigo") // Campos que necesitas del proveedor
      .lean();

    // Transformar los datos para incluir el SKU de los productos y limpiar los campos
    const transformedPedidos = await Promise.all(
      pedidos.map(async (pedido) => {
        const productosConSKU = await Promise.all(
          pedido.pedido.map(async (item) => {
            const producto = await Producto.findById(item.id).lean();
            return {
              ...item,
              sku: producto ? producto.sku : "N/A", // Asegúrate de que el modelo de Producto tenga un campo SKU
            };
          })
        );

        // Limpiar el objeto pedido de propiedades innecesarias
        const cleanedPedido = cleanMongoObject({
          numeropedido: pedido.numeropedido,
          productos: productosConSKU
            .map((item) => `${item.sku} (x${item.cantidad})`)
            .join(", "),
          total: pedido.total,
          subtotal: pedido.subtotal,
          envio: pedido.envio,
          cliente: pedido.cliente ? pedido.cliente.nombre : "N/A",
          vendedor: pedido.vendedor ? pedido.vendedor.nombre : "N/A",
          proveedor: pedido.proveedor ? pedido.proveedor.nombre : "N/A",
          estado: pedido.estado,
          creado: pedido.creado.toISOString(), // Convertir fecha a string
          notas: pedido.notas.join(", "),
          comisionPagada: pedido.comisionPagada,
        });

        console.log("Pedidos obtenidos:", pedidos.length);

        return cleanedPedido;
      })
    );

    console.log(JSON.stringify(transformedPedidos, null, 2));

    // Convertir JSON a CSV
    const csv = json2csv(transformedPedidos);

    // Configurar cabeceras para la descarga del CSV
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=pedidos.csv");

    // Enviar el archivo CSV como respuesta
    res.status(200).send(csv);
  } catch (error) {
    console.error("Error generando CSV:", error);
    res.status(500).json({ message: "Error al generar CSV" });
  }
});

module.exports = router;
