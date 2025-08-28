// =============================
// CONFIGURACIÓN
// =============================
const SHEET_ID = '1YUK837KaCVRFGvSoBG5y0AANIAaFtD6ea00ikSrqR-o';
const SHEET_NAME = 'Combos';
const URL = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;

const combosContainer = document.getElementById('combos-container');
const totalSpan = document.getElementById('total');
const modal = document.getElementById('modal-carrito');
const modalContent = document.getElementById('lista-carrito');
const nombreInput = document.getElementById('nombre');
const entregaInput = document.getElementById('entrega');
const metodoPagoInputs = document.getElementsByName('pago');
const enviarPedidoBtn = document.getElementById('enviar-whatsapp');
const cerrarModalBtn = document.getElementById('cancelar');
const contadorCarrito = document.getElementById('contador-carrito');

let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let combosData = [];

// =============================
// CARGA DE COMBOS PREDEFINIDOS
// =============================
fetch(URL)
  .then(res => res.json())
  .then(data => {
    combosData = data;

    data.forEach(combo => {
      const card = document.createElement('div');
      card.className = 'rounded-lg overflow-hidden shadow-lg bg-white flex flex-col';

      const imagenUrl = combo.Imagen || combo.imagen || '';
      const nombre = (combo.Nombre || combo.nombre || 'Sin nombre').toUpperCase();
      const productos = combo.Productos || combo.productos || '';
      const precio = parseFloat(combo.Precio || combo.precio || 0);

      card.style.backgroundImage = `url('${imagenUrl}')`;
      card.style.backgroundSize = 'cover';
      card.style.backgroundPosition = 'center';

      card.innerHTML = `
        <div class="relative h-60 bg-cover bg-center rounded-t-lg" style="background-image: url('${imagenUrl}')">
          <div class="absolute top-0 w-full bg-black/70 text-white text-center py-2 z-20">
            <h2 class="text-lg md:text-xl font-bold uppercase px-2 truncate">${nombre}</h2>
          </div>
          <div class="absolute inset-0 flex items-center justify-center px-4">
            <div class="bg-black/60 rounded p-2 w-full text-center space-y-1 max-h-[70%] overflow-y-auto mt-8 pt-4">
              ${productos
                .split(',')
                .map(prod => `<p class="text-white text-sm md:text-base font-bold uppercase tracking-wide">${prod.trim()}</p>`)
                .join('')}
            </div>
          </div>
        </div>
        <div class="bg-white px-4 py-2 flex flex-row justify-between items-center">
          <p class="text-base font-bold text-red-700">$${precio.toLocaleString('es-AR')}</p>
          <button class="bg-red-700 hover:bg-red-800 text-white text-sm px-3 py-1 rounded add-to-cart">
            Agregar al carrito
          </button>
        </div>
      `;

      const boton = card.querySelector('.add-to-cart');
      boton.addEventListener('click', () => {
        carrito.push({ nombre, precio, productos });
        localStorage.setItem('carrito', JSON.stringify(carrito));
        actualizarTotal();

        boton.classList.add('scale-110', 'transition', 'duration-150');
        setTimeout(() => boton.classList.remove('scale-110'), 150);
      });

      combosContainer.appendChild(card);
    });

    // Al final, agregar card de "Armá tu propio combo"
    crearCardArmarCombo();

    actualizarTotal();
  })
  .catch(error => console.error('Error al cargar los datos:', error));

// =============================
// FUNCIONES CARRO
// =============================
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
    if (existente) existente.cantidad += 1;
    else agrupado.push({ ...item, cantidad: 1 });
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

document.getElementById('ver-carrito').addEventListener('click', () => {
  if (carrito.length === 0) { alert('El carrito está vacío.'); return; }
  renderizarCarrito();
  modal.classList.remove('hidden');
});

cerrarModalBtn.addEventListener('click', () => modal.classList.add('hidden'));

enviarPedidoBtn.addEventListener('click', () => {
  if (carrito.length === 0) { alert('El carrito está vacío.'); return; }

  const nombre = nombreInput.value.trim();
  const entrega = entregaInput.value.trim();
  const metodoPago = Array.from(metodoPagoInputs).find(r => r.checked)?.value;

  if (!nombre || !entrega || !metodoPago) { alert('Por favor, completá todos los campos.'); return; }

  let mensaje = `*Pedido de Combos de Carnicería*\n\n*Cliente:* ${nombre}\n*Entrega:* ${entrega}\n*Método de pago:* ${metodoPago}\n\n`;
  const agrupado = agruparCarrito(carrito);
  agrupado.forEach(item => {
    mensaje += `*${item.nombre}* x${item.cantidad} - $${(item.precio * item.cantidad).toLocaleString('es-AR')}\n`;
    item.productos.split(',').forEach(prod => mensaje += `  - ${prod.trim()}\n`);
    mensaje += `\n`;
  });
  mensaje += `*Total:* $${carrito.reduce((sum, item) => sum + item.precio, 0).toLocaleString('es-AR')}`;

  const numeroWhatsApp = '5492213074708';
  window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');

  carrito = [];
  localStorage.removeItem('carrito');
  actualizarTotal();
  modal.classList.add('hidden');
  nombreInput.value = '';
  entregaInput.value = '';
  metodoPagoInputs.forEach(r => r.checked = false);
});

// =============================
// ARMAR TU PROPIO COMBO
// =============================
const modalArmarCombo = document.getElementById('modal-armar-combo');
const listaProductos = document.getElementById('lista-productos');
const btnCancelarCombo = document.getElementById('cancelar-combo');
const btnAgregarCombo = document.getElementById('agregar-combo-carrito');
let productosData = [];

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
  `;
  combosContainer.appendChild(card);

  card.addEventListener('click', abrirModalArmarCombo);
}

function abrirModalArmarCombo() {
  fetch(`https://opensheet.elk.sh/${SHEET_ID}/Productos`)
    .then(res => res.json())
    .then(data => {
      productosData = data;
      listaProductos.innerHTML = '';

      data.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center border-b py-2 gap-4';

        const nombreSpan = document.createElement('span');
        nombreSpan.className = 'text-gray-700 flex-1';
        nombreSpan.textContent = `${prod.Producto} ($${parseFloat(prod.Precio).toLocaleString('es-AR')}/kg)`;

        const input = document.createElement('input');
        input.type = 'number';
        input.min = 0;
        input.step = 0.5;
        input.value = 0;
        input.className = 'w-16 border rounded p-1 producto-cantidad';
        input.dataset.precio = prod.Precio;
        input.dataset.nombre = prod.Producto;

        const unidadSpan = document.createElement('span');
        unidadSpan.textContent = 'kg';
        unidadSpan.className = 'text-gray-700 ml-1 w-6';

        const totalSpan = document.createElement('span');
        totalSpan.className = 'font-bold text-red-700 w-24 text-right';
        totalSpan.textContent = '$0';

        input.addEventListener('input', () => {
          const cantidad = parseFloat(input.value) || 0;
          totalSpan.textContent = `$${(cantidad * parseFloat(input.dataset.precio)).toLocaleString('es-AR')}`;
          actualizarTotalModal();
        });

        div.appendChild(nombreSpan);
        div.appendChild(input);
        div.appendChild(unidadSpan);
        div.appendChild(totalSpan);

        listaProductos.appendChild(div);
      });

      const totalGeneralDiv = document.createElement('div');
      totalGeneralDiv.id = 'total-general-combo';
      totalGeneralDiv.className = 'mt-4 text-right font-bold text-red-700 text-lg';
      totalGeneralDiv.textContent = 'Total: $0';
      listaProductos.appendChild(totalGeneralDiv);

      modalArmarCombo.classList.remove('hidden');
    });
}

function actualizarTotalModal() {
  const inputs = listaProductos.querySelectorAll('.producto-cantidad');
  let total = 0;
  inputs.forEach(input => {
    total += (parseFloat(input.value) || 0) * parseFloat(input.dataset.precio);
  });
  const totalDiv = document.getElementById('total-general-combo');
  if (totalDiv) totalDiv.textContent = `Total: $${total.toLocaleString('es-AR')}`;
}

btnCancelarCombo.addEventListener('click', () => modalArmarCombo.classList.add('hidden'));

btnAgregarCombo.addEventListener('click', () => {
  const inputs = listaProductos.querySelectorAll('.producto-cantidad');
  let comboNombre = 'Combo personalizado';
  let comboProductos = [];
  let comboPrecio = 0;

  inputs.forEach(input => {
    const cantidad = parseFloat(input.value);
    if (cantidad > 0) {
      const nombre = input.dataset.nombre;
      const precioUnit = parseFloat(input.dataset.precio);
      comboProductos.push(`${nombre} (${cantidad} kg)`);
      comboPrecio += precioUnit * cantidad;
    }
  });

  if (comboProductos.length === 0) {
    alert('Seleccioná al menos un producto.');
    return;
  }

  carrito.push({
    nombre: comboNombre,
    productos: comboProductos.join(', '),
    precio: comboPrecio
  });

  actualizarTotal();
  modalArmarCombo.classList.add('hidden');
});
