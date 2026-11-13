/* =========================================================
   ui/contactoUI.js — Formulario de contacto (contacto.html)
   Valida y guarda el mensaje en la colección "mensajes".
   Lo ve el administrador en su panel.
   ========================================================= */

import { enviarMensaje } from "../services/dbService.js";
import { mensajeDeError } from "../services/authService.js";
import { iniciarNav } from "./navUI.js";
import { mostrarAviso } from "./utilidades.js";

const formulario = document.querySelector("#form-contacto");
const ASUNTOS = ["cotizacion", "envios", "disponibilidad", "otro"];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

iniciarNav();

function validarContacto(datos) {
  const errores = {};
  if (datos.nombre.length < 3) errores.nombre = "Escribe tu nombre (mínimo 3 letras).";
  if (datos.nombre.length > 80) errores.nombre = "Máximo 80 caracteres.";
  if (!EMAIL_VALIDO.test(datos.email)) errores.email = "Escribe un correo válido.";
  if (!ASUNTOS.includes(datos.asunto)) errores.asunto = "Elige un asunto.";
  if (datos.mensaje.length < 10) errores.mensaje = "Cuéntanos un poco más (mínimo 10 caracteres).";
  if (datos.mensaje.length > 1000) errores.mensaje = "Máximo 1000 caracteres.";
  return errores;
}

function mostrarErrores(errores) {
  formulario.querySelectorAll("[data-error]").forEach((span) => {
    span.textContent = errores[span.dataset.error] ?? "";
  });
}

formulario.addEventListener("input", (evento) => {
  const span = formulario.querySelector(`[data-error="${evento.target.name}"]`);
  if (span) span.textContent = "";
});

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const datos = {
    nombre: formulario.nombre.value.trim(),
    email: formulario.email.value.trim(),
    asunto: formulario.asunto.value,
    mensaje: formulario.mensaje.value.trim(),
  };

  const errores = validarContacto(datos);
  mostrarErrores(errores);
  if (Object.keys(errores).length > 0) return;

  const boton = formulario.querySelector("button[type=submit]");
  boton.disabled = true;
  boton.textContent = "Enviando...";
  try {
    await enviarMensaje(datos);
    formulario.reset();
    mostrarAviso("¡Mensaje enviado! Te respondemos pronto.", "exito");
  } catch (error) {
    console.error(error);
    mostrarAviso(mensajeDeError(error), "error");
  } finally {
    boton.disabled = false;
    boton.textContent = "Enviar mensaje";
  }
});
