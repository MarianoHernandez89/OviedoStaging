// ============================= CONFIGURACIÓN =============================
const SHEET_ID = "TU_SHEET_ID";
const SHEET_NAME_COMBOS = "Combos";
const SHEET_NAME_PRODUCTOS = "Productos";
const URL_COMBOS = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME_COMBOS}`;
const URL_PRODUCTOS = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME_PRODUCTOS}`;

const combosContainer = document.getElementById("combos-container");
const contadorCarrito = document.getElementById("contador-carrito");
const totalCarritoEl = document.getElementById("total");
const listaCarrito = document.getElementById("lista-carrito");

const modalCarrito = document.getElementById("modal-carrito");
const btnVerCarrito = document.getElementById("ver-carrito");
const btnCancelar = document.getElementById("cancelar");
const btnEnviarWhatsapp = document.getElementById("enviar-whatsapp");

const modalArmarCombo = document.getElementById("modal-armar-combo");
const listaProductos = document.getElementById("lista-productos");
const btnCancelarCombo = document.getElementById("cancelar-combo");
const btnAgregarCombo = document.getElementById("agregar-combo-carrito");

// Estado
let carrito = [];
let productosDisponibles = [];

// ============================= CARGA DE COMBOS =============================
async function cargarCombos() {
  const res = await fetch(URL_COMBOS);
  const combos = await res.json();

  combos.forEach((combo) => {
    const card = document.createElement("div");
    card.className =
      "relative rounded-xl shadow-lg overflow-hidden bg-cover bg-center flex flex-col";
    card.style.backgroundImage = `url(${combo.Imagen})`;

    card.innerHTML = `
      <div class="bg-black/50 p-4 flex flex-col flex-grow justify-between">
        <div>
          <h2 class="text-xl font-bold text-white mb-2">${combo.Nombre}</h2>
          <p class="text-sm text-gray-200 mb-2">${combo.Productos}</p>
        </div>
        <div>
          <p class="text-lg font-bold text-white mb-2">$${combo.Precio}</p>
          <button class="agregar bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded">
            Agregar
          </button>
        </div>
      </div>
    `;

    card.querySelector(".agregar").addEventListener("click", () => {
      agregarAlCarrito({
        nombre: combo.Nombre,
        precio: parseFloat(combo.Precio),
        cantidad: 1,
      });
    });

    combosContainer.appendChild(card);
  });

  // Ahora cargamos la card de "Armá tu propio combo"
  cargarCardArmarCombo();
}

// ============================= CARD ARMAR COMBO =============================
function cargarCardArmarCombo() {
  const card = document.createElement("div");
  card.className =
    "relative rounded-xl shadow-lg overflow-hidden bg-cover bg-center flex flex-col";
  card.style.backgroundImage =
    "url('https://i.imgur.com/yaM0F7y.jpg')"; // imagen de fondo personalizada

  card.innerHTML = `
    <div class="bg-black/50 p-4 flex flex-col flex-grow justify-between">
      <div>
        <h2 class="text-xl font-bold text-white mb-2">Armá tu propio combo</h2>
        <p class="text-sm text-gray-200 mb-2">Elegí los productos y cantidades</p>
      </div>
      <div>
        <button id="abrir-armar-combo" class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded">
          Armar Combo
        </button>
      </div>
    </div>
  `;

  card.querySelector("#abrir-armar-combo").addEventListener("click", async () => {
    await cargarProductos();
    modalArmarCombo.classList.remove("hidden");
  });

  // Se agrega al FINAL
  combosContainer.appendChild(card);
}

// ============================= CARGA DE PRODUCTOS =============================
async function cargarProductos() {
  const res = await fetch(URL_PRODUCTOS);
  productosDisponibles = await res.json();

  listaProductos.innerHTML = "";

  productosDisponibles.forEach((prod, index) => {
    const row = document.createElement("div");
    row.className = "flex justify-between items-center border-b pb-2";

    row.innerHTML = `
      <span class="flex-1">${prod.Producto}</span>
      <div class="flex items-center gap-2">
        <button class="menos bg-gray-300 px-2 rounded">-</button>
        <input 
          type="number" 
          step="0.5" 
          min="0" 
          value="0" 
          class="cantidad w-16 text-center border rounded" 
          data-precio="${prod.Precio}" 
          data-nombre="${prod.Producto}"
        />
        <button class="mas bg-gray-300 px-2 rounded">+</button>
        <span class="ml-2">$<span class="subtotal">0</span></span>
      </div>
    `;

    // Botón menos
    row.querySelector(".menos").addEventListener("click", () => {
      const input = row.querySelector(".cantidad");
      let val = parseFloat(input.value);
      if (val > 0) {
        val = Math.max(0, val - 0.5);
        input.value = val.toFixed(1);
        actualizarSubtotal(row);
      }
    });

    // Botón más
    row.querySelector(".mas").addEventListener("click", () => {
      const input = row.querySelector(".cantidad");
      let val = parseFloat(input.value);
      val += 0.5;
      input.value = val.toFixed(1);
      actualizarSubtotal(row);
    });

    // Input manual
    row.querySelector(".cantidad").addEventListener("input", () => {
      actualizarSubtotal(row);
    });

    listaProductos.appendChild(row);
  });

  // Agregamos el totalizador al final
  const totalDiv = document.createElement("div");
  totalDiv.className = "text-right font-bold mt-4";
  totalDiv.innerHTML = `Total: $<span id="total-combo">0</span>`;
  listaProductos.appendChild(totalDiv);
}

function actualizarSubtotal(row) {
  const input = row.querySelector(".cantidad");
  const subtotalEl = row.querySelector(".subtotal");
  const precio = parseFloat(input.dataset.precio);
  const cantidad = parseFloat(input.value);

  const subtotal = cantidad * precio;
  subtotalEl.textContent = subtotal.toLocaleString("es-AR");

  actualizarTotalCombo();
}

function actualizarTotalCombo() {
  const cantidades = listaProductos.querySelectorAll(".cantidad");
  let total = 0;
  cantidades.forEach((input) => {
    const precio = parseFloat(input.dataset.precio);
    const cantidad = parseFloat(input.value);
    total += precio * cantidad;
  });

  const totalEl = document.getElementById("total-combo");
  if (totalEl) {
    totalEl.textContent = total.toLocaleString("es-AR");
  }
}

// ============================= CARRITO =============================
function agregarAlCarrito(producto) {
  carrito.push(producto);
  actualizarCarrito();
}

function actualizarCarrito() {
  listaCarrito.innerHTML = "";
  let total = 0;

  carrito.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "flex justify-between items-center mb-2";

    div.innerHTML = `
      <span>${item.nombre} (x${item.cantidad})</span>
      <span>$${(item.precio * item.cantidad).toLocaleString("es-AR")}</span>
      <button class="text-red-600" data-index="${index}">✖</button>
    `;

    div.querySelector("button").addEventListener("click", () => {
      carrito.splice(index, 1);
      actualizarCarrito();
    });

    listaCarrito.appendChild(div);
    total += item.precio * item.cantidad;
  });

  contadorCarrito.textContent = carrito.length;
  totalCarritoEl.textContent = total.toLocaleString("es-AR");
}

// ============================= EVENTOS DEL MODAL CARRITO =============================
btnVerCarrito.addEventListener("click", () =>
  modalCarrito.classList.remove("hidden")
);
btnCancelar.addEventListener("click", () =>
  modalCarrito.classList.add("hidden")
);

// ============================= EVENTOS DEL MODAL ARMAR COMBO =============================
btnCancelarCombo.addEventListener("click", () =>
  modalArmarCombo.classList.add("hidden")
);

btnAgregarCombo.addEventListener("click", () => {
  const cantidades = listaProductos.querySelectorAll(".cantidad");
  let productosSeleccionados = [];
  let total = 0;

  cantidades.forEach((input) => {
    const cantidad = parseFloat(input.value);
    if (cantidad > 0) {
      const nombre = input.dataset.nombre;
      const precio = parseFloat(input.dataset.precio);
      productosSeleccionados.push(`${cantidad} kg de ${nombre}`);
      total += cantidad * precio;
    }
  });

  if (productosSeleccionados.length > 0) {
    agregarAlCarrito({
      nombre: "Combo personalizado: " + productosSeleccionados.join(", "),
      precio: total,
      cantidad: 1,
    });
  }

  modalArmarCombo.classList.add("hidden");
});

// ============================= INICIO =============================
cargarCombos();
