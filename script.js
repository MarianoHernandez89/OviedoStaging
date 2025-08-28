// Configuración Google Sheets
const SHEET_ID = '1YUK837KaCVRFGvSoBG5y0AANIAaFtD6ea00ikSrqR-o';
const SHEET_NAME = 'Combos';
const URL = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;

// Referencias DOM
const combosContainer = document.getElementById('combos-container');
const totalSpan = document.getElementById('total');
const modalCarrito = document.getElementById('modal-carrito');
const modalContent = document.getElementById('lista-carrito');
const nombreInput = document.getElementById('nombre');
const entregaInput = document.getElementById('entrega');
const metodoPagoInputs = document.getElementsByName('pago');
const enviarPedidoBtn = document.getElementById('enviar-whatsapp');
const cerrarModalBtn = document.getElementById('cancelar');
const contadorCarrito = document.getElementById('contador-carrito');

// Modal de detalle combo
const modalCombo = document.getElementById('modal-combo');
const comboNombre = document.getElementById('combo-nombre');
const comboProductos = document.getElementById('combo-productos');
const comboPrecio = document.getElementById('combo-precio');
const btnAgregarCombo = document.getElementById('agregar-combo');
const cerrarModalCombo = document.getElementById('cerrar-modal-combo');

let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let combosData = [];
let comboSeleccionado = null;

// Cargar combos
fetch(URL)
  .then(res => res.json())
  .then(data => {
    combosData = data;
    data.forEach(combo => {
      const card = document.createElement('div');
      card.className = 'rounded-lg overflow-hidden shadow-lg bg-white flex flex-col cursor-pointer';

      const imagenUrl = combo.Imagen || combo.imagen || '';
      const nombre = (combo.Nombre || combo.nombre || 'Sin nombre').toUpperCase();
      const productos = combo.Productos || combo.productos || '';
      const precio = parseFloat(combo.Precio || combo.precio || 0);

      card.innerHTML = `
        <div class="relative h-60 bg-cover bg-center rounded-t-lg" style="background-image: url('${imagenUrl}')">
          <div class="absolute top-0 w-full bg-black/70 text-white text-center py-2 z-20">
            <h2 class="text-lg md:text-xl font-bold uppercase px-2 truncate">${nombre}</h2>
          </div>
        </div>
        <div class="bg-white px-4 py-2 flex flex-row justify-between items-center">
          <p class="text-base font-bold text-red-700">$${precio.toLocaleString('es-AR')}</p>
          <button class="bg-red-700 hover:bg-red-800 text-white text-sm px-3 py-1 rounded ver-detalle">
            Ver detalle
          </button>
        </div>
      `;

      // Evento ver detalle
      const botonDetalle = card.querySelector('.ver-detalle');
      botonDetalle.addEventListener('click', () => {
        comboSeleccionado = { nombre, precio, productos };
        comboNombre.textContent = nombre;
        comboProductos.innerHTML = productos
          .split(',')
          .map(p => `<li>${p.trim()}</li>`)
          .join('');
        comboPrecio.textContent = `$${precio.toLocaleString('es-AR')}`;
        modalCombo.classList.remove('hidden');
      });

      combosContainer.appendChild(card);
    });

    actualizarTotal();
  })
  .catch(error => console.error('Error al cargar los datos:', error));

// Funciones carrito
function actualizarTotal() {
  const total = carrito.reduce((sum, item) => sum + item.precio, 0);
  totalSpan.textContent = total.toLocaleString('es-AR');
  const cantidad = carrito.length;
  if (cantidad > 0) {
    contadorCarrito.textContent = cantidad;
    contadorCarrito.classList.remove('hidden');
  } else {
    contadorCarrito.classList.add('hidden');
  }
}

function agruparCarrito(carrito) {
  const agrupado = [];
  carrito.forEach(item => {
    const existente = agrupado.find(el => el.nombre === item.nombre && el.productos === item.productos);
    if (existente) {
      existente.cantidad += 1;
    } else {
      agrupado.push({ ...item, cantidad: 1 });
    }
  });
  return agrupado;
}

function renderizarCarrito() {
  modalContent.innerHTML = '';
  const carritoAgrupado = agruparCarrito(carrito);

  carritoAgrupado.forEach(item => {
    const div = document.createElement('div');
    div.className = 'mb-4 border-b pb-2';
    const productosHTML = item.productos.split(',').map(prod => `<li>${prod.trim()}</li>`).join('');
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <p class="font-bold">${item.nombre}</p>
          <p class="text-sm text-gray-700">Cantidad: ${item.cantidad}</p>
          <ul class="text-sm list-disc list-inside">${productosHTML}</ul>
          <p class="text-red-600 font-medium">$${(item.precio * item.cantidad).toLocaleString('es-AR')}</p>
          <div class="mt-2 space-x-2">
            <button class="bg-gray-200 px-2 rounded" onclick="cambiarCantidad('${item.nombre}', '${item.productos}', -1)">−</button>
            <button class="bg-gray-200 px-2 rounded" onclick="cambiarCantidad('${item.nombre}', '${item.productos}', 1)">+</button>
          </div>
        </div>
      </div>
    `;
    modalContent.appendChild(div);
  });
}

function cambiarCantidad(nombre, productos, cambio) {
  const index = carrito.findIndex(item => item.nombre === nombre && item.productos === productos);
  if (index !== -1) {
    if (cambio === -1) carrito.splice(index, 1);
    else if (cambio === 1) carrito.push({ nombre, productos, precio: carrito[index].precio });
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarTotal();
    renderizarCarrito();
  }
}

// Eventos
document.getElementById('ver-carrito').addEventListener('click', () => {
  if (carrito.length === 0) {
    alert('El carrito está vacío.');
    return;
  }
  renderizarCarrito();
  modalCarrito.classList.remove('hidden');
});

cerrarModalBtn.addEventListener('click', () => modalCarrito.classList.add('hidden'));

enviarPedidoBtn.addEventListener('click', () => {
  if (carrito.length === 0) return alert('El carrito está vacío.');

  const nombre = nombreInput.value.trim();
  const entrega = entregaInput.value.trim();
  const metodoPago = Array.from(metodoPagoInputs).find(r => r.checked)?.value;
  if (!nombre || !entrega || !metodoPago) return alert('Por favor, completá todos los campos.');

  let mensaje = `*Pedido de Combos de Carnicería*\n\nCliente: ${nombre}\nEntrega: ${entrega}\nMétodo de pago: ${metodoPago}\n\n`;
  const agrupado = agruparCarrito(carrito);
  agrupado.forEach(item => {
    mensaje += `*${item.nombre}* x${item.cantidad} - $${(item.precio * item.cantidad).toLocaleString('es-AR')}\n`;
    item.productos.split(',').forEach(prod => mensaje += `  - ${prod.trim()}\n`);
    mensaje += `\n`;
  });
  mensaje += `*Total:* $${carrito.reduce((sum, i) => sum + i.precio, 0).toLocaleString('es-AR')}`;

  const numeroWhatsApp = '5492213074708';
  window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');

  carrito = [];
  localStorage.removeItem('carrito');
  actualizarTotal();
  modalCarrito.classList.add('hidden');
  nombreInput.value = '';
  entregaInput.value = '';
  metodoPagoInputs.forEach(r => r.checked = false);
});

// Modal detalle combo
cerrarModalCombo.addEventListener('click', () => modalCombo.classList.add('hidden'));
btnAgregarCombo.addEventListener('click', () => {
  if (!comboSeleccionado) return;
  carrito.push(comboSeleccionado);
  localStorage.setItem('carrito', JSON.stringify(carrito));
  actualizarTotal();
  modalCombo.classList.add('hidden');
});
