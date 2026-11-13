/* =========================================================
   models/Producto.js — Clase Producto (POO)
   Representa un artículo del catálogo. Agrupa los datos
   (atributos) y lo que se puede hacer con ellos (métodos).
   ========================================================= */

import { CATEGORIAS, STOCK_CRITICO } from "../constantes.js";

export class Producto {
  constructor({ id = null, nombre, marca, categoria, precio, stock, detalle = "", imagen, badge = "" }) {
    this.id = id;
    this.nombre = nombre;
    this.marca = marca;
    this.categoria = categoria;
    this.precio = Number(precio);
    this.stock = Number(stock);
    this.detalle = detalle;
    this.imagen = imagen;
    this.badge = badge;
  }

  // ¿Se pueden apartar "cantidad" unidades?
  hayStock(cantidad = 1) {
    return this.stock >= cantidad;
  }

  estaAgotado() {
    return this.stock === 0;
  }

  esStockCritico() {
    return this.stock > 0 && this.stock < STOCK_CRITICO;
  }

  // Texto de la categoría ("tablas" → "Tablas")
  nombreCategoria() {
    return CATEGORIAS[this.categoria] ?? this.categoria;
  }

  // 65 → "$65.00"
  precioFormateado() {
    return formatearPrecio(this.precio);
  }

  // Valor del inventario de este producto (precio × unidades)
  valorInventario() {
    return this.precio * this.stock;
  }

  // Objeto plano para guardar en Firestore (sin el id, que es el nombre del documento)
  aFirestore() {
    return {
      nombre: this.nombre,
      marca: this.marca,
      categoria: this.categoria,
      precio: this.precio,
      stock: this.stock,
      detalle: this.detalle,
      imagen: this.imagen,
      badge: this.badge,
    };
  }

  // Crea un Producto a partir de un documento leído de Firestore
  static desdeFirestore(documento) {
    return new Producto({ id: documento.id, ...documento.data() });
  }
}

// Función reutilizable para mostrar dinero en USD
export function formatearPrecio(valor) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(valor);
}
