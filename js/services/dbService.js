/* =========================================================
   services/dbService.js — Cloud Firestore
   CRUD de "productos" y manejo de "pedidos" (reservas).
   Todas las funciones son async: devuelven Promesas.
   ========================================================= */

import { db } from "../firebase-config.js";
import { Producto } from "../models/Producto.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const productosRef = collection(db, "productos");
const pedidosRef = collection(db, "pedidos");
const mensajesRef = collection(db, "mensajes");

/* ---------------- PRODUCTOS (CRUD) ---------------- */

// READ — todos los productos convertidos a objetos Producto
export async function obtenerProductos() {
  const resultado = await getDocs(productosRef);
  return resultado.docs.map((documento) => Producto.desdeFirestore(documento));
}

// READ — un producto por id
export async function obtenerProducto(id) {
  const documento = await getDoc(doc(db, "productos", id));
  return documento.exists() ? Producto.desdeFirestore(documento) : null;
}

// CREATE — Firestore genera el id automáticamente
export async function crearProducto(producto) {
  const referencia = await addDoc(productosRef, producto.aFirestore());
  return referencia.id;
}

// UPDATE
export function actualizarProducto(id, producto) {
  return updateDoc(doc(db, "productos", id), producto.aFirestore());
}

// DELETE
export function eliminarProducto(id) {
  return deleteDoc(doc(db, "productos", id));
}

// Carga varios productos de una sola vez (para el catálogo inicial)
export async function cargarProductosIniciales(lista) {
  const lote = writeBatch(db);
  lista.forEach((datos) => {
    const { id, ...resto } = datos;
    lote.set(doc(db, "productos", id), resto);
  });
  await lote.commit();
}

/* ---------------- PEDIDOS (RESERVAS) ---------------- */

// Crea la reserva Y descuenta el stock en una TRANSACCIÓN:
// o se hace todo, o no se hace nada. Así dos clientes no
// pueden apartar la última unidad al mismo tiempo.
export async function crearPedido(datosPedido) {
  return runTransaction(db, async (transaccion) => {
    // 1) Leer el stock actual de cada producto del pedido
    const lecturas = [];
    for (const item of datosPedido.items) {
      const referencia = doc(db, "productos", item.id);
      const documento = await transaccion.get(referencia);
      if (!documento.exists()) {
        throw new Error(`"${item.nombre}" ya no existe en el catálogo.`);
      }
      lecturas.push({ referencia, stockActual: documento.data().stock, item });
    }

    // 2) Validar que alcance el stock de todos
    lecturas.forEach(({ stockActual, item }) => {
      if (stockActual < item.cantidad) {
        throw new Error(`Solo quedan ${stockActual} unidades de "${item.nombre}".`);
      }
    });

    // 3) Restar el stock y crear el pedido
    lecturas.forEach(({ referencia, stockActual, item }) => {
      transaccion.update(referencia, { stock: stockActual - item.cantidad });
    });

    const nuevoPedido = doc(pedidosRef);
    transaccion.set(nuevoPedido, {
      ...datosPedido,
      estado: "pendiente",
      creado: serverTimestamp(),
    });
    return nuevoPedido.id;
  });
}

// Pedidos de UN cliente (las reglas no dejan leer los de otros)
export async function obtenerPedidosDeUsuario(uid) {
  const consulta = query(pedidosRef, where("uid", "==", uid));
  const resultado = await getDocs(consulta);
  return ordenarPorFecha(resultado.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// Todos los pedidos (solo el admin tiene permiso)
export async function obtenerTodosLosPedidos() {
  const resultado = await getDocs(pedidosRef);
  return ordenarPorFecha(resultado.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// Cambia el estado. Si se CANCELA, devuelve las unidades al stock.
export async function cambiarEstadoPedido(pedido, nuevoEstado) {
  const pedidoRef = doc(db, "pedidos", pedido.id);

  if (nuevoEstado !== "cancelado") {
    return updateDoc(pedidoRef, { estado: nuevoEstado });
  }

  return runTransaction(db, async (transaccion) => {
    const lecturas = [];
    for (const item of pedido.items) {
      const referencia = doc(db, "productos", item.id);
      const documento = await transaccion.get(referencia);
      if (documento.exists()) lecturas.push({ referencia, stock: documento.data().stock, item });
    }
    lecturas.forEach(({ referencia, stock, item }) => {
      transaccion.update(referencia, { stock: stock + item.cantidad });
    });
    transaccion.update(pedidoRef, { estado: "cancelado" });
  });
}

// Más recientes primero (.sort sobre el arreglo en memoria)
function ordenarPorFecha(pedidos) {
  return pedidos.sort((a, b) => (b.creado?.seconds ?? 0) - (a.creado?.seconds ?? 0));
}

/* ---------------- MENSAJES (CONTACTO) ---------------- */

// Cualquier visitante puede enviar un mensaje desde contacto.html
export function enviarMensaje({ nombre, email, asunto, mensaje }) {
  return addDoc(mensajesRef, { nombre, email, asunto, mensaje, creado: serverTimestamp() });
}

// Solo el admin puede leerlos (las reglas lo exigen)
export async function obtenerMensajes() {
  const resultado = await getDocs(mensajesRef);
  return ordenarPorFecha(resultado.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export function eliminarMensaje(id) {
  return deleteDoc(doc(db, "mensajes", id));
}
