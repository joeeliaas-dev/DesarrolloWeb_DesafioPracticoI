/* =========================================================
   ui/loginUI.js — Ingresar y crear cuenta (login.html)
   ========================================================= */

import { iniciarSesion, registrarUsuario, obtenerPerfil, mensajeDeError } from "../services/authService.js";
import { iniciarNav } from "./navUI.js";
import { mostrarAviso } from "./utilidades.js";

const formIngresar = document.querySelector("#form-ingresar");
const formRegistro = document.querySelector("#form-registro");
const pestanas = document.querySelectorAll("[data-pestana]");
const panelSesion = document.querySelector("#sesion-activa");
const zonaFormularios = document.querySelector("#zona-formularios");

// A dónde volver después de entrar (ej.: login.html?volver=carrito)
const volverA = new URLSearchParams(location.search).get("volver");

let procesando = false; // evita que el listener de sesión redirija a medias del registro

iniciarNav((usuario, perfil) => {
  if (procesando) return;
  zonaFormularios.hidden = Boolean(usuario);
  panelSesion.hidden = !usuario;
  if (usuario) {
    panelSesion.querySelector("[data-nombre]").textContent = perfil?.nombre ?? usuario.email;
    panelSesion.querySelector("[data-rol]").textContent = perfil?.rol ?? "cliente";
  }
});

/* ---------- Pestañas Ingresar / Crear cuenta ---------- */
pestanas.forEach((pestana) => {
  pestana.addEventListener("click", () => mostrarPestana(pestana.dataset.pestana));
});

function mostrarPestana(nombre) {
  pestanas.forEach((p) => p.setAttribute("aria-selected", p.dataset.pestana === nombre));
  formIngresar.hidden = nombre !== "ingresar";
  formRegistro.hidden = nombre !== "registro";
}

/* ---------- Validaciones ---------- */
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validarIngreso({ email, password }) {
  const errores = {};
  if (!EMAIL_VALIDO.test(email)) errores.email = "Escribe un correo válido.";
  if (password.length < 6) errores.password = "Mínimo 6 caracteres.";
  return errores;
}

function validarRegistro({ nombre, email, password, confirmar }) {
  const errores = validarIngreso({ email, password });
  if (nombre.length < 3) errores.nombre = "Escribe tu nombre (mínimo 3 letras).";
  if (password !== confirmar) errores.confirmar = "Las contraseñas no coinciden.";
  return errores;
}

function mostrarErrores(formulario, errores) {
  formulario.querySelectorAll("[data-error]").forEach((span) => {
    span.textContent = errores[span.dataset.error] ?? "";
  });
  return Object.keys(errores).length === 0;
}

/* ---------- Envío de formularios ---------- */
formIngresar.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = {
    email: formIngresar.email.value.trim(),
    password: formIngresar.password.value,
  };
  if (!mostrarErrores(formIngresar, validarIngreso(datos))) return;

  await ejecutar(formIngresar, async () => {
    const usuario = await iniciarSesion(datos.email, datos.password);
    const perfil = await obtenerPerfil(usuario.uid);
    mostrarAviso(`¡Bienvenido, ${perfil?.nombre ?? "skater"}!`, "exito");
    redirigir(perfil?.rol);
  });
});

formRegistro.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = {
    nombre: formRegistro.nombre.value.trim(),
    email: formRegistro.email.value.trim(),
    password: formRegistro.password.value,
    confirmar: formRegistro.confirmar.value,
  };
  if (!mostrarErrores(formRegistro, validarRegistro(datos))) return;

  await ejecutar(formRegistro, async () => {
    await registrarUsuario(datos.nombre, datos.email, datos.password);
    mostrarAviso("Cuenta creada. ¡Ya puedes reservar!", "exito");
    redirigir("cliente");
  });
});

// Envuelve la acción con: botón deshabilitado + try/catch/finally
async function ejecutar(formulario, accion) {
  const boton = formulario.querySelector("button[type=submit]");
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Un momento...";
  procesando = true;
  try {
    await accion();
  } catch (error) {
    console.error(error);
    formulario.querySelector("[data-error-general]").textContent = mensajeDeError(error);
    procesando = false;
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

function redirigir(rol) {
  let destino = "productos.html";
  if (volverA === "carrito") destino = "carrito.html";
  else if (rol === "admin") destino = "admin.html";
  setTimeout(() => (location.href = destino), 700);
}

// Mostrar la pestaña de registro si vienen con login.html#registro
if (location.hash === "#registro") mostrarPestana("registro");
