// =====================================================
// 🔥 API FIREBASE - SISTEMA PAPELETAS (DUAL)
// Soporta:
// ✔ justificaciones (YA FUNCIONA)
// ✔ faltas (NUEVO)
// =====================================================


// ===============================
// 📦 IMPORTACIONES FIREBASE
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ===============================
// 🔑 CONFIGURACIÓN
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyDy5GC-m2AKB2RTXwLioYyvk19tjppVtUU",
  authDomain: "control-de-papeletas.firebaseapp.com",
  projectId: "control-de-papeletas",
  storageBucket: "control-de-papeletas.firebasestorage.app",
  messagingSenderId: "593825067030",
  appId: "1:593825067030:web:e62540cfdc3b2d79ee8537"
};


// ===============================
// 🚀 INIT
// ===============================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const auth = getAuth(app);

// EXPORTAMOS AUTH PARA USAR EN TODO EL SISTEMA
export { auth };

// =====================================================
// ================= JUSTIFICACIONES ====================
// =====================================================

// 📅 MESES
export async function obtenerMeses() {
    const ref = collection(db, "justificaciones");
    const snapshot = await getDocs(ref);

    const meses = [];
    snapshot.forEach(doc => meses.push(doc.id));

    return meses;
}

// 🏢 UNIDADES
export async function obtenerUnidades(mes) {
    const ref = collection(db, "justificaciones", mes, "unidades");
    const snapshot = await getDocs(ref);

    const unidades = [];
    snapshot.forEach(doc => unidades.push(doc.id));

    return unidades;
}

// 📊 REGISTROS POR MES
export async function obtenerRegistrosPorMes(mes) {

    const unidades = await obtenerUnidades(mes);
    let registros = [];

    for (let unidad of unidades) {

        const ref = collection(
            db,
            "justificaciones",
            mes,
            "unidades",
            unidad,
            "registros"
        );

        const snapshot = await getDocs(ref);

        snapshot.forEach(doc => {
            registros.push({
                id: doc.id,
                unidad,
                ...doc.data()
            });
        });
    }

    return registros;
}

// 📊 REGISTROS POR UNIDAD
export async function obtenerRegistrosPorUnidad(mes, unidad) {

    const ref = collection(
        db,
        "justificaciones",
        mes,
        "unidades",
        unidad,
        "registros"
    );

    const snapshot = await getDocs(ref);

    const registros = [];
    snapshot.forEach(doc => {
        registros.push({
            id: doc.id,
            ...doc.data()
        });
    });

    return registros;
}

// ➕ AGREGAR
export async function agregarRegistro(mes, unidad, data) {

    const ref = collection(
        db,
        "justificaciones",
        mes,
        "unidades",
        unidad,
        "registros"
    );

    await addDoc(ref, data);
    return true;
}



// =====================================================
// ====================== FALTAS ========================
// =====================================================

// 📅 MESES FALTAS
export async function obtenerMesesFaltas() {

    const ref = collection(db, "faltas");
    const snapshot = await getDocs(ref);

    const meses = [];
    snapshot.forEach(doc => meses.push(doc.id));

    return meses;
}


// 🏢 UNIDADES FALTAS
export async function obtenerUnidadesFaltas(mes) {

    const ref = collection(db, "faltas", mes, "unidades");
    const snapshot = await getDocs(ref);

    const unidades = [];
    snapshot.forEach(doc => unidades.push(doc.id));

    return unidades;
}


// 📊 REGISTROS POR UNIDAD FALTAS
export async function obtenerRegistrosFaltas(mes, unidad) {

    const ref = collection(
        db,
        "faltas",
        mes,
        "unidades",
        unidad,
        "registros"
    );

    const snapshot = await getDocs(ref);

    const registros = [];

    snapshot.forEach(doc => {
        registros.push({
            id: doc.id,
            ...doc.data()
        });
    });

    return registros;
}


// 📊 REGISTROS POR MES FALTAS
export async function obtenerRegistrosFaltasPorMes(mes) {

    const unidades = await obtenerUnidadesFaltas(mes);
    let registros = [];

    for (let unidad of unidades) {

        const ref = collection(
            db,
            "faltas",
            mes,
            "unidades",
            unidad,
            "registros"
        );

        const snapshot = await getDocs(ref);

        snapshot.forEach(doc => {
            registros.push({
                id: doc.id,
                unidad,
                ...doc.data()
            });
        });
    }

    return registros;
}


// ➕ AGREGAR FALTA
export async function agregarFalta(mes, unidad, data) {

    const ref = collection(
        db,
        "faltas",
        mes,
        "unidades",
        unidad,
        "registros"
    );

    await addDoc(ref, data);
    return true;
}