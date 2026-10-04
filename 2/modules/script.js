const inputNombre = document.getElementById('inputNombre');
const inputArchivo = document.getElementById('archivo');
const btnGuardar = document.getElementById('btnGuardar');
const btnDescargar = document.getElementById('btnDescargar');
const zonaArchivo = document.getElementById('zonaArchivo');
const textoZona = document.getElementById('textoZona');
const mensaje = document.getElementById('mensaje');
const resultados = document.getElementById('resultados');
const panelArchivo = document.getElementById('panelArchivo');

let utiles = [];
let ultimoArchivo = { nombre: '', contenido: '' };

// Muestra un mensaje en pantalla (tipo: '', 'ok' o 'error')
function avisar(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = 'aviso ' + (tipo || '');
}

// Un número es útil si su primer y su último dígito son iguales (525 sí, 123 no)
function empiezaYTerminaIgual(numero) {
  const texto = String(numero);
  return texto[0] === texto[texto.length - 1];
}

function mostrarResultados(numeros) {
  utiles = numeros.filter(empiezaYTerminaIgual).sort((a, b) => a - b);
  const noUtiles = numeros.length - utiles.length;
  const porcentaje = (utiles.length / numeros.length * 100).toFixed(2);

  document.getElementById('total').textContent = numeros.length;
  document.getElementById('cantUtiles').textContent = utiles.length;
  document.getElementById('cantNoUtiles').textContent = noUtiles;
  document.getElementById('porcentaje').textContent = porcentaje + '%';

  const lista = document.getElementById('listaUtiles');
  lista.innerHTML = '';
  if (utiles.length === 0) {
    lista.innerHTML = '<li class="suave">Ningún número cumple la condición.</li>';
  }
  utiles.forEach((numero) => {
    const item = document.createElement('li');
    item.textContent = numero;
    lista.appendChild(item);
  });

  resultados.classList.remove('oculto');
  panelArchivo.classList.add('oculto');
  btnGuardar.disabled = utiles.length === 0;
  btnDescargar.disabled = true;
}

// Lee el archivo, separa los números y calcula el filtrado
async function procesarArchivo(archivo) {
  if (!archivo) return;
  if (!archivo.name.toLowerCase().endsWith('.txt')) {
    avisar('El archivo debe ser de tipo .txt.', 'error');
    return;
  }

  const texto = await archivo.text();
  const partes = texto.split(/[\s,;]+/).filter((parte) => parte !== '');
  const numeros = [];
  let ignorados = 0;

  partes.forEach((parte) => {
    if (/^\d+$/.test(parte) && Number.isSafeInteger(Number(parte))) {
      numeros.push(Number(parte));
    } else {
      ignorados++;
    }
  });

  if (numeros.length === 0) {
    avisar('El archivo no contiene números válidos.', 'error');
    return;
  }

  textoZona.textContent = 'Archivo cargado: ' + archivo.name;
  mostrarResultados(numeros);
  avisar('Archivo leído correctamente.' + (ignorados > 0 ? ' Se ignoraron ' + ignorados + ' valores que no eran números.' : ''), 'ok');
}

async function guardarResultado() {
  const nombre = limpiarNombre(inputNombre.value);
  if (nombre === '') {
    avisar('Escribí tu nombre para identificar el archivo.', 'error');
    inputNombre.focus();
    return;
  }

  const archivo = 'filtrados_' + nombre + '_' + fechaHora() + '.txt';
  const contenido = utiles.join('\n');   // un número por línea, de menor a mayor

  try {
    const nombreFinal = await guardarEnServidor(archivo, contenido);
    ultimoArchivo = { nombre: nombreFinal, contenido: contenido };
    btnDescargar.disabled = false;
    document.getElementById('nombreArchivo').textContent = nombreFinal;
    panelArchivo.classList.remove('oculto');

    const estado = await descargar(nombreFinal, contenido);
    document.getElementById('textoArchivo').textContent = textoDescarga(estado);
    avisar('Resultado guardado correctamente.', 'ok');
  } catch (error) {
    avisar('No se pudo guardar el archivo: ' + error.message, 'error');
  }
}

async function descargarDeNuevo() {
  const estado = await descargar(ultimoArchivo.nombre, ultimoArchivo.contenido);
  document.getElementById('textoArchivo').textContent = textoDescarga(estado);
}

function reiniciar() {
  utiles = [];
  ultimoArchivo = { nombre: '', contenido: '' };
  inputArchivo.value = '';
  textoZona.textContent = 'Arrastrá tu archivo .txt acá';
  resultados.classList.add('oculto');
  btnGuardar.disabled = true;
  btnDescargar.disabled = true;
  avisar('Subí un archivo .txt con números. Se buscan los que empiezan y terminan con el mismo dígito (525 sí, 123 no).');
}

// Eventos: botón del explorador, elegir archivo, arrastrar y soltar
document.getElementById('btnElegir').addEventListener('click', () => inputArchivo.click());
zonaArchivo.addEventListener('click', () => inputArchivo.click());
inputArchivo.addEventListener('change', () => procesarArchivo(inputArchivo.files[0]));
zonaArchivo.addEventListener('dragover', (e) => { e.preventDefault(); zonaArchivo.classList.add('sobre'); });
zonaArchivo.addEventListener('dragleave', () => zonaArchivo.classList.remove('sobre'));
zonaArchivo.addEventListener('drop', (e) => {
  e.preventDefault();
  zonaArchivo.classList.remove('sobre');
  procesarArchivo(e.dataTransfer.files[0]);
});
// Evita que el navegador abra el archivo si se suelta fuera del recuadro
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

btnGuardar.addEventListener('click', guardarResultado);
btnDescargar.addEventListener('click', descargarDeNuevo);
document.getElementById('btnReiniciar').addEventListener('click', reiniciar);

// ---------- Nombre del archivo ----------
// Deja el nombre de la persona sin tildes ni símbolos, para usarlo en el archivo
function limpiarNombre(texto) {
  return texto.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Fecha y hora actual como 20261004_153012 (hace único cada archivo)
function fechaHora() {
  const f = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return f.getFullYear() + dos(f.getMonth() + 1) + dos(f.getDate()) + '_' +
    dos(f.getHours()) + dos(f.getMinutes()) + dos(f.getSeconds());
}

// ---------- Guardado ----------
// 1) Guarda el archivo en la carpeta data/ del proyecto (lo hace el servidor)
async function guardarEnServidor(archivo, contenido) {
  const respuesta = await fetch('/guardar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archivo: archivo, contenido: contenido })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error);
  return datos.archivo;
}

// 2) Abre el explorador de archivos para que la persona elija dónde descargarlo.
//    Devuelve 'elegida', 'cancelada' o 'normal' (navegador sin explorador)
async function descargar(nombre, contenido) {
  const blob = new Blob([contenido], { type: 'text/plain' });

  if (window.showSaveFilePicker) {
    try {
      const manejador = await window.showSaveFilePicker({
        suggestedName: nombre,
        types: [{ description: 'Archivo de texto', accept: { 'text/plain': ['.txt'] } }]
      });
      const escritura = await manejador.createWritable();
      await escritura.write(blob);
      await escritura.close();
      return 'elegida';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelada';
    }
  }

  // Alternativa para navegadores sin explorador: descarga común
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  return 'normal';
}

// Texto que se muestra según cómo terminó la descarga
function textoDescarga(estado) {
  if (estado === 'elegida') return 'Se guardó en la carpeta data/ y en la ubicación que elegiste.';
  if (estado === 'cancelada') return 'Se guardó en la carpeta data/, pero cancelaste la descarga. Podés repetirla con «Descargar de nuevo».';
  return 'Se guardó en la carpeta data/ y tu navegador lo descargó según su configuración.';
}

// ---- Modo claro / oscuro ----
const btnTema = document.getElementById('btnTema');

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-tema', tema);
  btnTema.textContent = tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro';
}

aplicarTema(localStorage.getItem('tema') || 'claro');

btnTema.addEventListener('click', () => {
  const actual = document.documentElement.getAttribute('data-tema');
  const nuevo = actual === 'oscuro' ? 'claro' : 'oscuro';
  localStorage.setItem('tema', nuevo);
  aplicarTema(nuevo);
});
