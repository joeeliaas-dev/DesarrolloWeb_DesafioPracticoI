/* =========================================================
   ui/reservasUI.js — Historial del cliente (mis-reservas.html)
   ========================================================= */

import { obtenerPedidosDeUsuario } from "../services/dbService.js";
import { formatearPrecio } from "../models/Producto.js";
import { ESTADOS_PEDIDO } from "../constantes.js";
import { iniciarNav } from "./navUI.js";
import { escaparHTML, mostrarCargando, mostrarVacio, formatearFecha } from "./utilidades.js";

const contenedor = document.querySelector("#lista-reservas");
const resumen = document.querySelector("#resumen-reservas");

iniciarNav((usuario) => {
  if (!usuario) {
    resumen.hidden = true;
    mostrarVacio(contenedor, "Inicia sesión para ver tus reservas", "", {
      href: "login.html",
      texto: "Ingresar",
    });
    return;
  }
  cargarReservas(usuario.uid);
});

async function cargarReservas(uid) {
  mostrarCargando(contenedor, "Buscando tus reservas...");
  try {
    const pedidos = await obtenerPedidosDeUsuario(uid);

    if (pedidos.length === 0) {
      resumen.hidden = true;
      mostrarVacio(contenedor, "Aún no tienes reservas", "Arma tu carrito y aparta tu setup.", {
        href: "productos.html",
        texto: "Ver catálogo",
      });
      return;
    }

    pintarResumen(pedidos);
    contenedor.innerHTML = pedidos.map(crearTarjetaReserva).join("");
  } catch (error) {
    console.error(error);
    mostrarVacio(contenedor, "No pudimos cargar tus reservas", "Intenta de nuevo en un momento.");
  }
}

// Indicadores con filter + reduce
function pintarResumen(pedidos) {
  const activos = pedidos.filter((p) => p.estado === "pendiente" || p.estado === "listo");
  const gastado = pedidos
    .filter((p) => p.estado !== "cancelado")
    .reduce((suma, p) => suma + p.total, 0);

  resumen.hidden = false;
  resumen.innerHTML = `
    <div class="metrica"><span>Reservas</span><strong>${pedidos.length}</strong></div>
    <div class="metrica"><span>Activas</span><strong>${activos.length}</strong></div>
    <div class="metrica"><span>Total reservado</span><strong>${formatearPrecio(gastado)}</strong></div>`;
}

function crearTarjetaReserva(pedido) {
  const productos = pedido.items
    .map((item) => `<li><span>${item.cantidad} × ${escaparHTML(item.nombre)}</span><span>${formatearPrecio(item.precio * item.cantidad)}</span></li>`)
    .join("");

  return `
    <article class="reserva">
      <header class="reserva__cabecera">
        <div>
          <strong>#${pedido.id.slice(0, 6).toUpperCase()}</strong>
          <span>${formatearFecha(pedido.creado)}</span>
        </div>
        <span class="estado-pedido estado-pedido--${pedido.estado}">${ESTADOS_PEDIDO[pedido.estado] ?? pedido.estado}</span>
      </header>
      <ul class="reserva__items">${productos}</ul>
      <footer class="reserva__pie">
        <span>Recoger: <strong>${escaparHTML(pedido.fechaRecogida)}</strong></span>
        <span>
          ${pedido.descuento > 0 ? `<small>Desc. − ${formatearPrecio(pedido.descuento)}</small>` : ""}
          <strong>${formatearPrecio(pedido.total)}</strong>
        </span>
      </footer>
    </article>`;
}
