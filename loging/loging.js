// =====================================================
// 🔐 LOGIN FIREBASE AUTH - PROFESIONAL
// Usa instancia central desde api.js
// =====================================================

import { auth } from "../backend/api.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// =====================================================
// 📌 REFERENCIAS DOM
// =====================================================
const form = document.getElementById("formLogin");
const errorDiv = document.getElementById("error");
const btn = document.getElementById("btnLogin");


// =====================================================
// 🔐 PERSISTENCIA (CLAVE)
// Mantiene sesión aunque cierre navegador
// =====================================================
await setPersistence(auth, browserLocalPersistence);


// =====================================================
// 🔍 SI YA ESTÁ LOGEADO → REDIRIGE
// =====================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("🔓 Sesión activa:", user.email);
        window.location.href = "../index.html";
    }
});


// =====================================================
// 🚀 LOGIN
// =====================================================
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        activarCarga(true);

        await signInWithEmailAndPassword(auth, email, password);

        // 🔥 Firebase mantiene sesión automáticamente
        window.location.href = "../index.html";

    } catch (error) {
        console.error("❌ Error login:", error);

        mostrarError(traducirError(error.code));

        activarCarga(false);
    }
});


// =====================================================
// 🎯 UI ESTADO BOTÓN
// =====================================================
function activarCarga(estado) {
    if (estado) {
        btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Ingresando...`;
        btn.disabled = true;
    } else {
        btn.innerHTML = `<i class="fa fa-right-to-bracket"></i> Iniciar Sesión`;
        btn.disabled = false;
    }
}


// =====================================================
// 🚨 ERROR UI
// =====================================================
function mostrarError(mensaje) {
    errorDiv.textContent = mensaje;
    errorDiv.style.opacity = "1";

    setTimeout(() => {
        errorDiv.style.opacity = "0";
    }, 4000);
}


// =====================================================
// 🧠 TRADUCTOR DE ERRORES
// =====================================================
function traducirError(code) {
    switch (code) {
        case "auth/user-not-found":
            return "Usuario no encontrado";
        case "auth/wrong-password":
            return "Contraseña incorrecta";
        case "auth/invalid-email":
            return "Correo inválido";
        case "auth/too-many-requests":
            return "Demasiados intentos. Intenta más tarde";
        default:
            return "Error al iniciar sesión";
    }
}