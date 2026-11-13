/* =========================================================
   ui/catalogoUI.js — Catálogo dinámico (productos.html)
   1. Descarga los productos de Firestore (con spinner).
   2. Los guarda en un arreglo en memoria.
   3. Filtra (.filter) y ordena (.sort) según los controles.
   4. Dibuja las tarjetas en el DOM.
   5. Botón "Agregar" → carrito en localStorage.
   ========================================================= */

import { obtenerProductos } from "../services/dbService.js";
import { agregarAlCarrito } from "../services/carritoService.js";
import { CATEGORIAS, DESCUENTO_SETUP } from "../constantes.js";
import { iniciarNav } from "./navUI.js";
import { escaparHTML, mostrarAviso, mostrarCargando, mostrarVacio } from "./utilidades.js";

// ---------- Referencias al DOM ----------
const contenedor = document.querySelector("#catalogo");
const chips = document.querySelector("#filtro-categorias");
const buscador = document.querySelector("#buscador");
const selectMarca = document.querySelector("#filtro-marca");
const selectOrden = document.querySelector("#orden");
const checkDisponibles = document.querySelector("#solo-disponibles");
const resumen = document.querySelector("#resumen");

// ---------- Estado de la página ----------
let productos = []; // todo lo que vino de Firestore
const filtros = {
  categoria: "todas",
  texto: "",
  marca: "todas",
  soloDisponibles: false,
  orden: "categoria",
};

// ---------- Inicio ----------
iniciarNav();
mostrarPorcentajeDescuento();
crearChipsDeCategoria();
filtros.categoria = leerCategoriaDeURL();
escucharControles();
cargarCatalogo();

/* ========== CARGA DESDE FIRESTORE ========== */
async function cargarCatalogo() {
  mostrarCargando(contenedor, "Cargando catálogo...");
  contenedor.setAttribute("aria-busy", "true");
  try {
    productos = await obtenerProductos();
    llenarSelectMarcas();
    renderizarCatalogo();
  } catch (error) {
    console.error(error);
    mostrarVacio(contenedor, "No pudimos cargar el catálogo", "Revisa tu conexión e intenta de nuevo.");
  } finally {
    contenedor.setAttribute("aria-busy", "false");
  }
}

/* ========== PROCESAMIENTO DE DATOS ========== */

// Aplica todos los filtros a la vez (búsqueda + categoría + marca + stock)
function filtrarProductos(lista) {
  const texto = filtros.texto.trim().toLowerCase();

  return lista.filter((producto) => {
    const coincideCategoria = filtros.categoria === "todas" || producto.categoria === filtros.categoria;
    const coincideMarca = filtros.marca === "todas" || producto.marca === filtros.marca;
    const coincideStock = !filtros.soloDisponibles || !producto.estaAgotado();
    const coincideTexto =
      texto === "" ||
      producto.nombre.toLowerCase().includes(texto) ||
      producto.marca.toLowerCase().includes(texto);

    return coincideCategoria && coincideMarca && coincideStock && coincideTexto;
  });
}

// Ordena una COPIA del arreglo (no altera el original)
function ordenarProductos(lista) {
  const ordenCategorias = Object.keys(CATEGORIAS);
  const copia = [...lista];

  switch (filtros.orden) {
    case "precio-asc":
      return copia.sort((a, b) => a.precio - b.precio);
    case "precio-desc":
      return copia.sort((a, b) => b.precio - a.precio);
    case "nombre":
      return copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
    case "stock" :
      return copia.sort((a, b) => b.stock - a.stock);
    default: // por categoría y luego por nombre
      return copia.sort(
        (a, b) =>
          ordenCategorias.indexOf(a.categoria) - ordenCategorias.indexOf(b.categoria) ||
          a.nombre.localeCompare(b.nombre)
      );
  }
}

/* ========== DIBUJAR EN EL DOM ========== */
function renderizarCatalogo() {
  const visibles = ordenarProductos(filtrarProductos(productos));

  resumen.textContent = `Mostrando ${visibles.length} de ${productos.length} productos`;

  if (visibles.length === 0) {
    mostrarVacio(contenedor, "No encontramos nada", "Prueba con otra búsqueda o quita algún filtro.");
    return;
  }

  contenedor.innerHTML = visibles.map(crearTarjeta).join("");
}

function crearTarjeta(producto) {
  let estadoStock = `<span class="producto__stock">Disponible</span>`;
  if (producto.estaAgotado()) {
    estadoStock = `<span class="producto__stock producto__stock--agotado">Agotado</span>`;
  } else if (producto.esStockCritico()) {
    estadoStock = `<span class="producto__stock producto__stock--critico">¡Últimas ${producto.stock}!</span>`;
  }

  return `
    <article class="producto ${producto.estaAgotado() ? "producto--agotado" : ""}">
      <div class="producto__imagen">
        <img src="${escaparHTML(producto.imagen)}" alt="${escaparHTML(producto.nombre)}" loading="lazy">
        ${producto.badge ? `<span class="producto__badge">${escaparHTML(producto.badge)}</span>` : ""}
      </div>
      <div class="producto__info">
        <span class="producto__marca">${escaparHTML(producto.marca)}</span>
        <h3 class="producto__nombre">${escaparHTML(producto.nombre)}</h3>
        <p class="producto__detalle">${escaparHTML(producto.detalle)}</p>
        ${estadoStock}
        <div class="producto__pie">
          <span class="producto__precio">${producto.precioFormateado()}</span>
          <button type="button" class="producto__btn" data-agregar="${producto.id}" ${producto.estaAgotado() ? "disabled" : ""}>
            ${producto.estaAgotado() ? "Sin stock" : "Agregar"}
          </button>
        </div>
      </div>
    </article>`;
}

function crearChipsDeCategoria() {
  const opciones = { todas: "Todos", ...CATEGORIAS };
  chips.innerHTML = Object.entries(opciones)
    .map(([valor, texto]) => `<button type="button" class="chip" data-categoria="${valor}">${texto}</button>`)
    .join("");
}

function marcarChipActivo() {
  chips.querySelectorAll(".chip").forEach((chip) => {
    const activo = chip.dataset.categoria === filtros.categoria;
    chip.classList.toggle("chip--activo", activo);
    chip.setAttribute("aria-pressed", activo);
  });
}

// Las marcas salen de los datos: un Set elimina las repetidas
function llenarSelectMarcas() {
  const marcas = [...new Set(productos.map((p) => p.marca))].sort();
  selectMarca.innerHTML =
    `<option value="todas">Todas las marcas</option>` +
    marcas.map((marca) => `<option value="${escaparHTML(marca)}">${escaparHTML(marca)}</option>`).join("");
}

function mostrarPorcentajeDescuento() {
  document.querySelectorAll("[data-descuento]").forEach((el) => {
    el.textContent = `${DESCUENTO_SETUP * 100}%`;
  });
}

/* ========== EVENTOS ========== */
function escucharControles() {
  marcarChipActivo();

  chips.addEventListener("click", (evento) => {
    const chip = evento.target.closest("[data-categoria]");
    if (!chip) return;
    filtros.categoria = chip.dataset.categoria;
    history.replaceState(null, "", filtros.categoria === "todas" ? location.pathname : `#${filtros.categoria}`);
    marcarChipActivo();
    renderizarCatalogo();
  });

  // "input" se dispara con cada tecla → búsqueda en tiempo real
  buscador.addEventListener("input", () => {
    filtros.texto = buscador.value;
    renderizarCatalogo();
  });

  selectMarca.addEventListener("change", () => {
    filtros.marca = selectMarca.value;
    renderizarCatalogo();
  });

  selectOrden.addEventListener("change", () => {
    filtros.orden = selectOrden.value;
    renderizarCatalogo();
  });

  checkDisponibles.addEventListener("change", () => {
    filtros.soloDisponibles = checkDisponibles.checked;
    renderizarCatalogo();
  });

  // Delegación de eventos: un solo listener para todos los botones "Agregar"
  contenedor.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-agregar]");
    if (!boton) return;
    const producto = productos.find((p) => p.id === boton.dataset.agregar);
    const resultado = agregarAlCarrito(producto);
    mostrarAviso(resultado.mensaje, resultado.ok ? "exito" : "error");
  });

  // Si llegan desde index.html con productos.html#tablas
  window.addEventListener("hashchange", () => {
    filtros.categoria = leerCategoriaDeURL();
    marcarChipActivo();
    renderizarCatalogo();
  });
}

function leerCategoriaDeURL() {
  const categoria = location.hash.replace("#", "");
  return categoria in CATEGORIAS ? categoria : "todas";
}
