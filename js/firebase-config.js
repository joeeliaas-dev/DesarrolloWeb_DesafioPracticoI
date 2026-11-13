/* =========================================================
   firebase-config.js — Conexión con Firebase
   Inicializa la app UNA sola vez y exporta las instancias
   de Firestore (base de datos) y Auth (usuarios) para que
   el resto de módulos las importen.
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// Datos públicos del proyecto (los da la consola de Firebase).
// No son secretos: la seguridad real está en firestore.rules.
const firebaseConfig = {
  apiKey: "AIzaSyCeQOkx5E-2BKxh2cWNh47RzOFU6o85vwc",
  authDomain: "proyecto-digitale.firebaseapp.com",
  projectId: "proyecto-digitale",
  storageBucket: "proyecto-digitale.firebasestorage.app",
  messagingSenderId: "459391876374",
  appId: "1:459391876374:web:40df65844658196a69a437",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
