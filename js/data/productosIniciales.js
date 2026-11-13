/* =========================================================
   data/productosIniciales.js — Catálogo de arranque
   Son los productos que antes estaban escritos a mano en
   productos.html. El admin los sube a Firestore con el botón
   "Cargar catálogo inicial" (solo aparece si está vacío).
   El "id" se usa como nombre del documento en Firestore.
   ========================================================= */

export const PRODUCTOS_INICIALES = [
  { id: "tabla-baker-logo", nombre: "Tabla Baker Logo", marca: "Baker", categoria: "tablas", precio: 65, stock: 8, detalle: '8.0" · 8.25" · 8.5"', imagen: "img/baker-wall.jpg", badge: "Top" },
  { id: "tabla-screaming-hand", nombre: "Tabla Screaming Hand", marca: "Santa Cruz", categoria: "tablas", precio: 70, stock: 6, detalle: '8.25" · 8.5"', imagen: "img/santa-cruz.jpg", badge: "Nuevo" },
  { id: "tabla-visitor", nombre: "Tabla Visitor", marca: "Alien Workshop", categoria: "tablas", precio: 68, stock: 2, detalle: '8.0" · 8.25"', imagen: "img/workshop.jpg", badge: "" },
  { id: "tabla-pro-series", nombre: "Tabla Pro Series", marca: "Primitive", categoria: "tablas", precio: 72, stock: 5, detalle: '8.125" · 8.38"', imagen: "img/tablas-dark.jpg", badge: "Nuevo" },
  { id: "tabla-edicion-artista", nombre: "Tabla Edición Artista", marca: "Artist Series", categoria: "tablas", precio: 68, stock: 0, detalle: '8.25" · 8.5"', imagen: "img/tablas-art.jpg", badge: "" },
  { id: "ruedas-prime", nombre: "Ruedas Prime", marca: "Pig Wheels", categoria: "ruedas", precio: 45, stock: 10, detalle: "52mm · 53mm · 101A", imagen: "img/ruedas-pig.jpg", badge: "" },
  { id: "trucks-st1", nombre: "Trucks ST1 (par)", marca: "Slappy", categoria: "trucks", precio: 75, stock: 7, detalle: '8.0" · 8.25" · 8.5"', imagen: "img/trucks.jpg", badge: "Top" },
  { id: "completo-panda", nombre: "Completo Panda", marca: "Enjoi", categoria: "completos", precio: 120, stock: 4, detalle: '7.75" · Listo para rodar', imagen: "img/completos.jpg", badge: "" },
  { id: "hoodie-live-to-burn", nombre: "Hoodie Live to Burn", marca: "Spitfire", categoria: "ropa", precio: 70, stock: 9, detalle: "S · M · L · XL", imagen: "img/hoodie.jpg", badge: "" },
  { id: "beanie-bighead", nombre: "Beanie Bighead", marca: "Spitfire", categoria: "ropa", precio: 28, stock: 12, detalle: "Varios colores", imagen: "img/gorros.jpg", badge: "Nuevo" },
  { id: "gorra-snapback", nombre: "Gorra Snapback", marca: "Spitfire", categoria: "ropa", precio: 32, stock: 1, detalle: "Talla única", imagen: "img/gorras.jpg", badge: "" },
  { id: "calcetines-sect-eye", nombre: "Calcetines Sect Eye", marca: "Toy Machine", categoria: "ropa", precio: 14, stock: 20, detalle: "Talla única", imagen: "img/calcetines.jpg", badge: "" },
  { id: "camiseta-edicion-banda", nombre: "Camiseta Edición Banda", marca: "Addikt Selects", categoria: "ropa", precio: 30, stock: 15, detalle: "S · M · L · XL", imagen: "img/camisetas.jpg", badge: "" },
  { id: "cinturon-bighead", nombre: "Cinturón Bighead", marca: "Spitfire", categoria: "accesorios", precio: 25, stock: 6, detalle: "Ajustable", imagen: "img/spitfire-belt.jpg", badge: "" },
  { id: "compact-skate-tool", nombre: "Compact Skate Tool", marca: "Prime8", categoria: "accesorios", precio: 20, stock: 14, detalle: "Llave multiuso de bolsillo", imagen: "img/prime8.jpg", badge: "" },
];
