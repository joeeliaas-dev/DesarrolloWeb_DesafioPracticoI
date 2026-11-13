/* =========================================================
   ui/utilidades.js — Ayudas de interfaz reutilizables
   ========================================================= */

// Evita que un texto con < > se interprete como HTML (seguridad XSS)
export function escaparHTML(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Mensaje flotante temporal ("toast"). tipo: "exito" | "error" | "info"
export function mostrarAviso(mensaje, tipo = "info") {
  let zona = document.querySelector(".avisos");
  if (!zona) {
    zona = document.createElement("div");
    zona.className = "avisos";
    zona.setAttribute("role", "status");
    zona.setAttribute("aria-live", "polite");
    document.body.append(zona);
  }

  const aviso = document.createElement("p");
  aviso.className = `aviso aviso--${tipo}`;
  aviso.textContent = mensaje;
  zona.append(aviso);

  setTimeout(() => aviso.remove(), 3500);
}

// Estado de carga (spinner) dentro de un contenedor
export function mostrarCargando(contenedor, texto = "Cargando...") {
  contenedor.innerHTML = `
    <div class="estado-carga" role="status">
      <span class="spinner" aria-hidden="true"></span>
      <p>${escaparHTML(texto)}</p>
    </div>`;
}

// Estado vacío o de error dentro de un contenedor
export function mostrarVacio(contenedor, titulo, texto = "", enlace = null) {
  contenedor.innerHTML = `
    <div class="estado-vacio">
      <h3>${escaparHTML(titulo)}</h3>
      ${texto ? `<p>${escaparHTML(texto)}</p>` : ""}
      ${enlace ? `<a href="${enlace.href}" class="btn btn--primario btn--chico">${escaparHTML(enlace.texto)}</a>` : ""}
    </div>`;
}

// Firestore Timestamp → "12 nov 2026, 14:30"
export function formatearFecha(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleString("es-SV", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
