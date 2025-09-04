// =============================
// script.js con validación de mínimo pedido
// =============================

// --- CONFIGURACIÓN ---
const SHEET_ID = '1YUK837KaCVRFGvSoBG5y0AANIAaFtD6ea00ikSrqR-o';
const SHEET_NAME_COMBOS = 'Combos';
const SHEET_NAME_PRODUCTOS = 'Productos';
const SHEET_NAME_CONFIG = 'Config'; // <--- nueva hoja
const URL_COMBOS = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME_COMBOS}`;
const URL_PRODUCTOS = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME_PRODUCTOS}`;
const URL_CONFIG = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME_CONFIG}`;

// --- SELECTORES DOM ---
const combosContainer = document.getElementById('combos-container');
const totalSpan = document.getElementById('total');
const modalCarrito = document.getElementById('modal-carrito');
const modalCarritoContent = document.getElementById('lista-carrito');
const nombreInput = document.getElementById('nombre');
const entregaInput = document.getElementById('entrega');
const metodoPagoInputs = document.getElementsByName('pago');
const enviarPedidoBtn = document.getElementById('enviar-whatsapp');
const cerrarModalBtn = document.getElementById('cancelar');
const verCarritoBtn = document.getElementById('ver-carrito');
const contadorCarrito = document.getElementById('contador-carrito');

const modalArmarCombo = document.getElementById('modal-armar-combo');
const listaProductos = document.getElementById('lista-productos');
const btnCancelarCombo = document.getElementById('cancelar-combo');
const btnAgregarCombo = document.getElementById('agregar-combo-carrito');

// --- ESTADO ---
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let combosData = [];
let productosData = [];
let configData = { MinimoPedido: 0 }; // valor inicial

// -----------------------------
// UTIL: formatea número argentino
// -----------------------------
function formatNum(num) {
  if (!isFinite(num)) return '0';
  return Number(num).toLocaleString('es-AR');
}

// -----------------------------
// CARGAR CONFIG
// -----------------------------
async function cargarConfig() {
  try {
    const res = await fetch(URL_CONFIG);
    const data = await res.json();
    if (data && data.length > 0) {
      const min = parseFloat(data[0].MinimoPedido || 0);
      configData.MinimoPedido = isFinite(min) ? min : 0;
    }
  } catch (err) {
    console.error('Error al cargar Config:', err);
    configData.MinimoPedido = 0;
  }
}

// -----------------------------
// CARGAR Y RENDERIZAR COMBOS
// -----------------------------
async function cargarCombos() {
  try {
    const res = await fetch(URL_COMBOS);
    const data = await res.json();
    combosData = data || [];

    combosData.forEach(combo => {
      const imagenUrl = combo.Imagen || combo.imagen || '';
      const nombre = combo.Nombre || combo.nombre || 'Sin nombre';
      const productos = combo.Productos || combo.productos || '';
      const precio = parseFloat(combo.Precio || combo.precio || 0);

      const card = document.createElement('div');
      card.className = 'rounded-lg overflow-hidden shadow-lg bg-white flex flex-col';
      card.style.backgroundImage = imagenUrl ? `url('${imagenUrl}')` : '';
      card.style.backgroundSize = 'cover';
      card.style.backgroundPosition = 'center';

      card.innerHTML = `
        <div class="relative h-60 bg-cover bg-center rounded-t-lg" style="background-image: url('${imagenUrl}')">
          <div class="absolute top-0 w-full bg-black/70 text-white text-center py-2 z-20">
            <h2 class="text-lg md:text-xl font-bold uppercase px-2 truncate">${nombre.toUpperCase()}</h2>
          </div>
          <div class="absolute inset-0 flex items-center justify-center px-4">
            <div class="bg-black/60 rounded p-2 w-full text-center space-y-1 max-h-[70%] overflow-y-auto mt-8 pt-4">
              ${productos.split(',').map(prod => `<p class="text-white text-sm md:text-base font-bold uppercase tracking-wide">${prod.trim()}</p>`).join('')}
            </div>
          </div>
        </div>
        <div class="bg-white px-4 py-2 flex flex-row justify-between items-center">
          <p class="text-base font-bold text-red-700">$${formatNum(precio)}</p>
          <button class="bg-red-700 hover:bg-red-800 text-white text-sm px-3 py-1 rounded add-to-cart">Agregar al carrito</button>
        </div>
      `.trim();

      const boton = card.querySelector('.add-to-cart');
      boton.addEventListener('click', () => {
        carrito.push({ nombre, precio, productos });
        persistCarrito();
        actualizarTotal();
        boton.classList.add('scale-110', 'transition', 'duration-150');
        setTimeout(() => boton.classList.remove('scale-110'), 150);
        Swal.fire('✔️ Agregado', `${nombre} se agregó al carrito`, 'success');
      });

      combosContainer.appendChild(card);
    });

    crearCardArmarCombo();
    actualizarTotal();
  } catch (err) {
    console.error('Error al cargar combos:', err);
  }
}

// -----------------------------
// PERSISTENCIA
// -----------------------------
function persistCarrito() {
  localStorage.setItem('carrito', JSON.stringify(carrito));
}

// -----------------------------
// ACTUALIZAR TOTAL DEL CARRITO
// -----------------------------
function actualizarTotal() {
  const total = carrito.reduce((s, it) => s + (parseFloat(it.precio) || 0) * (parseFloat(it.cantidad) || 1), 0);
  totalSpan.textContent = formatNum(total);
  const cantidad = carrito.length;
  if (cantidad > 0) {
    contadorCarrito.textContent = cantidad;
    contadorCarrito.classList.remove('hidden');
  } else {
    contadorCarrito.classList.add('hidden');
  }
}

// -----------------------------
// AGRUPAR Y RENDERIZAR CARRITO
// -----------------------------
function agruparCarrito(items) {
  const agrupado = [];
  items.forEach(it => {
    const key = `${it.nombre}||${it.productos || ''}||${it.precio}`;
    const existente = agrupado.find(x => x.key === key);
    if (existente) existente.cantidad += (it.cantidad ? Number(it.cantidad) : 1);
    else agrupado.push({ key, nombre: it.nombre, productos: it.productos || '', precio: Number(it.precio) || 0, cantidad: it.cantidad ? Number(it.cantidad) : 1 });
  });
  return agrupado;
}

function renderizarCarrito() {
  modalCarritoContent.innerHTML = '';
  const agrup = agruparCarrito(carrito);

  agrup.forEach(item => {
    const div = document.createElement('div');
    div.className = 'mb-4 border-b pb-2';
    const productosHTML = (item.productos || '').split(',').map(p => p.trim()).filter(Boolean).map(p => `<li>${p}</li>`).join('');
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <p class="font-bold">${item.nombre}</p>
          <p class="text-sm text-gray-700">Cantidad: ${item.cantidad}</p>
          <ul class="text-sm list-disc list-inside">${productosHTML}</ul>
          <p class="text-red-600 font-medium">$${formatNum(item.precio * item.cantidad)}</p>
          <div class="mt-2 space-x-2">
            <button class="bg-gray-200 px-2 rounded btn-decrease">−</button>
            <button class="bg-gray-200 px-2 rounded btn-increase">+</button>
            <button class="ml-3 text-red-600 btn-remove">Eliminar</button>
          </div>
        </div>
      </div>
    `.trim();

    div.querySelector('.btn-decrease').addEventListener('click', () => {
      const idx = carrito.findIndex(ci => ci.nombre === item.nombre && (ci.productos || '') === (item.productos || '') && Number(ci.precio) === Number(item.precio));
      if (idx !== -1) {
        carrito.splice(idx, 1);
        persistCarrito();
        actualizarTotal();
        renderizarCarrito();
      }
    });

    div.querySelector('.btn-increase').addEventListener('click', () => {
      carrito.push({ nombre: item.nombre, productos: item.productos, precio: item.precio, cantidad: 1 });
      persistCarrito();
      actualizarTotal();
      renderizarCarrito();
    });

    div.querySelector('.btn-remove').addEventListener('click', () => {
      carrito = carrito.filter(ci => !(ci.nombre === item.nombre && (ci.productos || '') === (item.productos || '') && Number(ci.precio) === Number(item.precio)));
      persistCarrito();
      actualizarTotal();
      renderizarCarrito();
    });

    modalCarritoContent.appendChild(div);
  });
}

// -----------------------------
// ENVIAR POR WHATSAPP
// -----------------------------
enviarPedidoBtn.addEventListener('click', () => {
  if (carrito.length === 0) {
    Swal.fire('⚠️ Carrito vacío', 'Agregá al menos un combo antes de enviar tu pedido.', 'warning');
    return;
  }

  const nombre = (nombreInput.value || '').trim();
  const entrega = (entregaInput.value || '').trim();
  const metodoPago = Array.from(metodoPagoInputs).find(r => r.checked)?.value;

  if (!nombre || !entrega || !metodoPago) {
    Swal.fire('⚠️ Campos incompletos', 'Por favor, completá tu nombre, dirección y método de pago.', 'warning');
    return;
  }

  const total = carrito.reduce((s, i) => s + (Number(i.precio) || 0) * (Number(i.cantidad) || 1), 0);
  if (total < configData.MinimoPedido) {
    Swal.fire('⚠️ Pedido mínimo', `El pedido debe superar los $${formatNum(configData.MinimoPedido)} para poder enviarse.`, 'warning');
    return;
  }

  let mensaje = `*Pedido de Combos de Carnicería*\n\n`;
  mensaje += `*Cliente:* ${nombre}\n`;
  mensaje += `*Entrega:* ${entrega}\n`;
  mensaje += `*Método de pago:* ${metodoPago}\n\n`;

  const agrup = agruparCarrito(carrito);
  agrup.forEach(it => {
    mensaje += `*${it.nombre}* x${it.cantidad} - $${formatNum(it.precio * it.cantidad)}\n`;
    (it.productos || '').split(',').map(p => p.trim()).filter(Boolean).forEach(prod => mensaje += `  - ${prod}\n`);
    mensaje += `\n`;
  });

  mensaje += `*Total:* $${formatNum(total)}`;

  const numeroWhatsApp = '5492213074708';
  const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');

  carrito = [];
  persistCarrito();
  actualizarTotal();
  modalCarrito.classList.add('hidden');
  nombreInput.value = '';
  entregaInput.value = '';
  Array.from(metodoPagoInputs).forEach(i => i.checked = false);
});

// -----------------------------
// CARD "ARMÁ TU PROPIO COMBO"
// -----------------------------
function crearCardArmarCombo() {
  const card = document.createElement('div');
  card.className = 'rounded-lg overflow-hidden shadow-lg bg-white flex flex-col cursor-pointer border border-dashed border-gray-400';
  card.style.backgroundImage = "url('https://i.imgur.com/1ZCGoNL.jpeg')";
  card.style.backgroundSize = 'cover';
  card.style.backgroundPosition = 'center';
  card.style.height = '250px';

  card.innerHTML = `
    <div class="flex justify-center items-center w-full h-full bg-black/40">
      <p class="font-bold text-lg text-white text-center px-2">Armá tu propio combo</p>
    </div>
  `.trim();

  combosContainer.appendChild(card);
  card.addEventListener('click', () => openModalArmarCombo());
}

// -----------------------------
// ABRIR / RENDER MODAL ARMAR COMBO
// -----------------------------
async function openModalArmarCombo() {
  try {
    const res = await fetch(URL_PRODUCTOS);
    const data = await res.json();
    productosData = data || [];

    listaProductos.innerHTML = '';

    productosData.forEach(prod => {
      const row = document.createElement('div');
      row.className = 'flex justify-between items-center border-b py-2 gap-2';
      row.dataset.nombre = prod.Producto;
      row.dataset.precio = String(parseFloat(prod.Precio) || 0);
      row.dataset.cantidad = '0';
      row.dataset.subtotal = '0';

      const nombreSpan = document.createElement('span');
      nombreSpan.className = 'text-gray-700 flex-1';
      nombreSpan.textContent = `${prod.Producto} ($${formatNum(parseFloat(prod.Precio) || 0)}/kg)`;

      const controlesDiv = document.createElement('div');
      controlesDiv.className = 'flex items-center gap-2';

      const btnMenos = document.createElement('button');
      btnMenos.type = 'button';
      btnMenos.className = 'bg-gray-200 px-2 rounded';
      btnMenos.textContent = '−';

      const cantidadSpan = document.createElement('span');
      cantidadSpan.className = 'w-12 text-center';
      cantidadSpan.textContent = '0';

      const btnMas = document.createElement('button');
      btnMas.type = 'button';
      btnMas.className = 'bg-gray-200 px-2 rounded';
      btnMas.textContent = '+';

      const unidadSpan = document.createElement('span');
      unidadSpan.className = 'ml-1 w-6';
      unidadSpan.textContent = 'kg';

      const subtotalSpan = document.createElement('span');
      subtotalSpan.className = 'font-bold text-red-700 w-28 text-right';
      subtotalSpan.textContent = `$0`;
      subtotalSpan.dataset.valor = '0';

      function actualizarRow() {
        const precio = parseFloat(row.dataset.precio) || 0;
        const cantidad = parseFloat(row.dataset.cantidad) || 0;
        const subtotal = Math.round((precio * cantidad) * 100) / 100;
        row.dataset.subtotal = String(subtotal);
        subtotalSpan.dataset.valor = String(subtotal);
        subtotalSpan.textContent = `$${formatNum(subtotal)}`;
        cantidadSpan.textContent = String(cantidad % 1 === 0 ? cantidad.toFixed(0) : cantidad.toFixed(1));
        actualizarTotalModal();
      }

      btnMas.addEventListener('click', () => {
        const current = parseFloat(row.dataset.cantidad) || 0;
        row.dataset.cantidad = String(Math.round((current + 0.5) * 100) / 100);
        actualizarRow();
      });

      btnMenos.addEventListener('click', () => {
        const current = parseFloat(row.dataset.cantidad) || 0;
        row.dataset.cantidad = String(Math.max(0, Math.round((current - 0.5) * 100) / 100));
        actualizarRow();
      });

      controlesDiv.appendChild(btnMenos);
      controlesDiv.appendChild(cantidadSpan);
      controlesDiv.appendChild(btnMas);

      row.appendChild(nombreSpan);
      row.appendChild(controlesDiv);
      row.appendChild(unidadSpan);
      row.appendChild(subtotalSpan);

      listaProductos.appendChild(row);
    });

    let totalGeneral = document.getElementById('total-general-combo');
    if (!totalGeneral) {
      totalGeneral = document.createElement('div');
      totalGeneral.id = 'total-general-combo';
      totalGeneral.className = 'mt-4 text-right font-bold text-red-700 text-lg';
      listaProductos.appendChild(totalGeneral);
    }
    totalGeneral.textContent = `Total: $0`;

    modalArmarCombo.classList.remove('hidden');
  } catch (err) {
    console.error('Error al cargar productos:', err);
    Swal.fire('❌ Error', 'No se pudieron cargar los productos. Revisá la conexión.', 'error');
  }
}

// -----------------------------
// ACTUALIZAR TOTAL DEL MODAL ARMAR COMBO
// -----------------------------
function actualizarTotalModal() {
  const filas = listaProductos.querySelectorAll('div[data-nombre]');
  let total = 0;
  filas.forEach(f => {
    total += parseFloat(f.dataset.subtotal) || 0;
  });
  const totalDiv = document.getElementById('total-general-combo');
  if (totalDiv) totalDiv.textContent = `Total: $${formatNum(total)}`;
}

// -----------------------------
// AGREGAR COMBO PERSONALIZADO AL CARRITO
// -----------------------------
btnAgregarCombo.addEventListener('click', () => {
  const filas = listaProductos.querySelectorAll('div[data-nombre]');
  let comboProductos = [];
  let comboPrecio = 0;

  filas.forEach(f => {
    const cantidad = parseFloat(f.dataset.cantidad) || 0;
    const precio = parseFloat(f.dataset.precio) || 0;
    const nombre = f.dataset.nombre;
    if (cantidad > 0) {
      comboProductos.push(`${nombre} (${cantidad} kg)`);
      comboPrecio += cantidad * precio;
    }
  });

  if (comboProductos.length === 0) {
    Swal.fire('⚠️ Sin productos', 'Seleccioná al menos un producto para armar tu combo.', 'warning');
    return;
  }

  carrito.push({
    nombre: 'Combo personalizado',
    productos: comboProductos.join(', '),
    precio: Math.round(comboPrecio * 100) / 100,
    cantidad: 1
  });

  persistCarrito();
  actualizarTotal();
  modalArmarCombo.classList.add('hidden');
  Swal.fire('✔️ Agregado', 'Tu combo personalizado fue agregado al carrito.', 'success');
});

// -----------------------------
// EVENTOS MODALES
// -----------------------------
verCarritoBtn.addEventListener('click', () => {
  renderizarCarrito();
  modalCarrito.classList.remove('hidden');
});

cerrarModalBtn.addEventListener('click', () => {
  modalCarrito.classList.add('hidden');
});

btnCancelarCombo.addEventListener('click', () => {
  modalArmarCombo.classList.add('hidden');
});

// -----------------------------
// INICIO
// -----------------------------
(async function init() {
  await cargarConfig();  // primero leemos el mínimo pedido
  await cargarCombos();
})();
