const { gql } = require("apollo-server");
// Schema
const typeDefs = gql`
  type Usuario {
    id: ID!
    rut: String
    nombre: String
    ndocumento: String
    email: String
    telefono: String
    creado: String
    password: String
    direccioncalle: String
    direccionnumero: String
    direcciondepto: String
    direccioncomuna: String
    direccionregion: String
    direccionprovincia: String
    cuentabanconumero: String
    cuentabanconombre: String
    cuentabancotipocuenta: String
    carnetfrente: String
    carnetreverso: String
    role: String # "vendedor" o "administrador"
    comisionHistory: [ComisionHistory!]
  }
  type Token {
    token: String
  }
  type ComisionHistory {
    pedidoId: ID!
    fecha: String!
    monto: Float!
    pagadoPor: String!
  }
  type Producto {
    id: ID!
    nombre: String
    existencia: Int
    precio: Float
    costo: Float
    skuproveedor: String
    skuproducto: String
    sku: String
    descripcion: String
    creado: String
  }
  type Cliente {
    id: ID!
    nombre: String
    email: String
    telefono: String
    vendedor: Usuario
    rut: String
    direccioncalle: String
    direccionnumero: String
    direcciondepto: String
    direccioncomuna: String
    direccionregion: String
    direccionprovincia: String
  }
  type Pedido {
    id: ID!
    pedido: [PedidoGrupo]
    total: Float
    subtotal: Float
    envio: Float
    cliente: Cliente
    vendedor: Usuario
    proveedor: Proveedor
    creado: String
    estado: EstadoPedido
    numeropedido: String
    notas: [String]
    comisionPagada: Boolean!
  }
  type PedidoGrupo {
    id: ID
    cantidad: Int
  }
  type Proveedor {
    id: ID!
    nombre: String
    email: String
    telefono: String
    vendedor: ID
    rut: String
    direccioncalle: String
    direccionnumero: String
    direcciondepto: String
    direccioncomuna: String
    direccionregion: String
    comision: Float
    codigo: String
    estado: Boolean
  }
  type CostoEnvio {
    id: ID!
    minTotal: Float!
    maxTotal: Float!
    costo: Float!
  }
  type AutenticarResponse {
    token: String!
    usuario: Usuario!
  }

  type UpsertProductsResponse {
    success: [Producto!]!
    errors: [ProductoError!]!
  }

  type ProductoError {
    skuproducto: String!
    message: String!
  }

  input UsuarioInput {
    rut: String
    nombre: String!
    ndocumento: String
    email: String!
    telefono: String
    creado: String
    password: String!
    direccioncalle: String
    direccionnumero: String
    direcciondepto: String
    direccioncomuna: String
    direccionregion: String
    direccionprovincia: String
    cuentabanconumero: String
    cuentabanconombre: String
    cuentabancotipocuenta: String
    carnetfrente: String
    carnetreverso: String
    role: String # "vendedor" o "administrador"
  }
  input AutenticarInput {
    email: String!
    password: String!
  }
  input MarkComisionPagadaInput {
    pedidoId: ID!
    monto: Float!
    pagadoPor: String!
  }
  input ComisionHistoryInput {
    pedidoId: ID!
    monto: Float!
    pagadoPor: String!
  }
  input ProductoInput {
    nombre: String!
    existencia: Int!
    precio: Float!
    costo: Float!
    skuproveedor: String!
    skuproducto: String!
    sku: String
    descripcion: String
  }
  input ClienteInput {
    nombre: String!
    email: String!
    telefono: String
    rut: String
    direccioncalle: String
    direccionnumero: String
    direcciondepto: String
    direccioncomuna: String
    direccionregion: String
    direccionprovincia: String
  }
  input PedidoProductoInput {
    id: ID
    cantidad: Int
  }
  input PedidoInput {
    pedido: [PedidoProductoInput]
    subtotal: Float
    total: Float
    envio: Float
    cliente: ID
    proveedor: ID
    numeropedido: String
    estado: EstadoPedido
    notas: [String]
  }
  input ProveedorInput {
    nombre: String!
    email: String!
    telefono: String
    direccioncalle: String
    rut: String
    comision: Float
    codigo: String
  }
  input CostoEnvioInput {
    minTotal: Float!
    maxTotal: Float!
    costo: Float!
  }
  enum EstadoPedido {
    Pendiente
    Aprobado
    Observado
    Entregado
  }

  type Query {
    # Usuarios
    obtenerUsuario: Usuario
    obtenerUsuariosPorRol(role: String!, limit: Int!, offset: Int!): [Usuario]
    totalVendedores(role: String): Int
    obtenerVendedor(id: ID!): Usuario

    # Productos
    obtenerProductos: [Producto]
    obtenerProducto(id: ID!): Producto
    obtenerProductosProveedor(skuproveedor: String!): [Producto]

    # Clientes
    obtenerClientes(limit: Int!, offset: Int!): [Cliente]
    obtenerClientesVendedorTodos(limit: Int!, offset: Int!): [Cliente]
    obtenerClientesVendedor(limit: Int!, offset: Int!): [Cliente]
    totalClientesVendedor: Int
    totalClientesVendedorTodos: Int
    obtenerCliente(id: ID!): Cliente
    obtenerClienteAdmin(id: ID!): Cliente

    # Pedidos
    obtenerPedidos: [Pedido]
    obtenerPedidosVendedor: [Pedido]
    obtenerPedido(id: ID!): Pedido
    obtenerPedidosEstado(estado: String!): [Pedido]
    obtenerPedidosProveedor(codigo: String!): [Pedido]
    obtenerPedidosVendedorPag(
      estado: String
      limit: Int!
      offset: Int!
    ): [Pedido]
    totalPedidosVendedor(estado: String): Int
    obtenerPedidosEntregados(vendedorId: ID!): [Pedido]

    # Busquedas avanzadas
    buscarProducto(texto: String!): [Producto]

    # Proveedor
    obtenerProveedores: [Proveedor]
    obtenerProveedor(id: ID!): Proveedor

    # Envío
    obtenerCostoEnvio: [CostoEnvio]
  }

  type Mutation {
    # Usuarios
    nuevoUsuario(input: UsuarioInput): Usuario
    actualizarUsuario(id: ID!, input: UsuarioInput): Usuario
    autenticarUsuario(input: AutenticarInput): Token

    # Productos
    nuevoProducto(input: ProductoInput): Producto
    actualizarProducto(id: ID!, input: ProductoInput): Producto
    eliminarProducto(id: ID!): String
    insertProducts(productos: [ProductoInput!]!): [Producto!]!
    upsertProducts(productos: [ProductoInput!]!): UpsertProductsResponse!

    # Clientes
    nuevoCliente(input: ClienteInput): Cliente
    actualizarCliente(id: ID!, input: ClienteInput): Cliente
    eliminarCliente(id: ID!): String

    # Pedidos
    nuevoPedido(input: PedidoInput): Pedido
    actualizarPedido(id: ID!, input: PedidoInput): Pedido
    eliminarPedido(id: ID!): String

    # Proveedor
    nuevoProveedor(input: ProveedorInput): Proveedor
    actualizarProveedor(id: ID!, input: ProveedorInput): Proveedor
    eliminarProveedor(id: ID!): String
    cambiarEstadoProveedor(id: ID!): Proveedor

    # Costo envio
    nuevoCostoEnvio(range: CostoEnvioInput!): CostoEnvio
    actualizarCostoEnvio(id: ID!, range: CostoEnvioInput): CostoEnvio
    eliminarCostoEnvio(id: ID!): Boolean

    # Comisiones
    marcarComisionPagada(id: ID!): Pedido
    agregarComisionHistory(
      vendedorId: ID!
      input: ComisionHistoryInput!
    ): Usuario
  }
`;

module.exports = typeDefs;
