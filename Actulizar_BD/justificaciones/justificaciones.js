import {
    getFirestore,
    collection,
    doc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// 🔥 CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDy5GC-m2AKB2RTXwLioYyvk19tjppVtUU",
  authDomain: "control-de-papeletas.firebaseapp.com",
  projectId: "control-de-papeletas",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===============================
let datosExcel = [];
let cargando = false;

// ===============================
// 📅 MES
// ===============================
function normalizarMes(mes) {
    if (!mes) return null;

    mes = mes.toString().trim().toUpperCase();

    const meses = [
        "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
        "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
    ];

    return meses.includes(mes) ? mes : null;
}

// ===============================
// 🏢 UNIDAD
// ===============================
function normalizarUnidad(u) {
    if (!u) return "SIN_UNIDAD";

    return u.toString()
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");
}

// ===============================
// 👁 PREVIEW
// ===============================
document.getElementById("btnPreview").onclick = () => {

    const file = document.getElementById("fileInput").files[0];
    if (!file) return alert("Selecciona archivo");

    const reader = new FileReader();

    reader.onload = e => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data,{type:"array"});
        const hoja = wb.Sheets[wb.SheetNames[0]];
        datosExcel = XLSX.utils.sheet_to_json(hoja);
        mostrarTabla();
    };

    reader.readAsArrayBuffer(file);
};

function mostrarTabla(){

    let html = "<table><tr>";

    Object.keys(datosExcel[0]).forEach(c => html += `<th>${c}</th>`);

    html += "</tr>";

    datosExcel.forEach(f => {
        html += "<tr>";
        Object.values(f).forEach(v=>{
            html += `<td>${v ?? ""}</td>`;
        });
        html += "</tr>";
    });

    html += "</table>";

    document.getElementById("preview").innerHTML = html;
}

// ===============================
// 🚀 SUBIR
// ===============================
document.getElementById("btnSubir").onclick = async () => {

    if(cargando) return;

    const btn = document.getElementById("btnSubir");
    const bar = document.getElementById("bar");
    const status = document.getElementById("status");

    if(datosExcel.length === 0){
        status.innerText = "⚠️ No hay datos";
        return;
    }

    cargando = true;
    btn.disabled = true;
    btn.classList.add("loading");
    btn.innerText = "Subiendo...";

    let total = datosExcel.length;
    let procesados = 0;

    const chunkSize = 400;

    try {

        for(let i=0;i<total;i+=chunkSize){

            let batch = writeBatch(db);
            let chunk = datosExcel.slice(i,i+chunkSize);

            chunk.forEach(fila => {

                let mes = normalizarMes(
                    fila["MES"] || fila["Mes"] || fila["mes"]
                );

                let unidad = normalizarUnidad(
                    fila["UNIDAD ORGANICA"]
                );

                if(!mes) return;

                // MES
                batch.set(doc(db,"justificaciones",mes),{
                    nombre: mes,
                    activo:true
                },{merge:true});

                // UNIDAD
                batch.set(
                    doc(db,"justificaciones",mes,"unidades",unidad),
                    {
                        nombre: unidad,
                        activo:true
                    },
                    {merge:true}
                );

                // REGISTRO
                const ref = doc(
                    collection(db,"justificaciones",mes,"unidades",unidad,"registros")
                );

                let { MES, Mes, mes: _, ...data } = fila;

                batch.set(ref, data);
            });

            await batch.commit();

            procesados += chunk.length;

            let p = Math.round((procesados/total)*100);

            bar.style.width = p+"%";
            bar.innerText = p+"%";

            status.innerText = `🚀 ${procesados} / ${total}`;
        }

        status.innerText = "✅ Subida completada";

    } catch(e){
        console.error(e);
        status.innerText = "❌ Error";
    }

    btn.disabled = false;
    btn.classList.remove("loading");
    btn.innerText = "Subir";
    cargando = false;
};