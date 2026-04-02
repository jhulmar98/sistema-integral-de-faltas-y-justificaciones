// =====================================================
// 📊 DASHBOARD FALTAS - PRODUCCIÓN FINAL
// =====================================================

import {
    obtenerMesesFaltas,
    obtenerUnidadesFaltas,
    obtenerRegistrosFaltas
} from "../../backend/api.js";


// =====================================================
// 🌍 ESTADO GLOBAL
// =====================================================
let DATA = [];
let DATA_TABLA = [];
let charts = {};
let chartJsPluginsReady = false;


// =====================================================
// 🎨 PALETA TIPO RANKING DE LA IMAGEN
// Marrón -> mostaza -> verde oliva
// =====================================================
const PALETA_RANKING = [
    "#9A572E", "#A86933", "#B27B37", "#B78B3A", "#BC9A46",
    "#C2AA56", "#C6B964", "#B7B45A", "#A8AD56", "#99A653",
    "#8D9E4E", "#83974A", "#7A9046", "#718942", "#69823E",
    "#627B3A", "#5C7336", "#566B32", "#50642E", "#4A5C2A",
    "#445526", "#3F4E22", "#39471E", "#33401A", "#2E3917",
    "#293214", "#242B11", "#20240E", "#1C1E0C", "#18180A",
    "#141308"
];

const COLOR_PRINCIPAL = "#6B8E23";
const COLOR_BORDE = "#556B2F";
const COLOR_PIE_BASE = [
    "#9A572E", "#B27B37", "#C2AA56", "#99A653", "#718942",
    "#566B32", "#3F4E22", "#2E3917"
];

const ORDEN_DIAS_SEMANA = [
    "LUNES", "MARTES", "MIERCOLES", "MIÉRCOLES",
    "JUEVES", "VIERNES", "SABADO", "SÁBADO", "DOMINGO"
];


// =====================================================
// 🚀 INICIO
// =====================================================
init();

async function init() {
    try {
        await asegurarPluginsChart();
        await cargarMeses();
        registrarEventos();
    } catch (error) {
        console.error("Error al iniciar dashboard de faltas:", error);
    }
}


// =====================================================
// 🔌 CARGAR PLUGIN DE ETIQUETAS SI NO EXISTE
// =====================================================
async function asegurarPluginsChart() {
    if (chartJsPluginsReady) return;

    if (window.ChartDataLabels) {
        Chart.register(window.ChartDataLabels);
        chartJsPluginsReady = true;
        return;
    }

    await cargarScript("https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0");
    if (window.ChartDataLabels) {
        Chart.register(window.ChartDataLabels);
    }

    chartJsPluginsReady = true;
}

function cargarScript(src) {
    return new Promise((resolve, reject) => {
        const existente = document.querySelector(`script[src="${src}"]`);
        if (existente) {
            existente.addEventListener("load", resolve, { once: true });
            existente.addEventListener("error", reject, { once: true });
            if (existente.dataset.loaded === "true") resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;

        script.onload = () => {
            script.dataset.loaded = "true";
            resolve();
        };

        script.onerror = reject;
        document.head.appendChild(script);
    });
}


// =====================================================
// 📅 CARGAR MESES
// =====================================================
async function cargarMeses() {
    const selectMes = document.getElementById("selectMes");
    selectMes.innerHTML = `<option value="">Seleccione</option>`;

    const meses = await obtenerMesesFaltas();

    meses.forEach(mes => {
        selectMes.innerHTML += `<option value="${mes}">${capitalizar(mes)}</option>`;
    });
}


// =====================================================
// 🏢 CARGAR UNIDADES
// =====================================================
async function cargarUnidades(mes) {
    const selectUnidad = document.getElementById("selectUnidad");
    selectUnidad.innerHTML = `<option value="">Seleccione</option>`;

    if (!mes) return;

    const unidades = await obtenerUnidadesFaltas(mes);

    unidades.forEach(unidad => {
        selectUnidad.innerHTML += `
            <option value="${unidad}">
                ${formatearUnidad(unidad)}
            </option>
        `;
    });
}


// =====================================================
// 📥 CARGAR DATOS PRINCIPALES
// =====================================================
async function cargarDatos(mes, unidad) {
    try {
        DATA = await obtenerRegistrosFaltas(mes, unidad);
        DATA = normalizarData(DATA);

        DATA_TABLA = [...DATA];

        calcularKPIs();
        renderGraficos();
        renderTabla();
    } catch (error) {
        console.error("Error al cargar datos:", error);
        DATA = [];
        DATA_TABLA = [];
        calcularKPIs();
        destruirCharts();
        renderTabla();
    }
}


// =====================================================
// 🧼 NORMALIZAR DATA
// =====================================================
function normalizarData(data) {
    return data.map(item => {
        const fechaInfo = parsearFecha(item.FECHA || "");
        const nombre = limpiarTexto(item["APELLIDOS Y NOMBRES"]);
        const cargo = limpiarTexto(item.CARGO);
        const diaSemana = normalizarDiaSemana(item.DIA);
        const regimen = limpiarTexto(item["REG. LABORAL"]);
        const sector = item.SECTOR !== undefined && item.SECTOR !== null
            ? String(item.SECTOR).trim()
            : "";

        return {
            ...item,
            FECHA: item.FECHA || "",
            FECHA_ISO: fechaInfo.iso,
            FECHA_OBJ: fechaInfo.date,
            DIA_MES: fechaInfo.day,
            MES_NUM: fechaInfo.month,
            ANIO_NUM: fechaInfo.year,
            DIA: diaSemana,
            "APELLIDOS Y NOMBRES": nombre,
            CARGO: cargo,
            "REG. LABORAL": regimen,
            SECTOR: sector
        };
    });
}


// =====================================================
// 📊 KPIs
// =====================================================
function calcularKPIs() {
    const totalFaltas = DATA.length;

    const personasUnicas = new Set(
        DATA
            .map(item => item["APELLIDOS Y NOMBRES"])
            .filter(Boolean)
    ).size;

    const conteoPersonas = contarPorCampo(DATA, "APELLIDOS Y NOMBRES");
    const reincidentes = Object.values(conteoPersonas).filter(total => total >= 2).length;

    const conteoDiasSemana = contarPorCampo(
        DATA.filter(item => item.DIA),
        "DIA"
    );

    let diaCritico = "-";
    let maximo = 0;

    for (const [dia, valor] of Object.entries(conteoDiasSemana)) {
        if (valor > maximo) {
            maximo = valor;
            diaCritico = dia;
        }
    }

    document.getElementById("kpiTotal").textContent = formatearNumero(totalFaltas);
    document.getElementById("kpiPersonas").textContent = formatearNumero(personasUnicas);
    document.getElementById("kpiReincidentes").textContent = formatearNumero(reincidentes);
    document.getElementById("kpiDia").textContent = diaCritico;
}


// =====================================================
// 📈 RENDER GENERAL DE GRÁFICOS
// =====================================================
function renderGraficos() {
    destruirCharts();

    renderGraficoComportamientoPorDia();
    renderGraficoFaltasPorSector();
    renderGraficoTopPersonas();
    renderGraficoFaltasPorCargo();
    renderGraficoRegimenLaboral();
}


// =====================================================
// 📈 1. COMPORTAMIENTO POR DÍA DEL MES
// Muestra 1..28/29/30/31 según el mes real cargado
// =====================================================
function renderGraficoComportamientoPorDia() {
    const ctx = document.getElementById("chartDias");
    if (!ctx) return;

    const totalDiasMes = obtenerCantidadDiasDelMes(DATA);
    const labels = Array.from({ length: totalDiasMes }, (_, i) => String(i + 1));
    const conteoPorDia = Array(totalDiasMes).fill(0);

    DATA.forEach(item => {
        if (item.DIA_MES >= 1 && item.DIA_MES <= totalDiasMes) {
            conteoPorDia[item.DIA_MES - 1]++;
        }
    });
    // 🔥 ALTURA FIJA SOLO PARA ESTE GRÁFICO
    ctx.parentElement.style.height = "380px";
    
    charts.dias = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Cantidad de faltas",
                data: conteoPorDia,
                backgroundColor: labels.map((_, index) => PALETA_RANKING[index % PALETA_RANKING.length]),
                borderColor: COLOR_BORDE,
                borderWidth: 1
            }]
        },
        options: configurarOpcionesBarra({
            mostrarLegend: true,
            horizontal: false,
            mostrarDataLabels: true,
            mostrarTicksX: true,
            mostrarTicksY: true
        })
    });
}


// =====================================================
// 📊 2. FALTAS POR SECTOR (VERTICAL TIPO RANKING)
// =====================================================
function renderGraficoFaltasPorSector() {
    const ctx = document.getElementById("chartSector");
    if (!ctx) return;

    const conteo = contarPorCampo(DATA, "SECTOR");

    const entries = Object.entries(conteo)
        .filter(([sector]) => sector !== "")
        .sort((a, b) => {
            const na = Number(a[0]);
            const nb = Number(b[0]);

            if (!Number.isNaN(na) && !Number.isNaN(nb)) {
                return na - nb; // 🔥 orden natural (Sector 1,2,3...)
            }

            return a[0].localeCompare(b[0], "es");
        });

    const labels = entries.map(([sector]) => `S${sector}`);
    const valores = entries.map(([, total]) => total);
    // 🔥 ALTURA DINÁMICA
    ajustarAlturaGrafico(ctx, valores.length, false);

    charts.sector = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Faltas por sector",
                data: valores,
                backgroundColor: generarColores(entries.length),
                borderColor: "#ffffff",
                borderWidth: 1,
                borderRadius: 6 // 🔥 efecto moderno
            }]
        },
        options: configurarOpcionesBarra({
            mostrarLegend: true,
            horizontal: false, // 🔥 AQUÍ ESTÁ EL CAMBIO CLAVE
            mostrarDataLabels: true,
            mostrarTicksX: true,
            mostrarTicksY: true
        })
    });
}


// =====================================================
// 📊 3. TOP PERSONAS CON MÁS FALTAS
// Todas las personas con >= 2 faltas
// Estilo ranking horizontal como la imagen
// =====================================================
function renderGraficoTopPersonas() {
    const ctx = document.getElementById("chartPersonas");
    if (!ctx) return;

    const conteo = contarPorCampo(DATA, "APELLIDOS Y NOMBRES");

    const entries = Object.entries(conteo)
        .filter(([nombre, total]) => nombre && total >= 2)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));

    const labels = entries.map(([nombre], index) => `${nombre} ${index + 1}`);
    const valores = entries.map(([, total]) => total);
    // 🔥 ALTURA DINÁMICA (horizontal)
    ajustarAlturaGrafico(ctx, valores.length, true);

    charts.personas = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Personas con 2 o más faltas",
                data: valores,
                backgroundColor: generarColores(entries.length),
                borderColor: "#ffffff",
                borderWidth: 1
            }]
        },
        options: configurarOpcionesBarra({
            mostrarLegend: true,
            horizontal: true,
            mostrarDataLabels: true,
            mostrarTicksX: true,
            mostrarTicksY: true
        })
    });
}


// =====================================================
// 📊 4. FALTAS POR CARGO
// Horizontal como el ranking de la imagen
// =====================================================
function renderGraficoFaltasPorCargo() {
    const ctx = document.getElementById("chartCargo");
    if (!ctx) return;

    const conteo = contarPorCampo(DATA, "CARGO");
    const entries = Object.entries(conteo)
        .filter(([cargo]) => cargo)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    const valores = entries.map(([, total]) => total);
    ajustarAlturaGrafico(ctx, valores.length, true);
    charts.cargo = new Chart(ctx, {
        type: "bar",
        data: {
            labels: entries.map(([cargo]) => cargo),
            datasets: [{
                label: "Cantidad de faltas por cargo",
                data: entries.map(([, total]) => total),
                backgroundColor: generarColores(entries.length),
                borderColor: "#ffffff",
                borderWidth: 1
            }]
        },
        options: configurarOpcionesBarra({
            mostrarLegend: true,
            horizontal: true,
            mostrarDataLabels: true,
            mostrarTicksX: true,
            mostrarTicksY: true
        })
    });
}


// =====================================================
// 📊 5. RÉGIMEN LABORAL (BARRAS VERTICALES)
// Etiquetas visibles + leyenda con número
// =====================================================
function renderGraficoRegimenLaboral() {
    const ctx = document.getElementById("chartRegimen");
    if (!ctx) return;

    const conteo = contarPorCampo(DATA, "REG. LABORAL");

    const entries = Object.entries(conteo)
        .filter(([regimen]) => regimen)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));

    const labels = entries.map(([regimen, valor]) => `${regimen}`);
    const valores = entries.map(([, total]) => total);
    ajustarAlturaGrafico(ctx, valores.length, false);

    charts.regimen = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Régimen laboral",
                data: valores,
                backgroundColor: generarColores(entries.length),
                borderColor: "#ffffff",
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: configurarOpcionesBarra({
            mostrarLegend: true,
            horizontal: false, // 🔥 vertical
            mostrarDataLabels: true,
            mostrarTicksX: true,
            mostrarTicksY: true
        })
    });
}


// =====================================================
// 📋 TABLA
// Filtros afectan solo la tabla
// =====================================================
function renderTabla() {
    const tbody = document.querySelector("#tablaFaltas tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!DATA_TABLA.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;">No hay registros para mostrar.</td>
            </tr>
        `;
        return;
    }

    const filas = DATA_TABLA
        .slice()
        .sort((a, b) => {
            if (a.FECHA_OBJ && b.FECHA_OBJ) return a.FECHA_OBJ - b.FECHA_OBJ;
            return String(a.FECHA).localeCompare(String(b.FECHA), "es");
        })
        .map(item => `
            <tr>
                <td>${escapeHtml(item.FECHA || "")}</td>
                <td>${escapeHtml(item.DIA || "")}</td>
                <td>${escapeHtml(item["APELLIDOS Y NOMBRES"] || "")}</td>
                <td>${escapeHtml(item.CARGO || "")}</td>
                <td>${escapeHtml(item.SECTOR || "")}</td>
                <td>${escapeHtml(item["REG. LABORAL"] || "")}</td>
            </tr>
        `)
        .join("");

    tbody.innerHTML = filas;
}


// =====================================================
// 🔍 FILTROS SOLO TABLA
// texto: DNI o nombre
// fecha: yyyy-mm-dd contra FECHA dd/mm/yyyy
// =====================================================
function aplicarFiltrosTabla() {
    const filtroTexto = (document.getElementById("filtroTexto")?.value || "").trim().toLowerCase();
    const filtroFecha = document.getElementById("filtroFecha")?.value || "";

    DATA_TABLA = DATA.filter(item => {
        const nombre = (item["APELLIDOS Y NOMBRES"] || "").toLowerCase();
        const dni = String(item.DNI || "").toLowerCase();

        const coincideTexto = !filtroTexto ||
            nombre.includes(filtroTexto) ||
            dni.includes(filtroTexto);

        const coincideFecha = !filtroFecha || item.FECHA_ISO === filtroFecha;

        return coincideTexto && coincideFecha;
    });

    renderTabla();
}


// =====================================================
// 🧹 DESTRUIR CHARTS
// =====================================================
function destruirCharts() {
    Object.keys(charts).forEach(key => {
        if (charts[key]) {
            charts[key].destroy();
            charts[key] = null;
        }
    });
}


// =====================================================
// 🎧 EVENTOS
// =====================================================
function registrarEventos() {
    const selectMes = document.getElementById("selectMes");
    const selectUnidad = document.getElementById("selectUnidad");
    const filtroTexto = document.getElementById("filtroTexto");
    const filtroFecha = document.getElementById("filtroFecha");

    if (selectMes) {
        selectMes.addEventListener("change", async event => {
            const mes = event.target.value;
            await cargarUnidades(mes);

            if (selectUnidad) {
                selectUnidad.value = "";
            }

            DATA = [];
            DATA_TABLA = [];
            calcularKPIs();
            destruirCharts();
            renderTabla();
        });
    }

    if (selectUnidad) {
        selectUnidad.addEventListener("change", async event => {
            const mes = selectMes?.value || "";
            const unidad = event.target.value || "";

            if (mes && unidad) {
                await cargarDatos(mes, unidad);
            }
        });
    }

    if (filtroTexto) {
        filtroTexto.addEventListener("input", aplicarFiltrosTabla);
    }

    if (filtroFecha) {
        filtroFecha.addEventListener("change", aplicarFiltrosTabla);
    }
}


// =====================================================
// ⚙️ OPCIONES BASE - BARRAS
// =====================================================
function configurarOpcionesBarra({
    mostrarLegend = true,
    horizontal = false,
    mostrarDataLabels = true,
    mostrarTicksX = true,
    mostrarTicksY = true
} = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? "y" : "x",
        layout: {
            padding: {
                top: 10,
                right: 20,
                bottom: 35,
                left: 10
            }
        },
        plugins: {
            legend: {
                display: mostrarLegend,
                position: "top",
                labels: {
                    boxWidth: 14,
                    color: "#374151",
                    font: { size: 11, weight: "600" }
                }
            },
            tooltip: {
                callbacks: {
                    label: context => `${context.dataset.label || "Valor"}: ${formatearNumero(context.raw)}`
                }
            },
            datalabels: {
                display: mostrarDataLabels,
                anchor: horizontal ? "end" : "end",
                align: horizontal ? "right" : "top",
                offset: horizontal ? 4 : 2,
                color: "#374151",
                font: {
                    size: 11,
                    weight: "700"
                },
                formatter: value => formatearNumero(value),
                clamp: true
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: {
                    display: mostrarTicksX,
                    color: "#4b5563",
                    font: { size: 11 },
                    autoSkip: false,     // 🔥 NO OCULTA LABELS
                    maxRotation: 0,      // 🔥 NO LOS GIRA
                    minRotation: 0,
                    padding: 8           // 🔥 SEPARACIÓN DEL EJE
                },
                grid: {
                    color: "rgba(0,0,0,0.08)"
                }
            },
            y: {
                ticks: {
                    display: mostrarTicksY,
                    color: "#4b5563",
                    font: { size: 11 }
                },
                grid: {
                    color: "rgba(0,0,0,0.04)"
                }
            }
        }
    };
}


// =====================================================
// ⚙️ OPCIONES BASE - PIE / DOUGHNUT
// =====================================================
function configurarOpcionesPie({
    total = 0,
    mostrarLegend = true,
    mostrarDataLabels = true
} = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 14,
                right: 14,
                bottom: 14,
                left: 14
            }
        },
        plugins: {
            legend: {
                display: mostrarLegend,
                position: "bottom",
                labels: {
                    color: "#374151",
                    font: { size: 11, weight: "600" },
                    boxWidth: 14,
                    padding: 12
                }
            },
            tooltip: {
                callbacks: {
                    label: context => {
                        const valor = Number(context.raw || 0);
                        const porcentaje = total ? ((valor / total) * 100).toFixed(1) : "0.0";
                        return `${context.label}: ${formatearNumero(valor)} (${porcentaje}%)`;
                    }
                }
            },
            datalabels: {
                display: mostrarDataLabels,
                color: "#ffffff",
                font: {
                    weight: "700",
                    size: 11
                },
                formatter: value => {
                    const porcentaje = total ? ((value / total) * 100).toFixed(1) : "0.0";
                    return `${porcentaje}%`;
                }
            }
        }
    };
}


// =====================================================
// 🧮 HELPERS
// =====================================================
function contarPorCampo(data, campo) {
    return data.reduce((acc, item) => {
        const key = String(item[campo] || "").trim();
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}

function generarColores(total) {
    const colores = [];
    for (let i = 0; i < total; i++) {
        colores.push(PALETA_RANKING[i % PALETA_RANKING.length] || COLOR_PIE_BASE[i % COLOR_PIE_BASE.length]);
    }
    return colores;
}

function obtenerCantidadDiasDelMes(data) {
    const validos = data.filter(item => item.FECHA_OBJ instanceof Date && !Number.isNaN(item.FECHA_OBJ.getTime()));

    if (validos.length) {
        const base = validos[0].FECHA_OBJ;
        const year = base.getFullYear();
        const month = base.getMonth();
        return new Date(year, month + 1, 0).getDate();
    }

    const maxDia = Math.max(...data.map(item => Number(item.DIA_MES || 0)), 0);
    return maxDia > 0 ? maxDia : 31;
}

function parsearFecha(fechaTexto) {
    const texto = String(fechaTexto || "").trim();

    const match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) {
        return {
            day: null,
            month: null,
            year: null,
            date: null,
            iso: ""
        };
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return {
            day: null,
            month: null,
            year: null,
            date: null,
            iso: ""
        };
    }

    return {
        day,
        month,
        year,
        date,
        iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    };
}

function normalizarDiaSemana(valor) {
    const texto = limpiarTexto(valor).toUpperCase();
    if (!texto) return "";

    if (texto === "MIERCOLES") return "MIÉRCOLES";
    if (texto === "SABADO") return "SÁBADO";
    return texto;
}

function limpiarTexto(valor) {
    return String(valor || "").trim().replace(/\s+/g, " ");
}

function capitalizar(texto) {
    const valor = String(texto || "").trim();
    if (!valor) return "";
    return valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase();
}

function formatearUnidad(unidad) {
    return String(unidad || "")
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, letra => letra.toUpperCase());
}

function formatearNumero(numero) {
    return Number(numero || 0).toLocaleString("en-US");
}

function escapeHtml(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
// =====================================================
// 🔥 ALTURA DINÁMICA GLOBAL PARA TODOS LOS GRÁFICOS
// =====================================================
function ajustarAlturaGrafico(ctx, cantidad, horizontal = false) {
    if (!ctx || !ctx.parentElement) return;

    // 🔥 RESET (ESTO EVITA QUE CREZCA INFINITO)
    ctx.parentElement.style.height = "auto";

    let altura;

    if (horizontal) {
        altura = 360 + (cantidad * 20); // crecimiento controlado
    } else {
        altura = 320 + (cantidad * 15); // crecimiento controlado
    }

    // 🔥 LÍMITE MÁXIMO (IMPORTANTE)
    if (altura > 600) altura = 600;

    ctx.parentElement.style.height = altura + "px";
}