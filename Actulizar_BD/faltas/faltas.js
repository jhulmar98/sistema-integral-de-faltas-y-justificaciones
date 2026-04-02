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
// 🌍 ESTADO
// ===============================
let datos = [];
let cargando = false;

// ===============================
// 🔥 FECHAS
// ===============================
function convertirFecha(v){
    if(typeof v === "number"){
        const f = new Date((v-25569)*86400*1000);
        return formatear(f);
    }
    return v;
}

function formatear(f){
    return String(f.getDate()).padStart(2,"0") + "/" +
           String(f.getMonth()+1).padStart(2,"0") + "/" +
           f.getFullYear();
}

// ===============================
// 🔥 HELPERS
// ===============================
function getMes(f){
    return f["MES"] || f["Mes"] || f["mes"] || null;
}

function getUnidad(f){
    return f["UNIDAD ORGANICA"] || f["UNIDAD"] || "SIN_UNIDAD";
}

function normalizarUnidad(u){
    return u.toUpperCase().replace(/\s+/g,"_");
}

// ===============================
// 👁 PREVIEW
// ===============================
document.getElementById("btnPreview").onclick = () => {

    const file = document.getElementById("fileInput").files[0];
    if(!file) return alert("Selecciona archivo");

    const reader = new FileReader();

    reader.onload = e=>{
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data,{type:"array"});
        const hoja = wb.Sheets[wb.SheetNames[0]];
        datos = XLSX.utils.sheet_to_json(hoja);
        mostrarTabla();
    };

    reader.readAsArrayBuffer(file);
};

function mostrarTabla(){

    let html = "<table><tr>";

    Object.keys(datos[0]).forEach(c=> html += `<th>${c}</th>`);

    html += "</tr>";

    datos.forEach(f=>{
        html += "<tr>";
        Object.entries(f).forEach(([k,v])=>{
            if(k.includes("FECHA")) v = convertirFecha(v);
            html += `<td>${v ?? ""}</td>`;
        });
        html += "</tr>";
    });

    html += "</table>";

    document.getElementById("preview").innerHTML = html;
}

// ===============================
// 🚀 SUBIDA
// ===============================
document.getElementById("btnSubir").onclick = async () => {

    if(cargando) return;

    const btn = document.getElementById("btnSubir");
    const status = document.getElementById("status");
    const bar = document.getElementById("bar");

    cargando = true;
    btn.disabled = true;
    btn.classList.add("loading");
    btn.innerText = "Subiendo...";

    let total = datos.length;
    let procesados = 0;
    const chunkSize = 120;

    try{

        for(let i=0;i<total;i+=chunkSize){

            const batch = writeBatch(db);
            const chunk = datos.slice(i,i+chunkSize);

            chunk.forEach(f=>{

                const mes = getMes(f);
                const unidadRaw = getUnidad(f);
                const unidad = normalizarUnidad(unidadRaw);

                if(!mes) return;

                // MES
                batch.set(doc(db,"faltas",mes),{
                    nombre: mes,
                    activo: true
                },{merge:true});

                // UNIDAD
                batch.set(
                    doc(db,"faltas",mes,"unidades",unidad),
                    {
                        nombre: unidadRaw,
                        activo:true
                    },
                    {merge:true}
                );

                // LIMPIEZA
                let {
                    MES,
                    "UNIDAD ORGANICA":__,
                    "N°":___,
                    ...data
                } = f;

                Object.keys(data).forEach(k=>{
                    if(k.includes("FECHA")){
                        data[k] = convertirFecha(data[k]);
                    }
                });

                batch.set(
                    doc(collection(db,"faltas",mes,"unidades",unidad,"registros")),
                    data
                );
            });

            await batch.commit();

            procesados += chunk.length;

            let p = Math.round((procesados/total)*100);
            bar.style.width = p+"%";
            bar.innerText = p+"%";

            status.innerText = `${procesados}/${total}`;
        }

        status.innerText = "✅ SUBIDA EXITOSA";

    }catch(e){
        console.error(e);
        status.innerText = "❌ ERROR EN SUBIDA";
    }

    btn.disabled = false;
    btn.classList.remove("loading");
    btn.innerText = "Subir";
    cargando = false;
};