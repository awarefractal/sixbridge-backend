const mongoose = require("mongoose");
const Usuario = require("../models/Usuario");
const Producto = require("../models/Producto");
const Cliente = require("../models/Cliente");
const Pedido = require("../models/Pedido");
const Proveedor = require("../models/Proveedor");
const CostoEnvio = require("../models/CostoEnvio");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { extendResolversFromInterfaces } = require("@graphql-tools/schema");
const calculateDeliveryCost = require("../utils/calcularCostoEnvio");
require("dotenv").config({ path: "variables.env" });
const { ObjectId } = require("mongodb"); // Importar ObjectId desde mongodb

const crearToken = (usuario, secreta, expiresIn) => {
  console.log("usuario:", usuario);
  const { id, role } = usuario;

  return jwt.sign({ id, role }, secreta, { expiresIn: "1h" });
};

// Resolvers
const resolvers = {
  Query: {
    obtenerUsuario: async (_, {}, ctx) => {
      //return ctx.usuario;
      const usuarioId = ctx.usuario?.id; // Asegúrate de que `context.usuario` tenga un `id`

      //console.log("usuarioId ", usuarioId);

      if (!usuarioId) {
        throw new Error("Usuario no autenticado");
      }

      const usuario = await Usuario.findById(usuarioId);

      if (!usuario) {
        throw new Error("Usuario no encontrado");
      }

      return usuario;
    },
    obtenerUsuariosPorRol: async (_, { role, limit, offset }) => {
      const usuarios = await Usuario.find({ role });
      return usuarios;
    },
    totalVendedores: async (_, { role }) => {
      return await Usuario.countDocuments({ role });
    },
    obtenerVendedor: async (_, { id }) => {
      // Revisar si el cliente existe o no
      const usuario = await Usuario.findById(id);

      if (!usuario) {
        throw new Error("Usuario no encontrado");
      }

      return usuario;
    },
    obtenerProductos: async () => {
      try {
        const productos = await Producto.find({});
        return productos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerProducto: async (_, { id }) => {
      // revisar si el produto existe
      const producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }
      return producto;
    },
    obtenerClientes: async (_, { limit, offset }, ctx) => {
      const { usuario } = ctx; // Assuming `usuario` contains the logged-in user's information

      // Debugging: Log the user and role
      //console.log("ctx.usuario", ctx.usuario);
      //console.log("ctx.usuario.id", ctx.usuario.id);

      try {
        const query = {};

        // Role-based filtering
        if (usuario?.role === "vendedor") {
          // If the user is a "vendedor", only fetch clients associated with them
          query.vendedor = usuario.id; // Assuming `vendedor` is a field in the `Cliente` model
        }

        // Fetch paginated clients
        const clientes = await Cliente.find(query)
          .skip(offset || 0) // Default offset to 0 if not provided
          .limit(limit || 10)
          .populate("vendedor"); // Default limit to 10 if not provided

        return clientes;
      } catch (error) {
        console.log(error);
        throw new Error("Error fetching clientes");
      }
    },
    obtenerClientesVendedorTodos: async (_, { limit, offset }, ctx) => {
      console.log("ctx.usuario", ctx.usuario);
      console.log("ctx.usuario.role", ctx.usuario.role);
      if (ctx.usuario.role === "administrador") {
        const clientes = await Cliente.find().skip(offset).limit(limit);
        return clientes;
      }
      try {
        const clientes = await Cliente.find({ vendedor: ctx.usuario.id })
          .skip(offset)
          .limit(limit);
        return clientes;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerClientesVendedor: async (_, { limit, offset }, ctx) => {
      if ("administrador" === ctx.usuario.role) {
        return await Cliente.find({}).skip(offset).limit(limit);
      } else {
        return await Cliente.find({ vendedor: ctx.usuario.id })
          .skip(offset)
          .limit(limit);
      }
    },
    totalClientesVendedor: async (_, args, ctx) => {
      return await Cliente.countDocuments({ vendedor: ctx.usuario.id });
    },
    totalClientesVendedorTodos: async (_, args, ctx) => {
      if (ctx.usuario.role === "administrador") {
        return await Cliente.countDocuments({});
      } else {
        return await Cliente.countDocuments({ vendedor: ctx.usuario.id });
      }
    },
    obtenerCliente: async (_, { id }, ctx) => {
      // Verificar si el usuario está autenticado
      if (!ctx.usuario) {
        throw new Error("Usuario no autenticado");
      }

      // Verificar si el cliente existe
      const cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }

      // Verificar si el usuario autenticado es el vendedor o un administrador
      const esVendedor = cliente.vendedor.toString() === ctx.usuario.id;
      const esAdministrador = ctx.usuario.role === "administrador";

      // Obtener los pedidos asociados al cliente desde el modelo Pedido
      const pedidos = await Pedido.find({ cliente: id });

      // Verificar si hay algún pedido que no esté en los estados permitidos
      const tienePedidosNoEditables = pedidos.some(
        (pedido) =>
          !["pendiente", "aprobado", "observado"].includes(pedido.estado)
      );

      // Si hay pedidos no editables, solo un administrador puede ver el cliente
      if (tienePedidosNoEditables && !esAdministrador) {
        throw new Error(
          "No tienes permisos para actualizar este cliente debido al estado de sus pedidos, por favor contacta a un administrador si necesitas hacer algún cambio."
        );
      }

      // Si no es ni el vendedor ni un administrador, no puede ver el cliente
      if (!esVendedor && !esAdministrador) {
        throw new Error("No tienes las credenciales para ver este cliente");
      }

      // Agregar los pedidos al objeto cliente antes de retornarlo
      cliente.pedidos = pedidos; // Esto es opcional, dependiendo de si necesitas los pedidos en la respuesta

      return cliente;
    },
    obtenerClienteAdmin: async (_, { id }) => {
      // Revisar si el cliente existe o no
      const cliente = await Cliente.findById(id);

      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }

      return cliente;
    },
    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({})
          .populate("cliente")
          .populate("proveedor")
          .populate("vendedor");
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedidosVendedor: async (_, {}, ctx) => {
      try {
        const pedidos = Pedido.find({ vendedor: ctx.usuario.id })
          .populate("cliente")
          .populate("proveedor")
          .populate("vendedor");
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedidosVendedorPag: async (_, { estado, limit, offset }, ctx) => {
      const { usuario } = ctx; // Assuming `usuario` contains the logged-in user's information

      const query = {};

      // If the user is a vendedor, only fetch their orders
      if (usuario.role === "vendedor") {
        query.vendedor = usuario.id;
      }

      // Filter by estado if provided
      if (estado) {
        query.estado = estado;
      }

      // Fetch paginated orders
      const pedidos = await Pedido.find(query)
        .skip(offset || 0)
        .limit(limit || 10)
        .populate("cliente")
        .populate("proveedor")
        .populate("vendedor");

      return pedidos;
    },
    totalPedidosVendedor: async (_, { estado }, ctx) => {
      const { usuario } = ctx;

      const query = {};

      // If the user is a vendedor, only count their orders
      if (usuario.role === "vendedor") {
        query.vendedor = usuario.id;
      }

      // Filter by estado if provided
      if (estado) {
        query.estado = estado;
      }

      return await Pedido.countDocuments(query);
    },
    obtenerPedidosProveedor: async (_, { id }, ctx) => {
      try {
        const pedidos = await Pedido.find({
          $and: [{ vendedor: ctx.usuario.id }, { proveedor: id }],
        })
          .populate("vendedor")
          .populate("cliente");
        return pedidos;
      } catch (error) {
        console.log(error);
        throw new Error(
          "Hubo un problema al obtener los pedidos del proveedor."
        );
      }
    },
    obtenerPedido: async (_, { id }, ctx) => {
      // verificar si el peddo existe
      const pedido = await Pedido.findById(id)
        .populate("vendedor")
        .populate("proveedor")
        .populate("cliente");

      console.log("Pedido:", pedido);

      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }

      // solo quien lo creo puede verlo
      /*if(pedido.vendedor.toString() !== ctx.usuario.id){
                throw new Error('No tienes las credenciales');
            }*/

      // retornar resultado
      return {
        ...pedido._doc,
        id: pedido._id.toString(), // Convert ObjectId to string
      };
    },
    obtenerPedidosEstado: async (_, { estado }, ctx) => {
      const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado })
        .populate("cliente")
        .populate("vendedor");
      return pedidos;
    },
    buscarProducto: async (_, { texto }) => {
      const productos = await Producto.find({
        $text: { $search: texto },
      }).limit(10);
      return productos;
    },
    obtenerProveedores: async () => {
      try {
        const proveedores = await Proveedor.find({});
        return proveedores;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerProveedor: async (_, { id }, ctx) => {
      // Revisar si el cliente existe o no
      const proveedor = await Proveedor.findById(id);

      if (!proveedor) {
        throw new Error("Cliente no encontrado");
      }

      return proveedor;
    },
    obtenerProductosProveedor: async (_, { skuproveedor }) => {
      try {
        const productos = await Producto.find({ skuproveedor: skuproveedor });
        return productos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerCostoEnvio: async () => {
      try {
        return await CostoEnvio.find();
      } catch (error) {
        console.log("error:", error);
      }
    },
    obtenerPedidosEntregados: async (_, { vendedorId }, { Pedido }) => {
      try {
        const pedidos = await Pedido.find({
          estado: "Entregado",
          vendedor: vendedorId,
        }).populate("vendedor"); // Populate the vendedor field
        return pedidos;
      } catch (error) {
        console.error("Error fetching pedidos:", error);
        throw new Error("Error fetching pedidos");
      }
    },
  },
  Mutation: {
    nuevoUsuario: async (_, { input }) => {
      const { email, password } = input;
      // revisar si el usuario ya está registrado
      const existeUsuario = await Usuario.findOne({ email });
      if (existeUsuario) {
        throw new Error("El usuario ya está registrado");
      }

      // hashear su password
      const salt = await bcryptjs.genSalt(10);
      input.password = await bcryptjs.hash(password, salt);

      try {
        // guardarlo en la base de datos
        const usuario = new Usuario(input);
        await usuario.save(); // guardarlo
        return usuario;
      } catch (error) {
        console.log(error);
        if (error.name === "ValidationError") {
          throw new Error(error.message); // Send validation error to the client
        }
        throw error;
      }
    },
    actualizarUsuario: async (_, { id, input }, ctx) => {
      // Verify if the user is authenticated
      if (!ctx.usuario) {
        throw new Error("Usuario no autenticado");
      }

      // Check if the cliente exists
      let usuario = await Usuario.findById(id);
      if (!usuario) {
        console.log("id: ", id);
        throw new Error("Ese usuario no existe");
      }

      try {
        // Update the cliente
        usuario = await Usuario.findOneAndUpdate({ _id: id }, input, {
          new: true,
        });
        return usuario;
      } catch (error) {
        console.error("Error al actualizar el usuario:", error);
        throw new Error("No se pudo actualizar el usuario");
      }
    },
    autenticarUsuario: async (_, { input }) => {
      const { email, password } = input;
      // si el usuario existe
      const existeUsuario = await Usuario.findOne({ email });
      if (!existeUsuario) {
        throw new Error("El usuario no existe");
      }
      // revisar si el password es correcto
      const passwordCorrecto = await bcryptjs.compare(
        password,
        existeUsuario.password
      );
      if (!passwordCorrecto) {
        throw new Error("El password es Incorrecto");
      }

      // crear token
      const token = jwt.sign(
        { id: existeUsuario._id, role: existeUsuario.role }, // Include the user's role
        process.env.SECRETA,
        { expiresIn: "1h" }
      );

      // Return the user and token
      return {
        user: {
          id: existeUsuario._id,
          role: existeUsuario.role,
        },
        token,
      };
    },
    nuevoProducto: async (_, { input }) => {
      try {
        const producto = new Producto(input);
        await producto.save();
        return producto;
      } catch (error) {
        console.error("Error creating producto:", error);
        throw new Error("Error creating producto");
      }
    },
    actualizarProducto: async (_, { id, input }) => {
      try {
        const producto = await Producto.findByIdAndUpdate(id, input, {
          new: true,
        });
        if (!producto) {
          throw new Error("Producto no encontrado");
        }
        return producto;
      } catch (error) {
        console.error("Error updating producto:", error);
        throw new Error("Error updating producto");
      }
    },
    eliminarProducto: async (_, { id }) => {
      // revisar si el produto existe
      let producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }
      // eliminar
      await Producto.findOneAndDelete({ _id: id });

      return "Producto eliminado";
    },
    insertProducts: async (_, { productos }) => {
      const insertedProducts = await Producto.insertMany(productos);
      return insertedProducts;
    },
    upsertProducts: async (_, { productos }) => {
      const success = [];
      const errors = [];

      for (const producto of productos) {
        try {
          // Generate SKU in the backend
          producto.sku = `${producto.skuproveedor}${producto.skuproducto}`;

          // Check if the product already exists
          const existingProduct = await Producto.findOne({
            skuproducto: producto.skuproducto,
          });

          if (existingProduct) {
            // Update the existing product
            const updatedProduct = await Producto.findOneAndUpdate(
              { skuproducto: producto.skuproducto },
              { $set: producto },
              { new: true } // Return the updated document
            );
            success.push(updatedProduct);
            console.log("newProduct", updatedProduct);
          } else {
            // Insert a new product
            const newProduct = new Producto(producto);
            await newProduct.save();
            success.push(newProduct);
            console.log("newProduct", newProduct);
          }
          console.log("Producto: ", producto);
        } catch (error) {
          // Handle errors (e.g., validation errors)
          errors.push({
            skuproducto: producto.skuproducto,
            message: error.message,
          });
        }
      }

      return { success, errors };
    },
    nuevoCliente: async (_, { input }, ctx) => {
      const { email } = input;

      // Verify if the user is authenticated
      if (!ctx.usuario) {
        throw new Error("Usuario no autenticado");
      }

      // Check if the cliente already exists
      const clienteExistente = await Cliente.findOne({ email });
      if (clienteExistente) {
        throw new Error("Este cliente ya está registrado");
      }

      // Create a new cliente
      const nuevoCliente = new Cliente({
        ...input,
        vendedor: ctx.usuario.id, // Assign the authenticated user as the vendedor
      });

      try {
        // Save the cliente to the database
        const resultado = await nuevoCliente.save();
        return resultado;
      } catch (error) {
        console.error("Error al guardar el cliente:", error);
        throw new Error("No se pudo guardar el cliente");
      }
    },
    actualizarCliente: async (_, { id, input }, ctx) => {
      // Verificar si el usuario está autenticado
      if (!ctx.usuario) {
        throw new Error("Usuario no autenticado");
      }

      // Verificar si el cliente existe
      const cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Ese cliente no existe");
      }

      // Verificar si el usuario autenticado es el vendedor o un administrador
      const esVendedor = cliente.vendedor.toString() === ctx.usuario.id;
      const esAdministrador = ctx.usuario.role === "administrador";

      // Obtener los pedidos asociados al cliente desde el modelo Pedido
      const pedidos = await Pedido.find({ cliente: id });

      // Verificar si hay algún pedido que no esté en los estados permitidos
      const tienePedidosNoEditables = pedidos.some(
        (pedido) =>
          !["pendiente", "aprobado", "observado"].includes(pedido.estado)
      );

      // Si hay pedidos no editables, solo un administrador puede actualizar el cliente
      if (tienePedidosNoEditables && !esAdministrador) {
        throw new Error(
          "No tienes permisos para actualizar este cliente debido al estado de sus pedidos, por favor contacta a un administrador si necesitas hacer algún cambio."
        );
      }

      // Si no es ni el vendedor ni un administrador, no puede actualizar el cliente
      if (!esVendedor && !esAdministrador) {
        throw new Error(
          "No tienes las credenciales para actualizar este cliente"
        );
      }

      try {
        // Actualizar el cliente
        const clienteActualizado = await Cliente.findOneAndUpdate(
          { _id: id },
          input,
          { new: true }
        );
        return clienteActualizado;
      } catch (error) {
        console.error("Error al actualizar el cliente:", error);
        throw new Error("No se pudo actualizar el cliente");
      }
    },
    eliminarCliente: async (_, { id }, ctx) => {
      // verificar si existe o no
      let cliente = await Cliente.findById(id);

      if (!cliente) {
        throw new Error("Ese cliente no existe");
      }

      //verificar si el vendedor es quien edita
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }
      // if ("administrador" === ctx.usuario.role) {
      //   throw new Error("No tienes las credenciales");
      // }

      // ELIMINAR CLIENTE
      await Cliente.findOneAndDelete({ _id: id });
      return "Cliente eliminado";
    },
    nuevoPedido: async (_, { input }, ctx) => {
      const { cliente, pedido } = input;

      // Verify if the user is authenticated
      if (!ctx.usuario) {
        throw new Error("Usuario no autenticado");
      }

      // Check if the cliente exists
      const clienteExiste = await Cliente.findById(cliente);
      if (!clienteExiste) {
        throw new Error("Ese cliente no existe");
      }

      // Verify if the authenticated user is the vendedor
      if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      // Validate stock for each product in the pedido
      let purchaseTotal = 0; // Initialize the purchase total
      for await (const articulo of pedido) {
        const { id, cantidad } = articulo;
        const producto = await Producto.findById(id);

        if (!producto) {
          throw new Error(`Producto con ID ${id} no encontrado`);
        }

        if (cantidad > producto.existencia) {
          throw new Error(
            `El artículo ${producto.nombre} excede la cantidad disponible`
          );
        }

        // Reduce stock
        producto.existencia -= cantidad;
        await producto.save();

        // Add to the purchase total
        purchaseTotal += producto.precio * cantidad;
      }

      // Calculate the delivery cost
      const envio = await calculateDeliveryCost(purchaseTotal);

      // Calculate the total cost (purchase total + delivery cost)
      const total = purchaseTotal + envio;

      console.log("purchaseTotal: ", purchaseTotal);
      console.log("envio: ", envio);
      console.log("total: ", total);

      // Create a new pedido
      const nuevoPedido = new Pedido({
        ...input,
        cliente: clienteExiste._id,
        vendedor: ctx.usuario.id,
        subtotal: purchaseTotal,
        total, // Add the purchase total
        envio, // Add the delivery cost
      });

      try {
        // Save the pedido to the database
        const resultado = await nuevoPedido.save();

        // Populate the cliente, vendedor, and proveedor fields
        const pedidoPopulado = await Pedido.findById(resultado._id)
          .populate("cliente")
          .populate("vendedor")
          .populate("proveedor");

        // Convert ObjectId fields to strings
        pedidoPopulado.cliente.id = pedidoPopulado.cliente._id.toString();
        pedidoPopulado.vendedor.id = pedidoPopulado.vendedor._id.toString();
        pedidoPopulado.proveedor.id = pedidoPopulado.proveedor._id.toString();

        console.log("Cliente:", pedidoPopulado.cliente.id);
        console.log("Vendedor:", pedidoPopulado.vendedor.id);
        console.log("Proveedor:", pedidoPopulado.proveedor.id);

        return pedidoPopulado;
      } catch (error) {
        console.error("Error al guardar el pedido:", error);
        throw new Error("No se pudo guardar el pedido");
      }
    },
    actualizarPedido: async (_, { id, input }, ctx) => {
      const {
        estado,
        pedido: productosInput,
        notas,
        envio: envioInput,
      } = input;

      console.log("Received input from frontend:", input); // Log the input

      try {
        // Verify if the user is authenticated
        if (!ctx.usuario) {
          throw new Error("Usuario no autenticado");
        }

        // Find the pedido by ID
        const pedido = await Pedido.findById(id)
          .populate("cliente")
          .populate("vendedor")
          .populate("proveedor");

        if (!pedido) {
          throw new Error("Pedido no encontrado");
        }

        // Verify if the authenticated user is the admin
        if (ctx.usuario.role === "vendedor") {
          console.log("ctx.usuario.role: ", ctx.usuario.role);
          throw new Error("No tienes las credenciales");
        }

        // Update estado if provided
        if (estado) {
          pedido.estado = estado;
        }

        // Update productos if provided
        if (productosInput && productosInput.length > 0) {
          for (const {
            id: productoId,
            cantidad: nuevaCantidad,
          } of productosInput) {
            if (!productoId || nuevaCantidad === undefined) {
              console.warn(`Producto con ID ${productoId} o cantidad inválida`);
              continue;
            }

            const producto = await Producto.findById(productoId);
            if (!producto) {
              console.warn(`Producto con ID ${productoId} no encontrado`);
              continue;
            }

            // Find the product in the pedido array
            const productoEnPedido = pedido.pedido.find(
              (p) => p.id.toString() === productoId
            );
            if (!productoEnPedido) {
              console.warn(
                `Producto con ID ${productoId} no está en el pedido`
              );
              continue;
            }

            // Update cantidad in the pedido array
            productoEnPedido.cantidad = nuevaCantidad;
          }

          // Mark the pedido.pedido array as modified
          pedido.markModified("pedido");
        }

        // Replace notas if provided
        if (notas && notas.length > 0) {
          pedido.notas = notas; // Replace the existing notas with the new ones
          pedido.markModified("notas");
        }

        // Use the envio value from the input
        pedido.envio = envioInput;

        // Recalculate subtotal based on the updated pedido array
        let subtotal = 0;
        for (const producto of pedido.pedido) {
          const productoDetalle = await Producto.findById(producto.id);
          subtotal += (productoDetalle?.precio || 0) * producto.cantidad;
        }

        // Recalculate total
        const total = subtotal + pedido.envio;

        // Update subtotal and total
        pedido.subtotal = subtotal;
        pedido.total = total;

        console.log("Updated Pedido:", pedido); // Log the updated pedido

        // Save the updated pedido
        await pedido.save();

        // Convert ObjectId fields to strings
        pedido.cliente.id = pedido.cliente._id.toString();
        pedido.vendedor.id = pedido.vendedor._id.toString();
        pedido.proveedor.id = pedido.proveedor._id.toString();

        return pedido;
      } catch (error) {
        console.error("Error al actualizar el pedido:", error);
        throw new Error(`Error actualizando el pedido: ${error.message}`);
      }
    },
    eliminarPedido: async (_, { id }, ctx) => {
      // Verify if the user is authenticated
      if (!ctx.usuario) {
        throw new Error("Usuario no autenticado");
      }

      // Check if the pedido exists
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("El pedido no existe");
      }

      // Verify if the authenticated user is the vendedor
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      try {
        // Delete the pedido
        await Pedido.findOneAndDelete({ _id: id });
        return "Pedido eliminado";
      } catch (error) {
        console.error("Error al eliminar el pedido:", error);
        throw new Error("No se pudo eliminar el pedido");
      }
    },
    nuevoProveedor: async (_, { input }, ctx) => {
      console.log("Contexto recibido:", ctx);
      const { email } = input;
      // Verificar si el proveedor ya está registrado
      console.log(input);
      const proveedor = await Proveedor.findOne({ email });
      if (proveedor) {
        throw new Error("Este proveedor ya está registrado");
      }

      const nuevoProveedor = new Proveedor(input);

      // guardarlo en la base de datos
      try {
        const resultado = await nuevoProveedor.save();
        return resultado;
      } catch (error) {
        console.error("Error al guardar el proveedor:", error);
        throw new Error("No se pudo guardar el proveedor");
      }
    },
    actualizarProveedor: async (_, { id, input }, ctx) => {
      // verificar si existe o no
      let proveedor = await Proveedor.findById(id);

      if (!proveedor) {
        throw new Error("Ese proveedor no existe");
      }

      //verificar si el vendedor es quien edita
      if ("vendedor" === ctx.usuario.role) {
        throw new Error("No tienes las credenciales");
      }

      // guardar proveedor
      proveedor = await Proveedor.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return proveedor;
    },
    cambiarEstadoProveedor: async (_, { id }, ctx) => {
      // Verificar si el proveedor existe
      let proveedor = await Proveedor.findById(id);

      if (!proveedor) {
        throw new Error("Ese proveedor no existe");
      }

      // Verificar permisos (si es necesario)
      if (ctx.usuario.role === "vendedor") {
        throw new Error("No tienes las credenciales");
      }

      // Cambiar el estado
      proveedor.estado = !proveedor.estado;
      await proveedor.save();

      return proveedor;
    },
    eliminarProveedor: async (_, { id }, ctx) => {
      // verificar si existe o no
      let proveedor = await Proveedor.findById(id);

      if (!proveedor) {
        throw new Error("Ese proveedor no existe");
      }

      //verificar si el vendedor es quien edita
      if ("vendedor" === ctx.usuario.role) {
        throw new Error("No tienes las credenciales");
      }
      // ELIMINAR proveedor
      await Proveedor.findOneAndDelete({ _id: id });
      return "Proveedor eliminado";
    },
    nuevoCostoEnvio: async (_, { range }) => {
      const newRange = new CostoEnvio(range);
      return await newRange.save();
    },
    actualizarCostoEnvio: async (_, { id, range }) => {
      return await CostoEnvio.findByIdAndUpdate(id, range, { new: true });
    },
    eliminarCostoEnvio: async (_, { id }) => {
      await CostoEnvio.findByIdAndDelete(id);
      return true;
    },
    marcarComisionPagada: async (_, { id }, ctx) => {
      if (!ctx.usuario) {
        throw new Error("Usuario no autenticado");
      }

      try {
        const pedidoActualizado = await Pedido.findByIdAndUpdate(
          id,
          { comisionPagada: true },
          { new: true } // Devolver el documento actualizado
        );

        if (!pedidoActualizado) {
          throw new Error("No se encontró el pedido o no se pudo actualizar.");
        }

        return pedidoActualizado;
      } catch (error) {
        console.error("Error en marcarComisionPagada:", error);
        throw new Error("Error al marcar la comisión como pagada.");
      }
    },
    agregarComisionHistory: async (_, { vendedorId, input }, { db }) => {
      const { pedidoId, monto, pagadoPor } = input;

      try {
        const usuarioActualizado = await Usuario.findByIdAndUpdate(
          vendedorId,
          {
            $push: {
              comisionHistory: {
                pedidoId,
                fecha: new Date().toISOString(),
                monto,
                pagadoPor,
              },
            },
          },
          { new: true } // Devolver el documento actualizado
        );

        if (!usuarioActualizado) {
          throw new Error("No se encontró el usuario o no se pudo actualizar.");
        }

        return usuarioActualizado;
      } catch (error) {
        console.error("Error en agregarComisionHistory:", error);
        throw new Error("Error al agregar el historial de comisión.");
      }
    },
  },
};

module.exports = resolvers;
