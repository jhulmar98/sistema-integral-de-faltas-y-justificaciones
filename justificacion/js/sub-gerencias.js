// =====================================================
// 🔥 SUB-GERENCIAS.JS (CORREGIDO - SIN ERRORES)
// =====================================================

import { obtenerMeses, obtenerUnidades } from "../../backend/api.js";


// =====================================================
// 🚀 INICIO
// =====================================================
window.addEventListener("load", async () => {

    const selectMes = document.getElementById("filtroMes");
    const selectUnidad = document.getElementById("filtroUnidad");

    if (!selectMes || !selectUnidad) {
        console.error("❌ Selects no encontrados");
        return;
    }

    // =================================================
    // 📅 CARGAR MESES
    // =================================================
    try {

        const meses = await obtenerMeses();

        meses.forEach(mes => {
            const option = document.createElement("option");
            option.value = mes;
            option.textContent = mes;
            selectMes.appendChild(option);
        });

    } catch (error) {
        console.error("Error cargando meses:", error);
    }


    // =================================================
    // 🔁 CAMBIO DE MES
    // =================================================
    selectMes.addEventListener("change", async () => {

        const mes = selectMes.value;

        // =================================================
        // 🧹 LIMPIAR COMPLETAMENTE SUBGERENCIAS
        // =================================================
        selectUnidad.innerHTML = '<option value="">Seleccione</option>';

        if (!mes) return;

        try {

            const unidades = await obtenerUnidades(mes);

            console.log("Subgerencias:", unidades);

            // =================================================
            // 🚫 EVITAR DUPLICADOS
            // =================================================
            const unidadesUnicas = [...new Set(unidades)];

            unidadesUnicas.forEach(unidad => {

                const option = document.createElement("option");

                option.value = unidad;

                option.textContent = unidad
                    .replaceAll("_", " ")
                    .toLowerCase()
                    .replace(/\b\w/g, l => l.toUpperCase());

                selectUnidad.appendChild(option);

            });

        } catch (error) {
            console.error("Error cargando subgerencias:", error);
        }

    });

});