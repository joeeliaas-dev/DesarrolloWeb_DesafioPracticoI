/* =========================================================
   ui/carritoUI.js — Carrito y confirmación de reserva
   - Lee el carrito de localStorage.
   - Lo sincroniza con Firestore (precio y stock reales).
   - Calcula subtotal, descuento "Arma tu skate" y total.
   - Valida el formulario y crea el pedido (descuenta stock).
   ========================================================= */

import { obtenerProducto, crearPedido } from "../services/dbService.js";
import {
  obtenerCarrito,
  guardarCarrito,
  cambiarCantidad,
  quitarDelCarrito,
  vaciarCarrito,
  calcularSubtotal,
  calcularDescuento,
  calcularTotal,
  esSetupCompleto,
} from "../services/carritoService.js";
import { formatearPrecio } from "../models/Producto.js";
import { CATEGORIAS, CATEGORIAS_SETUP, DESCUENTO_SETUP, MAX_POR_PRODUCTO } from "../constantes.js";
import { iniciarNav } from "./navUI.js";
import { escaparHTML, mostrarAviso, mostrarCargando, mostrarVacio } from "./utilidades.js";

// ---------- DOM ----------
const lista = document.querySelector("#carrito-lista");
const panelResumen = document.querySelector("#carrito-resumen");
const formulario = document.querySelector("#form-reserva");
const avisoSesion = document.querySelector("#aviso-sesion");
const botonReservar = document.querySelector("#btn-reservar");

// ---------- Estado ----------
let usuarioActual = null;
let perfilActual = null;
let stockReal = {}; // { idProducto: unidadesDisponibles }

// ---------- Inicio ----------
iniciarNav((usuario, perfil) => {
  usuarioActual = usuario;
  perfilActual = perfil;
  actualizarFormularioSegunSesion();
});
configurarCampoFecha();
escucharEventos();
sincronizarConFirestore();

/* ========== SINCRONIZAR CON FIRESTORE ========== */
// El carrito guardado puede tener precios o stock viejos.
// Pedimos todos los productos EN PARALELO con Promise.all.
async function sincronizarConFirestore() {
  const carrito = obtenerCarrito();
  if (carrito.length === 0) {
    renderizarCarrito();
    return;
  }

  mostrarCargando(lista, "Revisando disponibilidad...");
  try {
    const productos = await Promise.all(carrito.map((item) => obtenerProducto(item.id)));

    const actualizado = [];
    carrito.forEach((item, i) => {
      const producto = productos[i];
      if (!producto) {
        mostrarAviso(`"${item.nombre}" ya no está disponible y se quitó del carrito.`, "error");
        return;
      }
      stockReal[item.id] = producto.stock;
      const cantidad = Math.min(item.cantidad, producto.stock);
      if (cantidad === 0) {
        mostrarAviso(`"${item.nombre}" se agotó y se quitó del carrito.`, "error");
        return;
      }
      if (cantidad < item.cantidad) {
        mostrarAviso(`Ajustamos "${item.nombre}" a ${cantidad} (stock disponible).`, "info");
      }
      actualizado.push({ ...item, precio: producto.precio, nombre: producto.nombre, cantidad });
    });

    guardarCarrito(actualizado);
  } catch (error) {
    console.error(error);
    mostrarAviso("No pudimos verificar el stock. Se validará al reservar.", "error");
  } finally {
    renderizarCarrito();
  }
}

/* ========== DIBUJAR ========== */
function renderizarCarrito() {
  const carrito = obtenerCarrito();

  if (carrito.length === 0) {
    mostrarVacio(lista, "Tu carrito está vacío", "Explora el catálogo y arma tu setup.", {
      href: "productos.html",
      texto: "Ver productos",
    });
    panelResumen.hidden = true;
    return;
  }

  panelResumen.hidden = false;
  lista.innerHTML = carrito.map(crearFila).join("");
  renderizarTotales(carrito);
}

function crearFila(item) {
  const maximo = Math.min(stockReal[item.id] ?? MAX_POR_PRODUCTO, MAX_POR_PRODUCTO);
  return `
    <article class="item-carrito">
      <img src="${escaparHTML(item.imagen)}" alt="" class="item-carrito__img">
      <div class="item-carrito__info">
        <span class="producto__marca">${escaparHTML(item.marca)}</span>
        <h3>${escaparHTML(item.nombre)}</h3>
        <span class="item-carrito__precio">${formatearPrecio(item.precio)} c/u</span>
      </div>
      <div class="cantidad" aria-label="Cantidad">
        <button type="button" data-restar="${item.id}" aria-label="Quitar uno">−</button>
        <span>${item.cantidad}</span>
        <button type="button" data-sumar="${item.id}" aria-label="Agregar uno" ${item.cantidad >= maximo ? "disabled" : ""}>+</button>
      </div>
      <strong class="item-carrito__total">${formatearPrecio(item.precio * item.cantidad)}</strong>
      <button type="button" class="item-carrito__quitar" data-quitar="${item.id}" aria-label="Quitar ${escaparHTML(item.nombre)}">✕</button>
    </article>`;
}

function renderizarTotales(carrito) {
  const descuento = calcularDescuento(carrito);

  document.querySelector("#subtotal").textContent = formatearPrecio(calcularSubtotal(carrito));
  document.querySelector("#total").textContent = formatearPrecio(calcularTotal(carrito));
  document.querySelector("#fila-descuento").hidden = descuento === 0;
  document.querySelector("#descuento").textContent = `− ${formatearPrecio(descuento)}`;

  // Pista: ¿qué le falta para el descuento?
  const pista = document.querySelector("#pista-setup");
  const porcentaje = `${DESCUENTO_SETUP * 100}%`;
  if (esSetupCompleto(carrito)) {
    pista.textContent = `¡Setup completo! Tienes ${porcentaje} de descuento en tabla, trucks y ruedas.`;
    pista.className = "pista pista--ok";
  } else {
    const faltan = CATEGORIAS_SETUP
      .filter((cat) => !carrito.some((item) => item.categoria === cat))
      .map((cat) => CATEGORIAS[cat]);
    pista.textContent = `Arma tu skate: agrega ${faltan.join(" + ")} y obtén ${porcentaje} de descuento.`;
    pista.className = "pista";
  }
}

/* ========== FORMULARIO ========== */
function actualizarFormularioSegunSesion() {
  const conSesion = Boolean(usuarioActual);
  avisoSesion.hidden = conSesion;
  formulario.hidden = !conSesion;
  if (conSesion && !formulario.nombre.value) {
    formulario.nombre.value = perfilActual?.nombre ?? usuarioActual.displayName ?? "";
  }
}

// La fecha de recogida: desde mañana hasta 14 días después
function configurarCampoFecha() {
  const { minimo, maximo } = rangoFechas();
  formulario.fecha.min = minimo;
  formulario.fecha.max = maximo;
}

function rangoFechas() {
  const unDia = 24 * 60 * 60 * 1000;
  // Fecha local → "2026-11-13" (formato del <input type="date">)
  const aTexto = (fecha) =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  return {
    minimo: aTexto(new Date(Date.now() + unDia)),
    maximo: aTexto(new Date(Date.now() + 14 * unDia)),
  };
}

// Devuelve un objeto con los errores encontrados (vacío = todo bien)
function validarFormularioReserva(datos) {
  const errores = {};
  const { minimo, maximo } = rangoFechas();

  if (datos.nombre.length < 3) {
    errores.nombre = "Escribe tu nombre (mínimo 3 letras).";
  }
  // Teléfonos de El Salvador: 8 dígitos que empiezan con 2, 6 o 7
  if (!/^[267]\d{3}-?\d{4}$/.test(datos.telefono)) {
    errores.telefono = "Teléfono inválido. Ej.: 7777-8888";
  }
  if (!datos.fecha) {
    errores.fecha = "Elige el día en que pasarás a recoger.";
  } else if (datos.fecha < minimo || datos.fecha > maximo) {
    errores.fecha = "La fecha debe estar entre mañana y los próximos 14 días.";
  }
  if (datos.notas.length > 200) {
    errores.notas = "Las notas no pueden pasar de 200 caracteres.";
  }
  return errores;
}

function mostrarErrores(errores) {
  formulario.querySelectorAll("[data-error]").forEach((span) => {
    const campo = span.dataset.error;
    span.textContent = errores[campo] ?? "";
    formulario[campo].setAttribute("aria-invalid", Boolean(errores[campo]));
  });
}

async function confirmarReserva(evento) {
  evento.preventDefault();

  const datos = {
    nombre: formulario.nombre.value.trim(),
    telefono: formulario.telefono.value.trim(),
    fecha: formulario.fecha.value,
    notas: formulario.notas.value.trim(),
  };

  const errores = validarFormularioReserva(datos);
  mostrarErrores(errores);
  if (Object.keys(errores).length > 0) return;

  const carrito = obtenerCarrito();
  const pedido = {
    uid: usuarioActual.uid,
    clienteEmail: usuarioActual.email,
    clienteNombre: datos.nombre,
    telefono: datos.telefono,
    fechaRecogida: datos.fecha,
    notas: datos.notas,
    items: carrito.map(({ id, nombre, categoria, precio, cantidad }) => ({ id, nombre, categoria, precio, cantidad })),
    subtotal: calcularSubtotal(carrito),
    descuento: calcularDescuento(carrito),
    total: calcularTotal(carrito),
  };

  botonReservar.disabled = true;
  botonReservar.textContent = "Reservando...";
  try {
    const idPedido = await crearPedido(pedido);
    vaciarCarrito();
    mostrarConfirmacion(idPedido, pedido);
  } catch (error) {
    console.error(error);
    mostrarAviso(error.message, "error");
    sincronizarConFirestore(); // refresca stock por si cambió
  } finally {
    botonReservar.disabled = false;
    botonReservar.textContent = "Confirmar reserva";
  }
}

function mostrarConfirmacion(idPedido, pedido) {
  panelResumen.hidden = true;
  lista.innerHTML = `
    <div class="estado-vacio estado-vacio--exito">
      <span class="sello">✓</span>
      <h3>¡Reserva confirmada!</h3>
      <p>Código <strong>#${idPedido.slice(0, 6).toUpperCase()}</strong> · Total ${formatearPrecio(pedido.total)}</p>
      <p>Te esperamos el <strong>${pedido.fechaRecogida}</strong> en Edificio CM, 3er nivel, local #6.</p>
      <a href="mis-reservas.html" class="btn btn--primario btn--chico">Ver mis reservas</a>
    </div>`;
}

/* ========== EVENTOS ========== */
function escucharEventos() {
  // Delegación: un listener para todos los botones de las filas
  lista.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button");
    if (!boton) return;
    const carrito = obtenerCarrito();

    if (boton.dataset.sumar) {
      const item = carrito.find((i) => i.id === boton.dataset.sumar);
      cambiarCantidad(item.id, item.cantidad + 1);
    } else if (boton.dataset.restar) {
      const item = carrito.find((i) => i.id === boton.dataset.restar);
      cambiarCantidad(item.id, item.cantidad - 1);
    } else if (boton.dataset.quitar) {
      quitarDelCarrito(boton.dataset.quitar);
    }
    renderizarCarrito();
  });

  document.querySelector("#btn-vaciar").addEventListener("click", () => {
    if (confirm("¿Vaciar todo el carrito?")) {
      vaciarCarrito();
      renderizarCarrito();
    }
  });

  // Al escribir, se borra el error de ese campo
  formulario.addEventListener("input", (evento) => {
    const span = formulario.querySelector(`[data-error="${evento.target.name}"]`);
    if (span) span.textContent = "";
    evento.target.removeAttribute("aria-invalid");
  });

  formulario.addEventListener("submit", confirmarReserva);
}
