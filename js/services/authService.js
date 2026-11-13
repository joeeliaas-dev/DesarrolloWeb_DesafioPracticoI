/* =========================================================
   services/authService.js — Usuarios y roles
   Registro, inicio/cierre de sesión y lectura del rol
   guardado en la colección "usuarios" de Firestore.
   ========================================================= */

import { auth, db } from "../firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Crea la cuenta en Auth y su perfil en /usuarios con rol "cliente".
// El rol "admin" NUNCA se asigna desde aquí (solo desde la consola).
export async function registrarUsuario(nombre, email, password) {
  const credencial = await createUserWithEmailAndPassword(auth, email, password);
  const usuario = credencial.user;

  await updateProfile(usuario, { displayName: nombre });
  await setDoc(doc(db, "usuarios", usuario.uid), {
    nombre,
    email,
    rol: "cliente",
    creado: serverTimestamp(),
  });

  return usuario;
}

export async function iniciarSesion(email, password) {
  const credencial = await signInWithEmailAndPassword(auth, email, password);
  return credencial.user;
}

export function cerrarSesion() {
  return signOut(auth);
}

// Lee el documento /usuarios/{uid}. Devuelve null si no existe.
export async function obtenerPerfil(uid) {
  const documento = await getDoc(doc(db, "usuarios", uid));
  return documento.exists() ? { uid, ...documento.data() } : null;
}

// Avisa cada vez que alguien entra o sale.
// El callback recibe (usuario, perfil) o (null, null) si no hay sesión.
export function escucharSesion(callback) {
  return onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
      callback(null, null);
      return;
    }
    try {
      const perfil = await obtenerPerfil(usuario.uid);
      callback(usuario, perfil);
    } catch (error) {
      console.error("No se pudo leer el perfil:", error);
      callback(usuario, null);
    }
  });
}

// Traduce los códigos de error de Firebase a mensajes en español
export function mensajeDeError(error) {
  const mensajes = {
    "auth/invalid-email": "El correo no tiene un formato válido.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento.",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
    "permission-denied": "No tienes permiso para hacer esto.",
    "unavailable": "Sin conexión con el servidor. Intenta de nuevo.",
  };
  return mensajes[error.code] ?? error.message ?? "Ocurrió un error inesperado.";
}
