// =====================================================
// 📊 DASHBOARD.JS - SISTEMA COMPLETO PROFESIONAL
// Listo para producción
// Compatible con tu HTML actual
// =====================================================

import { obtenerRegistrosPorUnidad } from "../../backend/api.js";


// =====================================================
// 🌍 ESTADO GLOBAL
// =====================================================
const estado = {
    data: [],
    charts: {
        dias: null,
        personas: null,
        motivos: null,
        tipos: null,
        comentarios: null
    }
};


// =====================================================
// 🎨 PALETA PROFESIONAL
// Escala similar a la imagen: marrón → oliva/verde
// =====================================================
const PALETA_PRO = [
    "#7C3F1D", "#8A4A22", "#975628", "#A5622E",
    "#B26E34", "#BE7A3A", "#B4873D", "#A99440",
    "#9EA043", "#939F47", "#88994A", "#7D934D",
    "#728D4F", "#678652", "#5D8054", "#547955",
    "#4B7255", "#446B54", "#3D6452", "#375D50",
    "#31564D", "#2C4F49", "#284845", "#244141"
];


// =====================================================
// 🚀 INICIALIZACIÓN
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
    const selectMes = document.getElementById("filtroMes");
    const selectUnidad = document.getElementById("filtroUnidad");

    if (!selectMes || !selectUnidad) {
        console.error("❌ No se encontraron filtroMes o filtroUnidad.");
        return;
    }

    // Si cambia el mes, limpiamos para esperar nueva subgerencia válida
    selectMes.addEventListener("change", () => {
        limpiarDashboard();
    });

    // Cuando cambie subgerencia, recién aplicamos filtros
    selectUnidad.addEventListener("change", aplicarFiltros);

    crearBuscadorTabla();
    prepararContenedoresGraficosPie();
    limpiarDashboard();
});


// =====================================================
// 🎯 FUNCIÓN PRINCIPAL
// =====================================================
async function aplicarFiltros() {
    const mes = obtenerValorSeguro("filtroMes");
    const unidad = obtenerValorSeguro("filtroUnidad");

    // No mostrar nada hasta tener ambos seleccionados
    if (!mes || !unidad || unidad === "Seleccione") {
        limpiarDashboard();
        return;
    }

    try {
        const data = await obtenerRegistrosPorUnidad(mes, unidad);

        if (!Array.isArray(data) || data.length === 0) {
            limpiarDashboard();
            return;
        }

        estado.data = data;

        actualizarKPIs(data);
        renderGraficoDias(data, mes);
        renderGraficoPersonas(data);
        renderGraficoMotivos(data);
        renderGraficoTipos(data);
        renderGraficoComentarios(data);
        renderTabla(data);
    } catch (error) {
        console.error("❌ Error cargando dashboard:", error);
        limpiarDashboard();
    }
}


// =====================================================
// 📊 KPIS PRINCIPALES
// =====================================================
function actualizarKPIs(data) {
    // -------------------------------
    // Total de papeletas
    // -------------------------------
    setTexto("kpiTotal", data.length);

    // -------------------------------
    // Personas sancionadas (DNI únicos)
    // -------------------------------
    const personas = new Set();

        data.forEach(item => {

            let dni = String(getField(item, ["DNI", "N° DNI", "DOCUMENTO", "NUMERO DNI"]) || "")
                .trim()
                .replace(/\s+/g, "");

            let nombre = String(getField(item, ["APELLIDOS Y NOMBRES", "NOMBRE"]) || "")
                .trim()
                .toUpperCase();

            // 🔥 MISMA LÓGICA QUE REINCIDENTES
            let key = dni ? `DNI_${dni}` : `NOMBRE_${nombre}`;

            if (!dni && !nombre) return;

            personas.add(key);
        });

        setTexto("kpiPersonas", personas.size);

    

    // -------------------------------
    // Motivo más frecuente
    // -------------------------------
    const conteoMotivos = contarPorCampo(data, ["MOTIVO PAPELETA"]);
    const topMotivo = obtenerTop(conteoMotivos);

    setTexto(
        "kpiUnidad",
        topMotivo.key ? `${topMotivo.key} (${topMotivo.value})` : "-"
    );

    // -------------------------------
    // Reincidentes críticos (> 3)
    // -------------------------------
    const conteoPersonas = {};

        data.forEach(item => {

            let dni = String(getField(item, ["DNI"]) || "")
                .trim()
                .replace(/\s+/g, "");

            let nombre = String(getField(item, ["APELLIDOS Y NOMBRES", "NOMBRE"]) || "")
                .trim()
                .toUpperCase();

            // 🔥 CLAVE INTELIGENTE
            let key = dni ? `DNI_${dni}` : `NOMBRE_${nombre}`;

            if (!nombre && !dni) return;

            conteoPersonas[key] = (conteoPersonas[key] || 0) + 1;
        });

        // 🔥 REINCIDENTES REALES
        const reincidentesCriticos = Object.values(conteoPersonas)
            .filter(v => v >= 3)
            .length;

        setTexto("kpiReincidentes", reincidentesCriticos);

            
        }


// =====================================================
// 📈 GRÁFICO 1 - TENDENCIA POR DÍA
// Barras verticales
// =====================================================
function renderGraficoDias(data, mesTexto) {
    const canvas = document.getElementById("graficoDias");
    if (!canvas || canvas.tagName !== "CANVAS") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mesNumero = obtenerNumeroMes(mesTexto);

    const dias = {};

    data.forEach(item => {
        const fecha = normalizarFecha(getField(item, ["FECHA INICIO"]));
        if (!fecha) return;

        const partes = fecha.split("/");
        if (partes.length !== 3) return;

        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10);

        if (mes !== mesNumero || Number.isNaN(dia)) return;

        dias[dia] = (dias[dia] || 0) + 1;
    });

    const diasOrdenados = Object.keys(dias)
        .map(Number)
        .sort((a, b) => a - b);

    const labels = diasOrdenados.map(String);
    const valores = diasOrdenados.map(d => dias[d]);
    const colores = generarColoresPorValor(valores);

    destruirChart("dias");

    estado.charts.dias = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Papeletas por día",
                data: valores,
                backgroundColor: colores,
                borderColor: colores,
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
                barThickness: "flex",
                maxBarThickness: 36
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            normalized: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        boxWidth: 14,
                        color: "#374151",
                        font: { size: 12, weight: "600" }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.raw} papeleta(s)`
                    }
                },
                datalabels: {
                    color: "#4b5563",
                    anchor: "end",
                    align: "top",
                    offset: 2,
                    clamp: true,
                    font: { weight: "bold", size: 11 },
                    formatter: (v) => v
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Días del mes",
                        color: "#374151",
                        font: { size: 12, weight: "700" }
                    },
                    ticks: {
                        color: "#4b5563",
                        maxRotation: 0,
                        autoSkip: true
                    },
                    grid: {
                        color: "rgba(0,0,0,0.06)"
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Cantidad de papeletas",
                        color: "#374151",
                        font: { size: 12, weight: "700" }
                    },
                    ticks: {
                        color: "#4b5563",
                        precision: 0,
                        stepSize: 1
                    },
                    grid: {
                        color: "rgba(0,0,0,0.07)"
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}


// =====================================================
// 📊 GRÁFICO 2 - PERSONAL CON MÁS PAPELETAS
// Barras horizontales
// =====================================================
// =====================================================
// 📊 GRÁFICO 2 - PERSONAL CON MÁS PAPELETAS
// Barras horizontales (DINÁMICO + SCROLL PRO)
// =====================================================
function renderGraficoPersonas(data) {
    const canvas = document.getElementById("personaspapeletas");
    if (!canvas || canvas.tagName !== "CANVAS") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // =====================================================
    // 🧠 CONTAR PAPELETAS POR PERSONA
    // =====================================================
    const conteo = {};

    data.forEach(item => {
        const nombre = getField(item, ["APELLIDOS Y NOMBRES", "NOMBRE"]);
        const nombreFinal = nombre || "SIN NOMBRE";
        conteo[nombreFinal] = (conteo[nombreFinal] || 0) + 1;
    });

    // =====================================================
    // 🔝 FILTRAR SOLO >= 3 Y ORDENAR
    // =====================================================
    const top = Object.entries(conteo)
        .filter(([, cantidad]) => cantidad >= 3)
        .sort((a, b) => b[1] - a[1]);

    // =====================================================
    // 🧼 LIMPIAR CHART ANTERIOR
    // =====================================================
    destruirChart("personas");

    if (top.length === 0) {
        limpiarCanvas("personaspapeletas");
        return;
    }

    // =====================================================
    // 📏 ALTURA DINÁMICA PROFESIONAL
    // =====================================================
    const cantidad = top.length;

    // 🔥 altura base + crecimiento por filas
    const altura = Math.max(300, cantidad * 28);

    // 🔥 límite máximo para no romper layout
    const alturaFinal = cantidad * 32;
    const contenedor = canvas.parentElement;

    if (contenedor) {
        contenedor.style.height = `${alturaFinal}px`;
        canvas.style.height = `${alturaFinal}px`; // 🔥 CLAVE

        contenedor.style.overflowY = cantidad > 25 ? "auto" : "visible";
    }

    // =====================================================
    // 📊 DATASETS
    // =====================================================
    const labels = top.map(([nombre]) => nombre);
    const valores = top.map(([, cantidad]) => cantidad);
    const colores = generarColoresPorValor(valores);

    // =====================================================
    // 🚀 CREAR GRÁFICO
    // =====================================================
    estado.charts.personas = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Cantidad de papeletas",
                data: valores,
                backgroundColor: colores,
                borderColor: colores,
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 22
            }]
        },
        options: {
            responsive: true,
            
            maintainAspectRatio: false,
            animation: false,
            indexAxis: "y", // 👉 horizontal
            normalized: true,

            plugins: {
                legend: {
                    display: true,
                    labels: {
                        boxWidth: 14,
                        color: "#374151",
                        font: { size: 12, weight: "600" }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.raw} papeleta(s)`
                    }
                },
                datalabels: {
                    color: "#374151",
                    anchor: "end",
                    align: "right",
                    offset: 4,
                    clamp: true,
                    font: { weight: "bold", size: 11 },
                    formatter: (v) => v
                }
            },

            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Cantidad de papeletas",
                        color: "#374151",
                        font: { size: 12, weight: "700" }
                    },
                    ticks: {
                        color: "#4b5563",
                        precision: 0,
                        stepSize: 1
                    },
                    grid: {
                        color: "rgba(0,0,0,0.07)"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Personal",
                        color: "#374151",
                        font: { size: 12, weight: "700" }
                    },
                    ticks: {
                        color: "#4b5563",
                        font: { size: 11 }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}


// =====================================================
// 🥧 GRÁFICO 3 - MOTIVOS
// Torta con cantidad + porcentaje
// =====================================================

function renderGraficoMotivos(data) {
    const canvas = document.getElementById("motivospapeletas");
    if (!canvas || canvas.tagName !== "CANVAS") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // =====================================================
    // 🧠 CONTAR MOTIVOS
    // =====================================================
    const conteo = {};

    data.forEach(item => {
        let motivo = getField(item, ["MOTIVO PAPELETA"]);

        motivo = String(motivo || "")
            .trim()
            .toUpperCase();

        if (!motivo) return;

        conteo[motivo] = (conteo[motivo] || 0) + 1;
    });

    // =====================================================
    // 🔝 ORDENAR DE MAYOR A MENOR
    // =====================================================
    const top = Object.entries(conteo)
        .sort((a, b) => b[1] - a[1]);

    destruirChart("motivos");

    if (top.length === 0) {
        limpiarCanvas("motivospapeletas");
        return;
    }

    // =====================================================
    // 📏 ALTURA DINÁMICA (PRO)
    // =====================================================
    const cantidad = top.length;
    const altura = Math.max(300, cantidad * 30);

    const contenedor = canvas.parentElement;
    if (contenedor) {
        contenedor.style.height = `${altura}px`;
        canvas.style.height = `${altura}px`;
        contenedor.style.overflowY = cantidad > 20 ? "auto" : "visible";
    }

    // =====================================================
    // 📊 DATA
    // =====================================================
    const labels = top.map(([motivo]) => motivo);
    const valores = top.map(([, cantidad]) => cantidad);
    const colores = generarColoresPorValor(valores);

    // =====================================================
    // 🚀 GRÁFICO
    // =====================================================
    estado.charts.motivos = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Cantidad de papeletas",
                data: valores,
                backgroundColor: colores,
                borderColor: colores,
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 22
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            indexAxis: "y", // 🔥 horizontal

            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: "#374151",
                        font: { size: 12, weight: "600" }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.raw} papeleta(s)`
                    }
                },
                datalabels: {
                    color: "#374151",
                    anchor: "end",
                    align: "right",
                    font: { weight: "bold", size: 11 },
                    formatter: (v) => v
                }
            },

            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        stepSize: 1,
                        color: "#4b5563"
                    },
                    grid: {
                        color: "rgba(0,0,0,0.07)"
                    }
                },
                y: {
                    ticks: {
                        color: "#374151",
                        font: { size: 11 }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

// =====================================================
// 🥧 GRÁFICO 4 - TIPO DE PAPELETA
// Convierte el UL en canvas visual sin tocar tu HTML
// =====================================================
function renderGraficoTipos(data) {
    renderPieChart({
        chartKey: "tipos",
        targetId: "tipopapeletas",
        title: "Tipo de papeleta",
        sourceData: data,
        fieldNames: ["TIPO PAPELETA"]
    });
}


// =====================================================
// 🥧 GRÁFICO 5 - COMENTARIOS / OBSERVACIONES
// Usa OBSERVACION según tu DB
// =====================================================
function renderGraficoComentarios(data) {
    renderPieChart({
        chartKey: "comentarios",
        targetId: "comentarios",
        title: "Observaciones",
        sourceData: data,
        fieldNames: ["ONSERVACION", "ONSERVACION"]
    });
}


// =====================================================
// 🧠 RENDER PIE GENÉRICO
// Funciona tanto si el target es canvas como si es ul
// =====================================================
function renderPieChart({ chartKey, targetId, title, sourceData, fieldNames }) {
    const conteo = contarPorCampo(sourceData, fieldNames);

    destruirChart(chartKey);

    const labels = Object.keys(conteo);
    const valores = Object.values(conteo);

    if (labels.length === 0) {
        limpiarTargetGrafico(targetId);
        return;
    }

    const canvas = obtenerCanvasDesdeTarget(targetId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const total = valores.reduce((a, b) => a + b, 0);
    const colores = obtenerPaletaCircular(labels.length);

    estado.charts[chartKey] = new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [{
                label: title,
                data: valores,
                backgroundColor: colores,
                borderColor: "#ffffff",
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            normalized: true,
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: {
                        color: "#374151",
                        boxWidth: 12,
                        boxHeight: 12,
                        padding: 14,
                        font: { size: 11, weight: "600" },
                        generateLabels(chart) {
                            const data = chart.data;
                            if (!data.labels?.length) return [];

                            return data.labels.map((label, i) => {
                                const value = data.datasets[0].data[i];
                                const percent = total ? ((value / total) * 100).toFixed(1) : "0.0";
                                return {
                                    text: `${label}: ${value} (${percent}%)`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].backgroundColor[i],
                                    lineWidth: 1,
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const value = ctx.raw || 0;
                            const percent = total ? ((value / total) * 100).toFixed(1) : "0.0";
                            return ` ${ctx.label}: ${value} (${percent}%)`;
                        }
                    }
                },
                datalabels: {
                    color: "#ffffff",
                    font: { weight: "bold", size: 11 },
                    formatter: (value) => {
                        const percent = total ? ((value / total) * 100).toFixed(1) : "0.0";
                        return `${value}\n${percent}%`;
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}


// =====================================================
// 📋 TABLA DETALLADA
// 15 registros + scroll
// =====================================================
function renderTabla(data) {
    const tbody = document.querySelector("#tablaPapeletas tbody");
    const contenedor = document.querySelector(".table-responsive");

    if (!tbody || !contenedor) return;

    tbody.innerHTML = "";

    const registros = data.slice(0, 500);

    registros.forEach(item => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${escapeHtml(getField(item, ["DNI"]))}</td>
            <td>${escapeHtml(getField(item, ["APELLIDOS Y NOMBRES", "NOMBRE"]))}</td>
            <td>${escapeHtml(getField(item, ["UNIDAD ORGANICA", "UNIDAD"]))}</td>
            <td>${escapeHtml(getField(item, ["TIPO PAPELETA"]))}</td>
            <td>${escapeHtml(normalizarFecha(getField(item, ["FECHA INICIO"])))}</td>
            <td>${escapeHtml(getField(item, ["MOTIVO PAPELETA"]))}</td>
        `;

        tbody.appendChild(tr);
    });

    contenedor.style.maxHeight = "420px";
    contenedor.style.overflowY = "auto";
}


// =====================================================
// 🔍 BUSCADOR POR DNI / NOMBRE
// =====================================================
function crearBuscadorTabla() {
    const header = document.querySelector(".panel-tabla .panel__header");
    if (!header) return;

    const yaExiste = document.getElementById("busquedaTabla");
    if (yaExiste) return;

    const input = document.createElement("input");
    input.id = "busquedaTabla";
    input.type = "text";
    input.placeholder = "Buscar por DNI o nombre...";
    input.className = "input-busqueda";
    input.style.marginTop = "12px";
    input.style.width = "100%";
    input.style.maxWidth = "340px";
    input.style.height = "42px";
    input.style.padding = "0 14px";
    input.style.border = "1px solid #d1d5db";
    input.style.borderRadius = "10px";
    input.style.outline = "none";
    input.style.fontSize = "0.95rem";

    header.appendChild(input);
    // ===============================
    // 📅 NUEVO INPUT FECHA
    // ===============================
    const inputFecha = document.createElement("input");
    inputFecha.id = "busquedaFecha";
    inputFecha.type = "text";
    inputFecha.placeholder = "Filtrar por fecha (dd/mm/aaaa)";
    inputFecha.className = "input-busqueda";

    inputFecha.style.marginTop = "12px";
    inputFecha.style.marginLeft = "10px";
    inputFecha.style.width = "100%";
    inputFecha.style.maxWidth = "260px";
    inputFecha.style.height = "42px";
    inputFecha.style.padding = "0 14px";
    inputFecha.style.border = "1px solid #d1d5db";
    inputFecha.style.borderRadius = "10px";
    inputFecha.style.outline = "none";
    inputFecha.style.fontSize = "0.95rem";

    header.appendChild(inputFecha);

    function aplicarFiltroTabla() {
        const texto = input.value.trim().toLowerCase();
        const fechaFiltro = inputFecha.value.trim().toLowerCase();

        if (!texto && !fechaFiltro) {
            renderTabla(estado.data);
            return;
        }

        const filtrados = estado.data.filter(item => {
            const nombre = String(getField(item, ["APELLIDOS Y NOMBRES", "NOMBRE"])).toLowerCase();
            const dni = String(getField(item, ["DNI"])).toLowerCase();
            const fecha = normalizarFecha(getField(item, ["FECHA INICIO"])).toLowerCase();

            const cumpleTexto =
                !texto || nombre.includes(texto) || dni.includes(texto);

            const cumpleFecha =
                !fechaFiltro || fecha.includes(fechaFiltro);

            return cumpleTexto && cumpleFecha;
        });

        renderTabla(filtrados);
    }

    // Eventos combinados
    input.addEventListener("input", aplicarFiltroTabla);
    inputFecha.addEventListener("input", aplicarFiltroTabla);
}


// =====================================================
// 🧠 PREPARAR CONTENEDORES DE PIE
// Si tipopapeletas o comentarios son UL, se ocultan
// y se agrega un canvas dentro del mismo panel
// =====================================================
function prepararContenedoresGraficosPie() {
    ["tipopapeletas", "comentarios"].forEach(id => {
        obtenerCanvasDesdeTarget(id);
    });
}


// =====================================================
// 🧠 OBTENER CANVAS DESDE TARGET
// Si target es canvas, lo usa.
// Si target no es canvas, crea uno y oculta el original.
// =====================================================
function obtenerCanvasDesdeTarget(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return null;

    if (target.tagName === "CANVAS") return target;

    const parent = target.parentElement;
    if (!parent) return null;

    let canvas = parent.querySelector(`canvas[data-source-target="${targetId}"]`);

    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.dataset.sourceTarget = targetId;
        canvas.style.width = "100%";
        canvas.style.height = "320px";
        canvas.style.display = "block";
        canvas.style.maxHeight = "320px";
        parent.appendChild(canvas);
    }

    target.style.display = "none";
    return canvas;
}


// =====================================================
// 🧠 LIMPIAR TARGET GRÁFICO
// =====================================================
function limpiarTargetGrafico(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    if (target.tagName === "CANVAS") {
        limpiarCanvas(targetId);
        return;
    }

    const parent = target.parentElement;
    const canvas = parent?.querySelector(`canvas[data-source-target="${targetId}"]`);
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}


// =====================================================
// 🧠 CONTAR POR CAMPO
// =====================================================
function contarPorCampo(data, fieldNames) {
    const resultado = {};

    data.forEach(item => {
        let valor = getField(item, fieldNames);

        // 🔥 NORMALIZACIÓN CLAVE
        valor = String(valor || "")
            .trim()
            .replace(/\s+/g, ""); // elimina espacios internos

        if (!valor) return; // evita vacíos

        resultado[valor] = (resultado[valor] || 0) + 1;
    });

    return resultado;
}

// =====================================================
// 🧠 OBTENER TOP
// =====================================================
function obtenerTop(obj) {
    let key = "";
    let value = 0;

    Object.entries(obj).forEach(([k, v]) => {
        if (v > value) {
            key = k;
            value = v;
        }
    });

    return { key, value };
}


// =====================================================
// 🧠 OBTENER VALOR DE CAMPO
// Soporta variaciones de nombres
// =====================================================
function getField(obj, fields) {
    for (const field of fields) {
        if (obj && obj[field] !== undefined && obj[field] !== null) {
            return String(obj[field]).trim();
        }
    }
    return "";
}


// =====================================================
// 📅 NORMALIZAR FECHA
// Soporta string, Firebase Timestamp y número Excel
// =====================================================
function normalizarFecha(valor) {
    if (!valor) return "";

    if (typeof valor === "string") return valor;

    if (typeof valor === "number") {
        const fecha = excelDateToJSDate(valor);
        if (!fecha) return "";
        return `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
    }

    if (typeof valor === "object" && valor.seconds) {
        const fecha = new Date(valor.seconds * 1000);
        return `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
    }

    return "";
}


// =====================================================
// 📅 FECHA EXCEL → JS
// =====================================================
function excelDateToJSDate(serial) {
    if (typeof serial !== "number" || Number.isNaN(serial)) return null;
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    return new Date(utcValue * 1000);
}


// =====================================================
// 📅 MES TEXTO → NÚMERO
// =====================================================
function obtenerNumeroMes(nombreMes) {
    const meses = {
        ENERO: 1,
        FEBRERO: 2,
        MARZO: 3,
        ABRIL: 4,
        MAYO: 5,
        JUNIO: 6,
        JULIO: 7,
        AGOSTO: 8,
        SETIEMBRE: 9,
        SEPTIEMBRE: 9,
        OCTUBRE: 10,
        NOVIEMBRE: 11,
        DICIEMBRE: 12
    };

    return meses[String(nombreMes || "").toUpperCase()] || 1;
}


// =====================================================
// 🎨 COLORES POR VALOR
// Usa escala como tu imagen
// =====================================================
function generarColoresPorValor(valores) {
    if (!valores || valores.length === 0) return [];

    const max = Math.max(...valores);

    return valores.map(v => {
        const ratio = max > 0 ? v / max : 0;

        if (ratio >= 0.95) return "#7C3F1D";
        if (ratio >= 0.85) return "#8A4A22";
        if (ratio >= 0.75) return "#975628";
        if (ratio >= 0.65) return "#A5622E";
        if (ratio >= 0.55) return "#B26E34";
        if (ratio >= 0.48) return "#BE7A3A";
        if (ratio >= 0.41) return "#B4873D";
        if (ratio >= 0.35) return "#A99440";
        if (ratio >= 0.29) return "#9EA043";
        if (ratio >= 0.24) return "#939F47";
        if (ratio >= 0.19) return "#88994A";
        if (ratio >= 0.15) return "#7D934D";
        if (ratio >= 0.11) return "#728D4F";
        if (ratio >= 0.08) return "#678652";
        return "#5D8054";
    });
}


// =====================================================
// 🎨 PALETA CIRCULAR
// Para tortas
// =====================================================
function obtenerPaletaCircular(n) {
    const base = [...PALETA_PRO];
    const colores = [];

    for (let i = 0; i < n; i++) {
        colores.push(base[i % base.length]);
    }

    return colores;
}


// =====================================================
// 🧼 DESTRUIR CHART
// =====================================================
function destruirChart(key) {
    if (estado.charts[key]) {
        estado.charts[key].destroy();
        estado.charts[key] = null;
    }
}


// =====================================================
// 🧼 LIMPIAR CANVAS
// =====================================================
function limpiarCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas || canvas.tagName !== "CANVAS") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
}


// =====================================================
// 🧼 LIMPIAR DASHBOARD
// =====================================================
function limpiarDashboard() {
    setTexto("kpiTotal", 0);
    setTexto("kpiPersonas", 0);
    setTexto("kpiUnidad", "-");
    setTexto("kpiReincidentes", 0);

    estado.data = [];

    Object.keys(estado.charts).forEach(key => destruirChart(key));

    const tbody = document.querySelector("#tablaPapeletas tbody");
    if (tbody) tbody.innerHTML = "";

    limpiarTargetGrafico("tipopapeletas");
    limpiarTargetGrafico("comentarios");
    limpiarCanvas("graficoDias");
    limpiarCanvas("personaspapeletas");
    limpiarCanvas("motivospapeletas");
}


// =====================================================
// 🔧 HELPERS UI
// =====================================================
function setTexto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function obtenerValorSeguro(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
}


// =====================================================
// 🔒 ESCAPE HTML
// =====================================================
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
