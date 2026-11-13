/* =========================================================
   ui/adminUI.js — Panel de administración (admin.html)
   - Solo entra quien tiene rol "admin" en /usuarios.
   - Métricas del inventario y de las reservas (reduce/filter).
   - CRUD de productos con formulario validado.
   - Cambio de estado de las reservas.
   ========================================================= */

import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  cargarProductosIniciales,
  obtenerTodosLosPedidos,
  cambiarEstadoPedido,
  obtenerMensajes,
  eliminarMensaje,
} from "../services/dbService.js";
import { Producto, formatearPrecio } from "../models/Producto.js";
import { CATEGORIAS, ESTADOS_PEDIDO, STOCK_CRITICO } from "../constantes.js";
import { PRODUCTOS_INICIALES } from "../data/productosIniciales.js";
import { iniciarNav } from "./navUI.js";
import { escaparHTML, mostrarAviso, mostrarCargando, mostrarVacio, formatearFecha } from "./utilidades.js";

// ---------- DOM ----------
const panel = document.querySelector("#panel-admin");
const bloqueo = document.querySelector("#acceso-denegado");
const zonaMetricas = document.querySelector("#metricas");
const tablaProductos = document.querySelector("#tabla-productos");
const tablaPedidos = document.querySelector("#tabla-pedidos");
const listaMensajes = document.querySelector("#lista-mensajes");
const buscadorAdmin = document.querySelector("#buscar-admin");
const filtroEstado = document.querySelector("#filtro-estado");
const dialogo = document.querySelector("#dialogo-producto");
const formulario = document.querySelector("#form-producto");
const vistaPrevia = document.querySelector("#vista-previa");

// ---------- Estado ----------
let productos = [];
let pedidos = [];
let mensajes = [];
let idEnEdicion = null; // null = creando, texto = editando

// ---------- Inicio: verificar el rol ----------
iniciarNav((usuario, perfil) => {
  const esAdmin = perfil?.rol === "admin";
  panel.hidden = !esAdmin;
  bloqueo.hidden = esAdmin;
  if (esAdmin) cargarTodo();
});

llenarSelectCategorias();
escucharEventos();

/* ========== CARGA DE DATOS ========== */
async function cargarTodo() {
  mostrarCargando(tablaProductos, "Cargando inventario...");
  mostrarCargando(tablaPedidos, "Cargando reservas...");
  try {
    // Las dos consultas al mismo tiempo
    [productos, pedidos, mensajes] = await Promise.all([obtenerProductos(), obtenerTodosLosPedidos(), obtenerMensajes()]);
    renderizarTodo();
  } catch (error) {
    console.error(error);
    mostrarAviso("Error al cargar los datos: " + error.message, "error");
  }
}

function renderizarTodo() {
  renderizarMetricas();
  renderizarProductos();
  renderizarPedidos();
  renderizarMensajes();
}

/* ========== MÉTRICAS (procesamiento de datos) ========== */
function calcularMetricas() {
  return {
    valorInventario: productos.reduce((suma, p) => suma + p.valorInventario(), 0),
    unidades: productos.reduce((suma, p) => suma + p.stock, 0),
    stockCritico: productos.filter((p) => p.esStockCritico()).length,
    agotados: productos.filter((p) => p.estaAgotado()).length,
    pendientes: pedidos.filter((p) => p.estado === "pendiente").length,
    ventas: pedidos
      .filter((p) => p.estado === "entregado")
      .reduce((suma, p) => suma + p.total, 0),
  };
}

function renderizarMetricas() {
  const m = calcularMetricas();
  zonaMetricas.innerHTML = `
    <div class="metrica"><span>Valor del inventario</span><strong>${formatearPrecio(m.valorInventario)}</strong><small>${m.unidades} unidades</small></div>
    <div class="metrica ${m.stockCritico ? "metrica--alerta" : ""}"><span>Stock crítico (&lt; ${STOCK_CRITICO})</span><strong>${m.stockCritico}</strong><small>${m.agotados} agotados</small></div>
    <div class="metrica ${m.pendientes ? "metrica--alerta" : ""}"><span>Reservas pendientes</span><strong>${m.pendientes}</strong><small>${pedidos.length} en total</small></div>
    <div class="metrica"><span>Ventas entregadas</span><strong>${formatearPrecio(m.ventas)}</strong><small>reservas entregadas</small></div>`;
}

/* ========== TABLA DE PRODUCTOS ========== */
function renderizarProductos() {
  if (productos.length === 0) {
    tablaProductos.innerHTML = `
      <div class="estado-vacio">
        <h3>El catálogo está vacío</h3>
        <p>Puedes cargar los ${PRODUCTOS_INICIALES.length} productos originales de la tienda.</p>
        <button type="button" class="btn btn--primario btn--chico" data-accion="sembrar">Cargar catálogo inicial</button>
      </div>`;
    return;
  }

  const texto = buscadorAdmin.value.trim().toLowerCase();
  const visibles = productos
    .filter((p) => `${p.nombre} ${p.marca} ${p.categoria}`.toLowerCase().includes(texto))
    .sort((a, b) => a.stock - b.stock); // los de menos stock primero

  if (visibles.length === 0) {
    mostrarVacio(tablaProductos, "Sin resultados", "Ningún producto coincide con la búsqueda.");
    return;
  }

  tablaProductos.innerHTML = `
    <table class="tabla">
      <thead>
        <tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Valor</th><th></th></tr>
      </thead>
      <tbody>
        ${visibles.map(crearFilaProducto).join("")}
      </tbody>
    </table>`;
}

function crearFilaProducto(p) {
  let claseStock = "";
  if (p.estaAgotado()) claseStock = "stock--agotado";
  else if (p.esStockCritico()) claseStock = "stock--critico";

  return `
    <tr>
      <td>
        <div class="tabla__producto">
          <img src="${escaparHTML(p.imagen)}" alt="">
          <div><strong>${escaparHTML(p.nombre)}</strong><small>${escaparHTML(p.marca)}</small></div>
        </div>
      </td>
      <td>${p.nombreCategoria()}</td>
      <td>${p.precioFormateado()}</td>
      <td><span class="stock ${claseStock}">${p.stock}</span></td>
      <td>${formatearPrecio(p.valorInventario())}</td>
      <td class="tabla__acciones">
        <button type="button" class="btn-tabla" data-accion="editar" data-id="${p.id}">Editar</button>
        <button type="button" class="btn-tabla btn-tabla--peligro" data-accion="eliminar" data-id="${p.id}">Eliminar</button>
      </td>
    </tr>`;
}

/* ========== TABLA DE RESERVAS ========== */
// Desde cada estado solo se puede pasar a ciertos estados
const TRANSICIONES = {
  pendiente: ["listo", "cancelado"],
  listo: ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
};

function renderizarPedidos() {
  const estado = filtroEstado.value;
  const visibles = estado === "todos" ? pedidos : pedidos.filter((p) => p.estado === estado);

  if (visibles.length === 0) {
    mostrarVacio(tablaPedidos, "No hay reservas", estado === "todos" ? "Aún nadie ha reservado." : "Ninguna reserva en este estado.");
    return;
  }

  tablaPedidos.innerHTML = `
    <table class="tabla">
      <thead>
        <tr><th>Código</th><th>Cliente</th><th>Productos</th><th>Recoge</th><th>Total</th><th>Estado</th></tr>
      </thead>
      <tbody>${visibles.map(crearFilaPedido).join("")}</tbody>
    </table>`;
}

function crearFilaPedido(pedido) {
  const piezas = pedido.items.map((i) => `${i.cantidad}× ${escaparHTML(i.nombre)}`).join("<br>");
  const opciones = TRANSICIONES[pedido.estado] ?? [];

  const control = opciones.length
    ? `<select class="select-estado" data-pedido="${pedido.id}" aria-label="Cambiar estado">
         <option value="">${ESTADOS_PEDIDO[pedido.estado]}</option>
         ${opciones.map((e) => `<option value="${e}">→ ${ESTADOS_PEDIDO[e]}</option>`).join("")}
       </select>`
    : `<span class="estado-pedido estado-pedido--${pedido.estado}">${ESTADOS_PEDIDO[pedido.estado]}</span>`;

  return `
    <tr>
      <td><strong>#${pedido.id.slice(0, 6).toUpperCase()}</strong><small>${formatearFecha(pedido.creado)}</small></td>
      <td>${escaparHTML(pedido.clienteNombre)}<small>${escaparHTML(pedido.telefono)} · ${escaparHTML(pedido.clienteEmail)}</small>
          ${pedido.notas ? `<small class="nota">“${escaparHTML(pedido.notas)}”</small>` : ""}</td>
      <td>${piezas}</td>
      <td>${escaparHTML(pedido.fechaRecogida)}</td>
      <td>${formatearPrecio(pedido.total)}${pedido.descuento > 0 ? `<small>desc. ${formatearPrecio(pedido.descuento)}</small>` : ""}</td>
      <td>${control}</td>
    </tr>`;
}

/* ========== MENSAJES DE CONTACTO ========== */
const ASUNTOS = {
  cotizacion: "Cotizar armado de skate",
  envios: "Dudas sobre envíos",
  disponibilidad: "Disponibilidad de productos",
  otro: "Otro",
};

function renderizarMensajes() {
  if (mensajes.length === 0) {
    mostrarVacio(listaMensajes, "Sin mensajes", "Los mensajes del formulario de contacto aparecerán aquí.");
    return;
  }
  listaMensajes.innerHTML = mensajes
    .map(
      (m) => `
      <article class="mensaje">
        <header>
          <strong>${escaparHTML(m.nombre)}</strong>
          <a href="mailto:${escaparHTML(m.email)}">${escaparHTML(m.email)}</a>
          <span>${ASUNTOS[m.asunto] ?? escaparHTML(m.asunto)} · ${formatearFecha(m.creado)}</span>
        </header>
        <p>${escaparHTML(m.mensaje)}</p>
        <button type="button" class="btn-tabla btn-tabla--peligro" data-borrar-mensaje="${m.id}">Eliminar</button>
      </article>`
    )
    .join("");
}

async function borrarMensaje(id) {
  if (!confirm("¿Eliminar este mensaje?")) return;
  try {
    await eliminarMensaje(id);
    mensajes = mensajes.filter((m) => m.id !== id);
    renderizarMensajes();
    mostrarAviso("Mensaje eliminado.", "exito");
  } catch (error) {
    mostrarAviso("No se pudo eliminar: " + error.message, "error");
  }
}

/* ========== FORMULARIO DE PRODUCTO (crear / editar) ========== */
function llenarSelectCategorias() {
  formulario.categoria.innerHTML =
    `<option value="">Elige una categoría</option>` +
    Object.entries(CATEGORIAS).map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join("");
}

function abrirFormulario(producto = null) {
  formulario.reset();
  limpiarErrores();
  idEnEdicion = producto?.id ?? null;
  dialogo.querySelector("#titulo-dialogo").textContent = producto ? "Editar producto" : "Nuevo producto";

  if (producto) {
    formulario.nombre.value = producto.nombre;
    formulario.marca.value = producto.marca;
    formulario.categoria.value = producto.categoria;
    formulario.precio.value = producto.precio;
    formulario.stock.value = producto.stock;
    formulario.detalle.value = producto.detalle;
    formulario.imagen.value = producto.imagen;
    formulario.badge.value = producto.badge;
  }
  actualizarVistaPrevia();
  dialogo.showModal();
}

function leerFormulario() {
  return {
    nombre: formulario.nombre.value.trim(),
    marca: formulario.marca.value.trim(),
    categoria: formulario.categoria.value,
    precio: formulario.precio.value,
    stock: formulario.stock.value,
    detalle: formulario.detalle.value.trim(),
    imagen: formulario.imagen.value.trim(),
    badge: formulario.badge.value,
  };
}

// Reglas de negocio del formulario. Devuelve { campo: "mensaje" }
function validarFormularioProducto(datos) {
  const errores = {};
  const precio = Number(datos.precio);
  const stock = Number(datos.stock);

  if (datos.nombre.length < 3) errores.nombre = "Mínimo 3 caracteres.";
  if (datos.marca.length < 2) errores.marca = "Escribe la marca.";
  if (!(datos.categoria in CATEGORIAS)) errores.categoria = "Elige una categoría válida.";
  if (datos.precio === "" || !(precio > 0)) errores.precio = "El precio debe ser mayor a $0.";
  else if (precio > 2000) errores.precio = "Precio demasiado alto (máx. $2,000).";
  if (datos.stock === "" || !Number.isInteger(stock) || stock < 0) {
    errores.stock = "Debe ser un número entero de 0 en adelante.";
  }
  if (!/^(img\/.+|https:\/\/.+)\.(jpe?g|png|webp|svg)$/i.test(datos.imagen)) {
    errores.imagen = "Usa una ruta img/... o una URL https que termine en .jpg, .png o .webp";
  }

  // No repetir nombres (ignorando el producto que se está editando)
  const repetido = productos.some(
    (p) => p.nombre.toLowerCase() === datos.nombre.toLowerCase() && p.id !== idEnEdicion
  );
  if (repetido) errores.nombre = "Ya existe un producto con ese nombre.";

  return errores;
}

// Comprueba que la imagen EXISTA de verdad intentando cargarla (Promesa)
function verificarImagen(ruta) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = ruta;
  });
}

async function guardarProducto(evento) {
  evento.preventDefault();
  const datos = leerFormulario();
  const errores = validarFormularioProducto(datos);

  if (!errores.imagen && !(await verificarImagen(datos.imagen))) {
    errores.imagen = "No se encontró ninguna imagen en esa ruta.";
  }

  mostrarErrores(errores);
  if (Object.keys(errores).length > 0) return;

  const producto = new Producto(datos);
  const boton = formulario.querySelector("button[type=submit]");
  boton.disabled = true;
  try {
    if (idEnEdicion) {
      await actualizarProducto(idEnEdicion, producto);
      mostrarAviso("Producto actualizado.", "exito");
    } else {
      await crearProducto(producto);
      mostrarAviso("Producto creado.", "exito");
    }
    dialogo.close();
    await cargarTodo();
  } catch (error) {
    console.error(error);
    mostrarAviso("No se pudo guardar: " + error.message, "error");
  } finally {
    boton.disabled = false;
  }
}

function mostrarErrores(errores) {
  formulario.querySelectorAll("[data-error]").forEach((span) => {
    span.textContent = errores[span.dataset.error] ?? "";
  });
}

function limpiarErrores() {
  mostrarErrores({});
}

function actualizarVistaPrevia() {
  const ruta = formulario.imagen.value.trim();
  vistaPrevia.innerHTML = ruta ? `<img src="${escaparHTML(ruta)}" alt="Vista previa">` : "<span>Sin imagen</span>";
}

/* ========== ACCIONES ========== */
async function borrarProducto(id) {
  const producto = productos.find((p) => p.id === id);
  if (!confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) return;
  try {
    await eliminarProducto(id);
    mostrarAviso("Producto eliminado.", "exito");
    await cargarTodo();
  } catch (error) {
    mostrarAviso("No se pudo eliminar: " + error.message, "error");
  }
}

async function sembrarCatalogo() {
  try {
    await cargarProductosIniciales(PRODUCTOS_INICIALES);
    mostrarAviso("Catálogo inicial cargado.", "exito");
    await cargarTodo();
  } catch (error) {
    mostrarAviso("No se pudo cargar: " + error.message, "error");
  }
}

async function actualizarEstado(idPedido, nuevoEstado) {
  const pedido = pedidos.find((p) => p.id === idPedido);
  if (nuevoEstado === "cancelado" && !confirm("¿Cancelar la reserva? Las unidades vuelven al stock.")) {
    renderizarPedidos();
    return;
  }
  try {
    await cambiarEstadoPedido(pedido, nuevoEstado);
    mostrarAviso(`Reserva marcada como "${ESTADOS_PEDIDO[nuevoEstado]}".`, "exito");
    await cargarTodo();
  } catch (error) {
    mostrarAviso("No se pudo actualizar: " + error.message, "error");
  }
}

/* ========== EVENTOS ========== */
function escucharEventos() {
  document.querySelector("#btn-nuevo").addEventListener("click", () => abrirFormulario());
  document.querySelector("#btn-cancelar").addEventListener("click", () => dialogo.close());

  // Delegación en la tabla de productos
  tablaProductos.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-accion]");
    if (!boton) return;
    const { accion, id } = boton.dataset;
    if (accion === "editar") abrirFormulario(productos.find((p) => p.id === id));
    if (accion === "eliminar") borrarProducto(id);
    if (accion === "sembrar") sembrarCatalogo();
  });

  tablaPedidos.addEventListener("change", (evento) => {
    const select = evento.target.closest("[data-pedido]");
    if (select && select.value) actualizarEstado(select.dataset.pedido, select.value);
  });

  listaMensajes.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-borrar-mensaje]");
    if (boton) borrarMensaje(boton.dataset.borrarMensaje);
  });

  buscadorAdmin.addEventListener("input", renderizarProductos);
  filtroEstado.addEventListener("change", renderizarPedidos);

  formulario.imagen.addEventListener("input", actualizarVistaPrevia);
  formulario.addEventListener("input", (evento) => {
    const span = formulario.querySelector(`[data-error="${evento.target.name}"]`);
    if (span) span.textContent = "";
  });
  formulario.addEventListener("submit", guardarProducto);
}
