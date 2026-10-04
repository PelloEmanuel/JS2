const MINIMO = 10;
const MAXIMO = 20;

const inputNombre = document.getElementById('inputNombre');
const inputNumero = document.getElementById('inputNumero');
const btnAgregar = document.getElementById('btnAgregar');
const btnFinalizar = document.getElementById('btnFinalizar');
const btnDescargar = document.getElementById('btnDescargar');
const mensaje = document.getElementById('mensaje');
const cantidad = document.getElementById('cantidad');
const barraProgreso = document.getElementById('barraProgreso');
const listaNumeros = document.getElementById('listaNumeros');
const panelArchivo = document.getElementById('panelArchivo');

let numeros = [];
let finalizado = false;
let ultimoArchivo = { nombre: '', contenido: '' };

// Muestra un mensaje en pantalla (tipo: '', 'ok' o 'error')
function avisar(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = 'aviso ' + (tipo || '');
}

// Actualiza el contador, la barra, la lista y el estado de los botones
function dibujar() {
  cantidad.textContent = numeros.length;
  barraProgreso.style.width = (numeros.length / MAXIMO * 100) + '%';

  listaNumeros.innerHTML = '';
  if (numeros.length === 0) {
    listaNumeros.innerHTML = '<li class="suave">Todavía no cargaste ninguno.</li>';
  }
  numeros.forEach((numero) => {
    const item = document.createElement('li');
    item.textContent = numero;
    listaNumeros.appendChild(item);
  });

  const lleno = numeros.length >= MAXIMO;
  inputNumero.disabled = lleno || finalizado;
  btnAgregar.disabled = lleno || finalizado;
  btnFinalizar.disabled = numeros.length < MINIMO || finalizado;
}

function agregarNumero() {
  const texto = inputNumero.value.trim();
  if (texto === '') { avisar('Escribí un número.', 'error'); return; }
  if (!/^\d+$/.test(texto)) {
    avisar('Ingresá solo números enteros positivos, sin letras, signos ni decimales.', 'error');
    return;
  }
  if (texto.length > 15) { avisar('El número puede tener hasta 15 dígitos.', 'error'); return; }

  numeros.push(Number(texto));
  dibujar();
  inputNumero.value = '';
  inputNumero.focus();

  if (numeros.length === MAXIMO) {
    avisar('Llegaste al máximo de ' + MAXIMO + ' números. Ya podés finalizar.', 'ok');
  } else if (numeros.length >= MINIMO) {
    avisar('Cargaste ' + numeros.length + ' números. Ya podés finalizar o seguir cargando (hasta ' + MAXIMO + ').', 'ok');
  } else {
    avisar('Cargaste ' + numeros.length + ' números. Faltan ' + (MINIMO - numeros.length) + ' para el mínimo.', 'ok');
  }
}

async function finalizar() {
  const nombre = limpiarNombre(inputNombre.value);
  if (nombre === '') {
    avisar('Escribí tu nombre para identificar el archivo.', 'error');
    inputNombre.focus();
    return;
  }

  const archivo = 'numeros_' + nombre + '_' + fechaHora() + '.txt';
  const contenido = numeros.join('\n');   // un número por línea

  try {
    const nombreFinal = await guardarEnServidor(archivo, contenido);
    ultimoArchivo = { nombre: nombreFinal, contenido: contenido };
    finalizado = true;
    dibujar();
    btnDescargar.disabled = false;
    document.getElementById('nombreArchivo').textContent = nombreFinal;
    panelArchivo.classList.remove('oculto');

    const estado = await descargar(nombreFinal, contenido);
    document.getElementById('textoArchivo').textContent = textoDescarga(estado);
    avisar('Archivo creado correctamente.', 'ok');
  } catch (error) {
    avisar('No se pudo guardar el archivo: ' + error.message, 'error');
  }
}

async function descargarDeNuevo() {
  const estado = await descargar(ultimoArchivo.nombre, ultimoArchivo.contenido);
  document.getElementById('textoArchivo').textContent = textoDescarga(estado);
}

function reiniciar() {
  numeros = [];
  finalizado = false;
  ultimoArchivo = { nombre: '', contenido: '' };
  btnDescargar.disabled = true;
  panelArchivo.classList.add('oculto');
  dibujar();
  avisar('Empezaste de nuevo. Cargá entre 10 y 20 números.');
}

btnAgregar.addEventListener('click', agregarNumero);
inputNumero.addEventListener('keydown', (e) => { if (e.key === 'Enter') agregarNumero(); });
btnFinalizar.addEventListener('click', finalizar);
btnDescargar.addEventListener('click', descargarDeNuevo);
document.getElementById('btnReiniciar').addEventListener('click', reiniciar);

dibujar();

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
