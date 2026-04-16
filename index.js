
// =====================================================
// 📊 INDEX.JS - SISTEMA DE MONITOREO INTEGRAL
// Listo para producción
// =====================================================
import {
    obtenerMeses,
    obtenerRegistrosPorMes,
    obtenerMesesFaltas,
    obtenerRegistrosFaltasPorMes,
    auth // 🔥 IMPORTANTE
} from "./backend/api.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// =====================================================
// 🌍 ESTADO GLOBAL
// =====================================================
const estado = {
    mesesMap: new Map(),
    mesSeleccionadoNormalizado: "",
    charts: {
        subgerencia: null,
        reincidentes: null,
        personasUnicas: null,
        meses: null
    }
};


// =====================================================
// 🎨 PALETA UNIFORME (OLIVO / REFERENCIA VISUAL)
// =====================================================
const COLORES = {
    faltas: "#6a8044",
    faltasBorde: "#6a8044",

    justificaciones: "#9e7239",
    justificacionesBorde: "#9e7239",

    reincFaltas: "#6a8044",
    reincJust: "#9e7239",

    personasFaltas: "#6a8044",
    personasJust: "#9e7239",

    grid: "rgba(85, 107, 47, 0.10)",
    texto: "#334155",
    textoSuave: "#64748b"
};


// =====================================================
// 🗓️ CATÁLOGO DE MESES
// =====================================================
const MESES_ES = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE"
];

const INDICE_MES = {
    ENERO: 0,
    FEBRERO: 1,
    MARZO: 2,
    ABRIL: 3,
    MAYO: 4,
    JUNIO: 5,
    JULIO: 6,
    AGOSTO: 7,
    SEPTIEMBRE: 8,
    OCTUBRE: 9,
    NOVIEMBRE: 10,
    DICIEMBRE: 11
};


// =====================================================
// 📌 REFERENCIAS DOM
// =====================================================
const $ = (id) => document.getElementById(id);

const dom = {
    filtroMes: $("filtroMes"),

    kpiFaltas: $("kpiFaltas"),
    kpiJustificaciones: $("kpiJustificaciones"),
    kpiPersonas: $("kpiPersonas"),
    kpiReincidentesJustificaciones: $("kpiReincidentesJustificaciones"),
    kpiReincidentesFaltas: $("kpiReincidentesFaltas"),

    chartSubgerencia: $("chartSubgerencia"),
    chartReincidentes: $("chartReincidentes"),
    chartPersonasUnicas: $("chartPersonasUnicas"),
    chartMeses: $("chartMeses")
};


// =====================================================
// 🚀 INICIO
// =====================================================
document.addEventListener("DOMContentLoaded", () => {

    onAuthStateChanged(auth, async (user) => {

        if (!user) {
            // ❌ NO LOGEADO
            window.location.href = "loging/loging.html";
            return;
        }

        console.log("✅ Usuario autenticado:", user.email);

        // 🔓 MOSTRAR UI
        document.body.style.visibility = "visible";

        // 🚀 INICIAR TU DASHBOARD (TU MISMO CÓDIGO)
        await iniciarDashboard();

    });

});
// =====================================================
// 🔽 DROPDOWN FUNCIONAL (CLICK REAL)
// =====================================================
document.addEventListener("DOMContentLoaded", () => {

    const dropdown = document.getElementById("dropdownMenu");
    const btn = document.getElementById("btnDropdown");

    if (!dropdown || !btn) {
        console.error("❌ Dropdown no encontrado");
        return;
    }

    // ABRIR / CERRAR
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("active");
    });

    // CERRAR SI HACES CLICK FUERA
    document.addEventListener("click", () => {
        dropdown.classList.remove("active");
    });

});

// =====================================================
// 🔧 INICIALIZACIÓN GENERAL
// =====================================================
async function iniciarDashboard() {
    try {
        await cargarPluginDatalabels();
        registrarPluginDatalabels();
        await cargarMesesDisponibles();
        configurarEventos();
        await seleccionarMesInicialYRenderizar();
    } catch (error) {
        console.error("❌ Error al iniciar el dashboard:", error);
        mostrarEstadoError();
    }
}

function configurarEventos() {
    dom.filtroMes.addEventListener("change", async (e) => {
        const mesNormalizado = e.target.value;
        estado.mesSeleccionadoNormalizado = mesNormalizado;
        await renderizarDashboardMes(mesNormalizado);
    });
}


// =====================================================
// 📦 CARGA DINÁMICA DEL PLUGIN DE ETIQUETAS
// =====================================================
async function cargarPluginDatalabels() {
    if (window.ChartDataLabels) return;

    await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels";
        script.onload = resolve;
        script.onerror = () => reject(new Error("No se pudo cargar chartjs-plugin-datalabels"));
        document.head.appendChild(script);
    });
}

function registrarPluginDatalabels() {
    if (window.Chart && window.ChartDataLabels) {
        Chart.register(window.ChartDataLabels);
    }
}


// =====================================================
// 🧠 NORMALIZACIONES
// =====================================================
function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

function normalizarMes(valor) {
    return normalizarTexto(valor);
}

function formatearMesLabel(valor) {
    const limpio = normalizarTexto(valor).toLowerCase();
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function normalizarUnidad(valor) {
    return normalizarTexto(valor);
}

function formatearUnidad(valor) {
    return String(valor ?? "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function obtenerMesActualNormalizado() {
    const indice = new Date().getMonth();
    return MESES_ES[indice];
}

function capitalizarPalabras(texto) {
    return String(texto ?? "")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatearNumero(numero) {
    return Number(numero || 0).toLocaleString("es-PE");
}


// =====================================================
// 📅 CARGA DE MESES DISPONIBLES
// =====================================================
async function cargarMesesDisponibles() {
    const [mesesJustificaciones, mesesFaltas] = await Promise.all([
        obtenerMeses().catch(() => []),
        obtenerMesesFaltas().catch(() => [])
    ]);

    const mapa = new Map();

    for (const mes of mesesJustificaciones) {
        const key = normalizarMes(mes);
        if (!mapa.has(key)) {
            mapa.set(key, {
                key,
                label: formatearMesLabel(mes),
                justificacionesId: mes,
                faltasId: null
            });
        } else {
            mapa.get(key).justificacionesId = mes;
        }
    }

    for (const mes of mesesFaltas) {
        const key = normalizarMes(mes);
        if (!mapa.has(key)) {
            mapa.set(key, {
                key,
                label: formatearMesLabel(mes),
                justificacionesId: null,
                faltasId: mes
            });
        } else {
            mapa.get(key).faltasId = mes;
        }
    }

    const mesesOrdenados = [...mapa.values()].sort((a, b) => {
        const ia = INDICE_MES[a.key] ?? 99;
        const ib = INDICE_MES[b.key] ?? 99;
        return ia - ib;
    });

    estado.mesesMap = new Map(mesesOrdenados.map(item => [item.key, item]));

    llenarSelectMeses(mesesOrdenados);
}

function llenarSelectMeses(meses) {
    dom.filtroMes.innerHTML = "";

    if (!meses.length) {
        dom.filtroMes.innerHTML = `<option value="">Sin meses disponibles</option>`;
        return;
    }

    meses.forEach(mes => {
        const option = document.createElement("option");
        option.value = mes.key;
        option.textContent = mes.label;
        dom.filtroMes.appendChild(option);
    });
}

async function seleccionarMesInicialYRenderizar() {
    const meses = [...estado.mesesMap.values()];

    if (!meses.length) {
        mostrarEstadoSinDatos();
        return;
    }

    const mesActual = obtenerMesActualNormalizado();

    let mesInicial = meses.find(m => m.key === mesActual);

    if (!mesInicial) {
        const mesesOrdenados = [...meses].sort((a, b) => {
            const ia = INDICE_MES[a.key] ?? -1;
            const ib = INDICE_MES[b.key] ?? -1;
            return ib - ia;
        });
        mesInicial = mesesOrdenados[0];
    }

    estado.mesSeleccionadoNormalizado = mesInicial.key;
    dom.filtroMes.value = mesInicial.key;

    await renderizarDashboardMes(mesInicial.key);
}


// =====================================================
// 📥 CARGA DE DATOS DE UN MES
// =====================================================
async function renderizarDashboardMes(mesNormalizado) {
    const metaMes = estado.mesesMap.get(mesNormalizado);

    if (!metaMes) {
        mostrarEstadoSinDatos();
        return;
    }

    try {
        const [faltas, justificaciones] = await Promise.all([
            metaMes.faltasId ? obtenerRegistrosFaltasPorMes(metaMes.faltasId) : Promise.resolve([]),
            metaMes.justificacionesId ? obtenerRegistrosPorMes(metaMes.justificacionesId) : Promise.resolve([])
        ]);

        const faltasNormalizadas = normalizarRegistrosFaltas(faltas);
        const justificacionesNormalizadas = normalizarRegistrosJustificaciones(justificaciones);

        renderizarKPIs(faltasNormalizadas, justificacionesNormalizadas);
        renderizarGraficoSubgerencia(faltasNormalizadas, justificacionesNormalizadas);
        renderizarGraficoReincidentes(faltasNormalizadas, justificacionesNormalizadas);
        renderizarGraficoPersonasUnicas(faltasNormalizadas, justificacionesNormalizadas);
        await renderizarGraficoMesesComparativo();

    } catch (error) {
        console.error(`❌ Error al renderizar el mes ${mesNormalizado}:`, error);
        mostrarEstadoError();
    }
}


// =====================================================
// 🧹 NORMALIZACIÓN DE REGISTROS
// =====================================================
function normalizarRegistrosFaltas(registros) {
    return registros.map((r) => {
        const unidadRaw = r.unidad || r["UNIDAD ORGANICA"] || r["UNIDAD ORGÁNICA"] || "";
        const nombresRaw = r["APELLIDOS Y NOMBRES"] || r["APELLIDOS Y NOMBRES "] || r["NOMBRES Y APELLIDOS"] || "";
        const dniRaw = r.DNI || r.dni || "";
        const fechaRaw = r.FECHA || r.fecha || "";

        return {
            ...r,
            unidadOriginal: unidadRaw,
            unidadKey: normalizarUnidad(unidadRaw),
            unidadLabel: formatearUnidad(unidadRaw),

            personaKey: construirClavePersona(dniRaw, nombresRaw),
            personaNombre: String(nombresRaw || "").trim(),

            fecha: fechaRaw
        };
    });
}

function normalizarRegistrosJustificaciones(registros) {
    return registros.map((r) => {
        const unidadRaw = r.unidad || r["UNIDAD ORGANICA"] || r["UNIDAD ORGÁNICA"] || "";
        const nombresRaw = r["APELLIDOS Y NOMBRES"] || r["APELLIDOS Y NOMBRES "] || "";
        const dniRaw = r.DNI || r.dni || "";
        const fechaInicioRaw = r["FECHA INICIO"] || r["FECHA_INICIO"] || "";
        const fechaFinRaw = r["FECHA FIN"] || r["FECHA_FIN"] || "";

        return {
            ...r,
            unidadOriginal: unidadRaw,
            unidadKey: normalizarUnidad(unidadRaw),
            unidadLabel: formatearUnidad(unidadRaw),

            personaKey: construirClavePersona(dniRaw, nombresRaw),
            personaNombre: String(nombresRaw || "").trim(),

            fechaInicio: fechaInicioRaw,
            fechaFin: fechaFinRaw
        };
    });
}

function construirClavePersona(dni, nombres) {
    const dniLimpio = String(dni ?? "").trim();
    if (dniLimpio) return `DNI:${dniLimpio}`;

    const nombreLimpio = normalizarTexto(nombres);
    if (nombreLimpio) return `NOMBRE:${nombreLimpio}`;

    return `SIN_IDENTIDAD:${Math.random().toString(36).slice(2, 10)}`;
}


// =====================================================
// 📊 KPI
// =====================================================
function renderizarKPIs(faltas, justificaciones) {
    const totalFaltas = faltas.length;
    const totalJustificaciones = justificaciones.length;

    const personasFaltas = contarPersonasUnicas(faltas);
    const personasJustificaciones = contarPersonasUnicas(justificaciones);

    const reincidentesFaltas = contarReincidentes(faltas, 2);
    const reincidentesJustificaciones = contarReincidentes(justificaciones, 3);

    dom.kpiFaltas.textContent = formatearNumero(totalFaltas);
    dom.kpiJustificaciones.textContent = formatearNumero(totalJustificaciones);
    dom.kpiPersonas.innerHTML = `F ${formatearNumero(personasFaltas)} - J ${formatearNumero(personasJustificaciones)}`;
    dom.kpiReincidentesJustificaciones.textContent = formatearNumero(reincidentesJustificaciones);
    dom.kpiReincidentesFaltas.textContent = formatearNumero(reincidentesFaltas);
}

function contarPersonasUnicas(registros) {
    return new Set(
        registros
            .map(r => r.personaKey)
            .filter(Boolean)
    ).size;
}

function contarReincidentes(registros, minimo) {
    const conteo = new Map();

    registros.forEach(r => {
        if (!r.personaKey) return;
        conteo.set(r.personaKey, (conteo.get(r.personaKey) || 0) + 1);
    });

    return [...conteo.values()].filter(cantidad => cantidad >= minimo).length;
}


// =====================================================
// 📊 GRÁFICO 1 - BARRAS HORIZONTALES POR SUBGERENCIA
// =====================================================
function renderizarGraficoSubgerencia(faltas, justificaciones) {

    const resumen = construirResumenPorUnidad(faltas, justificaciones);

    // 🔥 ORDENAR DE MAYOR A MENOR
    resumen.sort((a, b) => (b.totalFaltas + b.totalJustificaciones) - (a.totalFaltas + a.totalJustificaciones));

    const labels = resumen.map(item => item.label);
    const dataFaltas = resumen.map(item => item.totalFaltas);
    const dataJustificaciones = resumen.map(item => item.totalJustificaciones);

    ajustarAlturaCanvas(dom.chartSubgerencia, Math.max(labels.length, 4), "horizontal");

    destruirChart("subgerencia");

    estado.charts.subgerencia = new Chart(dom.chartSubgerencia, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Faltas",
                    data: dataFaltas,
                    backgroundColor: COLORES.faltas,
                    borderColor: COLORES.faltasBorde,
                    borderWidth: 1,
                    borderRadius: 6,
                    barThickness: 28
                },
                {
                    label: "Justificaciones",
                    data: dataJustificaciones,
                    backgroundColor: COLORES.justificaciones,
                    borderColor: COLORES.justificacionesBorde,
                    borderWidth: 1,
                    borderRadius: 6,
                    barThickness: 28
                }
            ]
        },
        options: obtenerOpcionesBase({

            indexAxis: "y", // 🔥 EJE INVERTIDO

            mostrarLeyenda: true,

            datalabels: {
                anchor: "end",
                align: "right",
                color: COLORES.texto,
                font: { weight: "bold", size: 11 },
                formatter: (value) => formatearNumero(value)
            },

            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: COLORES.texto,
                        precision: 0,
                        callback: (value) => formatearNumero(value)
                    },
                    grid: {
                        color: COLORES.grid
                    }
                },
                y: {
                    ticks: {
                        color: COLORES.texto,
                        font: { size: 12 }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        })
    });
}

// =====================================================
// 📊 GRÁFICO 2 - REINCIDENTES POR SUBGERENCIA
// =====================================================
function renderizarGraficoReincidentes(faltas, justificaciones) {
    const resumen = construirResumenPorUnidad(faltas, justificaciones);

    const labels = resumen.map(item => item.label);
    const dataReincFaltas = resumen.map(item => item.reincidentesFaltas);
    const dataReincJust = resumen.map(item => item.reincidentesJustificaciones);

    ajustarAlturaCanvas(dom.chartReincidentes, Math.max(labels.length, 4), "horizontal");

    destruirChart("reincidentes");

    estado.charts.reincidentes = new Chart(dom.chartReincidentes, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Reincidentes Faltas (>=2)",
                    data: dataReincFaltas,
                    backgroundColor: COLORES.reincFaltas,
                    borderColor: COLORES.faltasBorde,
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: "Reincidentes Justificaciones (>=3)",
                    data: dataReincJust,
                    backgroundColor: COLORES.reincJust,
                    borderColor: COLORES.justificacionesBorde,
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: obtenerOpcionesBase({
            indexAxis: "y",
            mostrarLeyenda: true,
            datalabels: {
                anchor: "end",
                align: "right",
                color: COLORES.texto,
                font: { weight: "bold", size: 11 },
                formatter: (value) => formatearNumero(value)
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: COLORES.texto,
                        precision: 0,
                        callback: (value) => formatearNumero(value)
                    },
                    grid: {
                        color: COLORES.grid
                    }
                },
                y: {
                    ticks: {
                        color: COLORES.texto,
                        font: { size: 11 }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        })
    });
}


// =====================================================
// 📊 GRÁFICO 3 - PERSONAS ÚNICAS POR SUBGERENCIA
// =====================================================
function renderizarGraficoPersonasUnicas(faltas, justificaciones) {
    const resumen = construirResumenPorUnidad(faltas, justificaciones);

    const labels = resumen.map(item => item.label);
    const dataPersonasFaltas = resumen.map(item => item.personasFaltas);
    const dataPersonasJust = resumen.map(item => item.personasJustificaciones);

    ajustarAlturaCanvas(dom.chartPersonasUnicas, Math.max(labels.length, 4), "horizontal");

    destruirChart("personasUnicas");

    estado.charts.personasUnicas = new Chart(dom.chartPersonasUnicas, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Personas con Faltas",
                    data: dataPersonasFaltas,
                    backgroundColor: COLORES.personasFaltas,
                    borderColor: COLORES.faltasBorde,
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: "Personas con Justificaciones",
                    data: dataPersonasJust,
                    backgroundColor: COLORES.personasJust,
                    borderColor: COLORES.justificacionesBorde,
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: obtenerOpcionesBase({
            indexAxis: "y",
            mostrarLeyenda: true,
            datalabels: {
                anchor: "end",
                align: "right",
                color: COLORES.texto,
                font: { weight: "bold", size: 11 },
                formatter: (value) => formatearNumero(value)
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: COLORES.texto,
                        precision: 0,
                        callback: (value) => formatearNumero(value)
                    },
                    grid: {
                        color: COLORES.grid
                    }
                },
                y: {
                    ticks: {
                        color: COLORES.texto,
                        font: { size: 11 }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        })
    });
}


// =====================================================
// 📈 GRÁFICO 4 - COMPARACIÓN DE MESES
// =====================================================
async function renderizarGraficoMesesComparativo() {
    const meses = [...estado.mesesMap.values()].sort((a, b) => {
        const ia = INDICE_MES[a.key] ?? 99;
        const ib = INDICE_MES[b.key] ?? 99;
        return ia - ib;
    });

    const resultados = await Promise.all(
        meses.map(async (mes) => {
            const [faltas, justificaciones] = await Promise.all([
                mes.faltasId ? obtenerRegistrosFaltasPorMes(mes.faltasId) : Promise.resolve([]),
                mes.justificacionesId ? obtenerRegistrosPorMes(mes.justificacionesId) : Promise.resolve([])
            ]);

            return {
                label: formatearMesLabel(mes.key),
                totalFaltas: faltas.length,
                totalJustificaciones: justificaciones.length
            };
        })
    );

    const labels = resultados.map(item => item.label);
    const dataFaltas = resultados.map(item => item.totalFaltas);
    const dataJustificaciones = resultados.map(item => item.totalJustificaciones);

    ajustarAlturaCanvas(dom.chartMeses, Math.max(labels.length, 6), "linea");

    destruirChart("meses");

    estado.charts.meses = new Chart(dom.chartMeses, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Faltas",
                    data: dataFaltas,
                    borderColor: COLORES.faltas,
                    backgroundColor: COLORES.faltas,
                    pointBackgroundColor: COLORES.faltas,
                    pointBorderColor: COLORES.faltas,
                    pointRadius: 4,
                    tension: 0.25,
                    fill: false
                },
                {
                    label: "Justificaciones",
                    data: dataJustificaciones,
                    borderColor: COLORES.justificaciones,
                    backgroundColor: COLORES.justificaciones,
                    pointBackgroundColor: COLORES.justificaciones,
                    pointBorderColor: COLORES.justificaciones,
                    pointRadius: 4,
                    tension: 0.25,
                    fill: false
                }
            ]
        },
        options: obtenerOpcionesBase({
            indexAxis: "x",
            mostrarLeyenda: true,
            datalabels: {
                align: "top",
                anchor: "end",
                color: COLORES.texto,
                font: { weight: "bold", size: 11 },
                formatter: (value) => formatearNumero(value)
            },
            scales: {
                x: {
                    ticks: {
                        color: COLORES.texto,
                        autoSkip: false,
                        maxRotation: 0,
                        font: { size: 11 }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: COLORES.texto,
                        precision: 0,
                        callback: (value) => formatearNumero(value)
                    },
                    grid: {
                        color: COLORES.grid
                    }
                }
            }
        })
    });
}


// =====================================================
// 🧮 RESÚMENES POR SUBGERENCIA
// =====================================================
function construirResumenPorUnidad(faltas, justificaciones) {
    const mapa = new Map();

    const asegurarUnidad = (unidadKey, unidadLabel) => {
        if (!mapa.has(unidadKey)) {
            mapa.set(unidadKey, {
                key: unidadKey,
                label: unidadLabel || "SIN UNIDAD",

                totalFaltas: 0,
                totalJustificaciones: 0,

                personasSetFaltas: new Set(),
                personasSetJustificaciones: new Set(),

                conteoPersonaFaltas: new Map(),
                conteoPersonaJustificaciones: new Map(),

                reincidentesFaltas: 0,
                reincidentesJustificaciones: 0,
                personasFaltas: 0,
                personasJustificaciones: 0
            });
        }

        return mapa.get(unidadKey);
    };

    faltas.forEach(registro => {
        const unidadKey = registro.unidadKey || "SIN UNIDAD";
        const unidadLabel = registro.unidadLabel || "SIN UNIDAD";
        const item = asegurarUnidad(unidadKey, unidadLabel);

        item.totalFaltas += 1;

        if (registro.personaKey) {
            item.personasSetFaltas.add(registro.personaKey);
            item.conteoPersonaFaltas.set(
                registro.personaKey,
                (item.conteoPersonaFaltas.get(registro.personaKey) || 0) + 1
            );
        }
    });

    justificaciones.forEach(registro => {
        const unidadKey = registro.unidadKey || "SIN UNIDAD";
        const unidadLabel = registro.unidadLabel || "SIN UNIDAD";
        const item = asegurarUnidad(unidadKey, unidadLabel);

        item.totalJustificaciones += 1;

        if (registro.personaKey) {
            item.personasSetJustificaciones.add(registro.personaKey);
            item.conteoPersonaJustificaciones.set(
                registro.personaKey,
                (item.conteoPersonaJustificaciones.get(registro.personaKey) || 0) + 1
            );
        }
    });

    const resumen = [...mapa.values()].map(item => {
        item.personasFaltas = item.personasSetFaltas.size;
        item.personasJustificaciones = item.personasSetJustificaciones.size;

        item.reincidentesFaltas =
            [...item.conteoPersonaFaltas.values()].filter(c => c >= 2).length;

        item.reincidentesJustificaciones =
            [...item.conteoPersonaJustificaciones.values()].filter(c => c >= 3).length;

        return item;
    });

    resumen.sort((a, b) => {
        const totalA = a.totalFaltas + a.totalJustificaciones;
        const totalB = b.totalFaltas + b.totalJustificaciones;
        return totalB - totalA || a.label.localeCompare(b.label, "es");
    });

    return resumen;
}


// =====================================================
// ⚙️ OPCIONES BASE DE CHART.JS
// =====================================================
function obtenerOpcionesBase({
    indexAxis = "x",
    mostrarLeyenda = true,
    datalabels = {},
    scales = {}
} = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis,
        interaction: {
            mode: "nearest",
            intersect: false
        },
        plugins: {
            legend: {
                display: mostrarLeyenda,
                position: "top",
                labels: {
                    color: COLORES.texto,
                    boxWidth: 14,
                    boxHeight: 14,
                    font: {
                        size: 12,
                        weight: "600"
                    }
                }
            },
            tooltip: {
                backgroundColor: "#1f2937",
                titleColor: "#ffffff",
                bodyColor: "#ffffff",
                cornerRadius: 8,
                callbacks: {
                    label: (context) => {
    const label = context.dataset.label || "";

    let value = 0;

                        if (context.parsed && typeof context.parsed.y !== "undefined") {
                            value = context.parsed.y; // 🔥 CORRECTO PARA LINE Y BAR
                        } else if (typeof context.raw !== "undefined") {
                            value = context.raw;
                        }

                        return `${label}: ${formatearNumero(value)}`;
                    }
                }
            },
            datalabels
        },
        layout: {
            padding: {
                top: 10,
                right: 16,
                bottom: 8,
                left: 8
            }
        },
        scales
    };
}


// =====================================================
// 📏 ALTURA DINÁMICA DE CANVAS
// =====================================================
function ajustarAlturaCanvas(canvas, cantidadEtiquetas, tipo = "linea") {
    if (!canvas) return;

    canvas.style.maxHeight = "none";

    if (tipo === "horizontal") {
        const altura = Math.max(220, cantidadEtiquetas * 42);
        canvas.height = altura;
        canvas.style.height = `${altura}px`;
        return;
    }

    const altura = cantidadEtiquetas > 10 ? 420 : 320;
    canvas.height = altura;
    canvas.style.height = `${altura}px`;
}


// =====================================================
// 🧹 DESTRUIR CHARTS
// =====================================================
function destruirChart(nombre) {
    if (estado.charts[nombre]) {
        estado.charts[nombre].destroy();
        estado.charts[nombre] = null;
    }
}


// =====================================================
// 🚨 ESTADOS DE ERROR / SIN DATOS
// =====================================================
function mostrarEstadoSinDatos() {
    dom.kpiFaltas.textContent = "0";
    dom.kpiJustificaciones.textContent = "0";
    dom.kpiPersonas.textContent = "F 0 | J 0";
    dom.kpiReincidentesJustificaciones.textContent = "0";
    dom.kpiReincidentesFaltas.textContent = "0";

    destruirChart("subgerencia");
    destruirChart("reincidentes");
    destruirChart("personasUnicas");
    destruirChart("meses");
}

function mostrarEstadoError() {
    dom.kpiFaltas.textContent = "-";
    dom.kpiJustificaciones.textContent = "-";
    dom.kpiPersonas.textContent = "-";
    dom.kpiReincidentesJustificaciones.textContent = "-";
    dom.kpiReincidentesFaltas.textContent = "-";

    destruirChart("subgerencia");
    destruirChart("reincidentes");
    destruirChart("personasUnicas");
    destruirChart("meses");
}

// =====================================================
// 🔓 LOGOUT
// =====================================================
document.addEventListener("DOMContentLoaded", () => {

    const btnLogout = document.getElementById("btnLogout");

    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {

            await signOut(auth);

            window.location.href = "loging/loging.html";
        });
    }

});
