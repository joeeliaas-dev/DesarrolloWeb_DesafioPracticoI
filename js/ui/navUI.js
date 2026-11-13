/* =========================================================
   ui/navUI.js — Menú que cambia según la sesión y el rol
   - Visitante:  "Ingresar"
   - Cliente:    "Mis reservas" + "Salir"
   - Admin:      "Panel admin" + "Salir"
   Además mantiene al día el contador del carrito.
   ========================================================= */

import { escucharSesion, cerrarSesion } from "../services/authService.js";
import { obtenerCarrito, contarArticulos } from "../services/carritoService.js";
import { escaparHTML, mostrarAviso } from "./utilidades.js";

// alCambiarSesion (opcional): cada página puede reaccionar al login/logout
export function iniciarNav(alCambiarSesion = () => {}) {
  actualizarContadorCarrito();

  // Cambios del carrito en esta pestaña (evento propio) y en otras (evento "storage")
  window.addEventListener("carrito:cambio", actualizarContadorCarrito);
  window.addEventListener("storage", actualizarContadorCarrito);

  escucharSesion((usuario, perfil) => {
    pintarSesion(usuario, perfil);
    alCambiarSesion(usuario, perfil);
  });
}

function actualizarContadorCarrito() {
  const total = contarArticulos(obtenerCarrito());
  document.querySelectorAll("[data-contador-carrito]").forEach((contador) => {
    contador.textContent = total;
    contador.hidden = total === 0;
  });
}

function pintarSesion(usuario, perfil) {
  const zona = document.querySelector("[data-nav-sesion]");
  if (!zona) return;

  if (!usuario) {
    zona.innerHTML = `<a href="login.html" class="nav__enlace">Ingresar</a>`;
    return;
  }

  const esAdmin = perfil?.rol === "admin";
  const nombre = escaparHTML((perfil?.nombre ?? usuario.email).split(" ")[0]);

  zona.innerHTML = `
    ${esAdmin
      ? `<a href="admin.html" class="nav__enlace nav__enlace--admin">Panel admin</a>`
      : `<a href="mis-reservas.html" class="nav__enlace">Mis reservas</a>`}
    <button type="button" class="nav__salir" data-salir title="Cerrar sesión de ${nombre}">Salir</button>`;

  zona.querySelector("[data-salir]").addEventListener("click", async () => {
    await cerrarSesion();
    mostrarAviso("Sesión cerrada. ¡Nos vemos en el spot!", "info");
  });

  marcarEnlaceActivo();
}

function marcarEnlaceActivo() {
  const pagina = location.pathname.split("/").pop().replace(".html", "");
  document.querySelectorAll("[data-nav-sesion] a").forEach((enlace) => {
    const destino = enlace.getAttribute("href").replace(".html", "");
    enlace.classList.toggle("nav__enlace--activo", destino === pagina);
  });
}
