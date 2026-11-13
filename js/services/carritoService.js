/* =========================================================
   services/carritoService.js — Carrito en localStorage
   El carrito vive en el navegador (no en Firestore) hasta
   que el cliente confirma la reserva.
   localStorage solo guarda texto → usamos JSON.stringify
   para guardar y JSON.parse para leer.
   ========================================================= */

import { LLAVE_CARRITO, CATEGORIAS_SETUP, DESCUENTO_SETUP, MAX_POR_PRODUCTO } from "../constantes.js";

// Leer: texto JSON → arreglo de objetos
export function obtenerCarrito() {
  try {
    return JSON.parse(localStorage.getItem(LLAVE_CARRITO)) ?? [];
  } catch {
    return []; // si el texto está dañado, empezamos vacío
  }
}

// Guardar: arreglo → texto JSON. Avisa a la página para actualizar el contador.
export function guardarCarrito(carrito) {
  localStorage.setItem(LLAVE_CARRITO, JSON.stringify(carrito));
  window.dispatchEvent(new CustomEvent("carrito:cambio"));
}

export function vaciarCarrito() {
  guardarCarrito([]);
}

// Agrega un producto validando que no supere el stock disponible.
// Devuelve { ok, mensaje } para que la interfaz sepa qué mostrar.
export function agregarAlCarrito(producto) {
  const carrito = obtenerCarrito();
  const existente = carrito.find((item) => item.id === producto.id);
  const cantidadNueva = (existente?.cantidad ?? 0) + 1;

  if (!producto.hayStock(cantidadNueva)) {
    return { ok: false, mensaje: `Solo hay ${producto.stock} unidades de ${producto.nombre}.` };
  }
  if (cantidadNueva > MAX_POR_PRODUCTO) {
    return { ok: false, mensaje: `Máximo ${MAX_POR_PRODUCTO} unidades por producto.` };
  }

  if (existente) {
    existente.cantidad = cantidadNueva;
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      marca: producto.marca,
      categoria: producto.categoria,
      precio: producto.precio,
      imagen: producto.imagen,
      cantidad: 1,
    });
  }

  guardarCarrito(carrito);
  return { ok: true, mensaje: `${producto.nombre} agregado al carrito.` };
}

export function cambiarCantidad(id, cantidad) {
  const carrito = obtenerCarrito()
    .map((item) => (item.id === id ? { ...item, cantidad } : item))
    .filter((item) => item.cantidad > 0);
  guardarCarrito(carrito);
}

export function quitarDelCarrito(id) {
  guardarCarrito(obtenerCarrito().filter((item) => item.id !== id));
}

/* ---------------- CÁLCULOS (reduce / some / every) ---------------- */

// Total de piezas (para el contador del menú)
export function contarArticulos(carrito) {
  return carrito.reduce((suma, item) => suma + item.cantidad, 0);
}

export function calcularSubtotal(carrito) {
  return carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
}

// REGLA DE NEGOCIO "Arma tu skate":
// si hay al menos una tabla, unos trucks y unas ruedas,
// se descuenta un % sobre esas piezas.
export function esSetupCompleto(carrito) {
  return CATEGORIAS_SETUP.every((categoria) =>
    carrito.some((item) => item.categoria === categoria)
  );
}

export function calcularDescuento(carrito) {
  if (!esSetupCompleto(carrito)) return 0;

  const totalPiezasSetup = carrito
    .filter((item) => CATEGORIAS_SETUP.includes(item.categoria))
    .reduce((suma, item) => suma + item.precio * item.cantidad, 0);

  return Math.round(totalPiezasSetup * DESCUENTO_SETUP * 100) / 100;
}

export function calcularTotal(carrito) {
  return calcularSubtotal(carrito) - calcularDescuento(carrito);
}
