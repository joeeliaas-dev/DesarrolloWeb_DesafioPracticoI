/* =========================================================
   constantes.js — Valores de negocio en UN solo lugar.
   Si en la defensa piden "cambia el descuento a 15%" o
   "el stock crítico ahora es 5", se cambia aquí y listo.
   ========================================================= */

// Categorías válidas del catálogo (valor guardado → texto visible)
export const CATEGORIAS = {
  tablas: "Tablas",
  ruedas: "Ruedas",
  trucks: "Trucks",
  completos: "Completos",
  ropa: "Ropa",
  accesorios: "Accesorios",
  baleros: "Baleros"
};

// Regla "Arma tu skate": tabla + trucks + ruedas en el carrito
export const CATEGORIAS_SETUP = ["tablas", "trucks", "ruedas"];
export const DESCUENTO_SETUP = 0.10; // 10 %

// Un producto con menos de estas unidades está en "stock crítico"
export const STOCK_CRITICO = 3;

// Máximo de unidades de un mismo producto por reserva
export const MAX_POR_PRODUCTO = 5;

// Estados por los que pasa una reserva
export const ESTADOS_PEDIDO = {
  pendiente: "Pendiente",
  listo: "Listo para recoger",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

// Nombre de la "llave" del carrito en localStorage
export const LLAVE_CARRITO = "addikt_carrito";
