const { ApolloServer } = require("apollo-server-express");
const mongoose = require("mongoose");
const express = require("express");
const { json2csv } = require("json-2-csv");
const cors = require("cors");
const typeDefs = require("./db/schema");
const resolvers = require("./db/resolvers");
const conectarDB = require("./config/db");
const jwt = require("jsonwebtoken");
const Pedido = require("./models/Pedido"); // Import your Mongoose models
const Usuario = require("./models/Usuario"); // Import your Mongoose models
const Producto = require("./models/Producto");

// Conectar a la Base de datos
conectarDB();

// Initialize Express app
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4000;

// Enable CORS
app.use(cors());

// Middleware to authenticate and authorize users
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract the token from the header
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Verify the token
    const usuario = jwt.verify(token, process.env.SECRETA);

    // Attach the user to the request object
    req.user = usuario;

    // Check if the user is an "administrador"
    if (req.user.role !== "administrador") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

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

// Route to download CSV
app.get("/api/download-pedidos", authenticate, async (req, res) => {
  try {
    console.log("Obteniendo pedidos de la base de datos...");
    // Fetch all "pedido" data using Mongoose
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

        // Formatear la fecha con JavaScript nativo
        const fechaCreado = new Date(pedido.creado);
        const año = fechaCreado.getFullYear();
        const mes = String(fechaCreado.getMonth() + 1).padStart(2, "0"); // Los meses van de 0 a 11
        const dia = String(fechaCreado.getDate()).padStart(2, "0");

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
          creado: `${año}-${mes}-${dia}`, // Convertir fecha a string
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

    // Set headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=pedidos.csv");

    // Send the CSV file as a response
    res.status(200).send(csv);
  } catch (error) {
    console.error("Error generating CSV:", error);
    res.status(500).json({ message: "Failed to generate CSV" });
  }
});

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
  persistedQueries: false,
  context: ({ req }) => {
    const token = req.headers["authorization"] || "";

    if (token) {
      try {
        // Verify and decode the token
        const usuario = jwt.verify(
          token.replace("Bearer ", ""),
          process.env.SECRETA
        );

        // Log the decoded token payload for debugging
        // console.log("Decoded token payload:", usuario);

        // Return the usuario object (including role) and Mongoose models to the context
        return {
          usuario: {
            id: usuario.id,
            role: usuario.role,
            token: usuario.token,
          },
          Pedido,
          Usuario,
        };
      } catch (error) {
        console.log("Hubo un error en el token");
        console.log(error);
      }
    }

    // If no token is provided, return only the Mongoose models
    return { Pedido, Usuario };
  },
});

// Start the Apollo Server and apply middleware
async function startServer() {
  await server.start(); // Await the server start
  server.applyMiddleware({ app });

  // Determine the correct URL for logging
  const HOST = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  const graphqlPath = server.graphqlPath;

  // Start the Express server
  app.listen(PORT, () => {
    console.log(`Servidor listo en ${HOST}${graphqlPath}`);
    console.log(`Servidor GraphQL listo en ${HOST}${graphqlPath}`);
  });
}

// Call the async function to start the server
startServer();
