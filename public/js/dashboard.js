let currentUserRole = null;
let currentUser = null;
async function loadCurrentUser() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    const data = await res.json();
    if (data.success) {
      currentUser = data.data;
      currentUserRole = currentUser?.rol;
  }
  } catch (err) {
    console.warn('No se pudo obtener el usuario actual', err);
  }
}
let modulesConfig = {
  clientes: true,
  proyectos: true,
  pedidos: true,
  trabajadores: true,
  materiales: true,
  fichajes: true
};
async function loadModulesConfig() {
  try {
    const res = await fetch('/api/config/modules', { credentials: 'same-origin' });
    const data = await res.json();
    if (data.success && data.modules) modulesConfig = data.modules;
  } catch (err) {
    console.warn('No se pudo cargar configuración de módulos', err);
  }

  // Oculta los ítems de menú deshabilitados
  document.querySelectorAll('[data-view]').forEach(link => {
    const v = link.getAttribute('data-view');
    if (modulesConfig[v] === false) link.closest('li')?.classList.add('d-none');
  });
}

function firstEnabledView() {
  const order = ['clientes', 'proyectos', 'pedidos', 'trabajadores',"fichajes"];
  return order.find(v => modulesConfig[v] !== false);
}
// === Cargar una vista HTML dinámica ===
async function loadView(view) {
  // Si el view incluye subcarpeta, asumimos que viene tipo "clientes/nuevo"
  const path = view.includes('/') ? `/views/${view}.html` : `/views/${view}/index.html`;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Error al cargar vista ${view}`);
  const html = await res.text();
  document.getElementById('app-content').innerHTML = html;
  return html;
}

// === Navegación SPA con historial ===
async function navigateTo(view, headers, push = true) {
  try {
    if (modulesConfig[view] === false) throw new Error(`Módulo ${view} deshabilitado`);
    if (currentUserRole === 'trabajador') {
      const prohibidas = ['clientes', 'proyectos', 'pedidos', 'trabajadores', 'materiales', 'materiales/nuevo', 'materiales/editar']; // deja solo las que quieras permitir, por ejemplo peticiones;
      if (prohibidas.includes(view)) throw new Error('Módulo deshabilitado para tu rol');
    }


    await loadView(view);

    // Cargar la lógica específica según vista
    if (view === 'clientes') await initClientes(headers);
    if (view === 'clientes/nuevo') initNuevoClienteForm(headers);
    if (view === 'clientes/editar') console.log('Vista editar cargada'); // se inicializa al pasar datos

    if (view === 'proyectos') await initProyectos(headers);
    if (view === 'proyectos/nuevo') initNuevoProyectoForm(headers);
   if (view === 'proyectos/editar') {
    const proyecto = JSON.parse(sessionStorage.getItem("proyectoEdit"));
    initEditarProyectoForm(proyecto, headers);
}

    if (view === 'pedidos') await initPedidos(headers);
    if (view === 'pedidos/nuevo') initNuevoPedidoForm(headers);
    if (view === 'pedidos/editar') {
    const pedido = JSON.parse(sessionStorage.getItem("pedidoEdit"));
    initEditarPedidoForm(pedido, headers);
}


    if (view === 'pedidos/albaranes/index') await initAlbaranes(headers);
    if (view === 'pedidos/albaranes/nuevo') initNuevoAlbaranForm(headers);
    if (view === 'pedidos/albaranes/editar') console.log('Vista editar albarán cargada');

    if (view === 'trabajadores') await initTrabajadores(headers);
    if (view === 'trabajadores/nuevo') initNuevoTrabajadorForm(headers);
    if (view === 'trabajadores/editar') initEditarTrabajadorForm(headers);


    if (view === 'materiales') await initMateriales(headers);
    if (view === 'materiales/nuevo') initNuevoMaterialForm(headers);
    if (view === 'materiales/editar') initEditarMaterialForm(headers);
    if (view === 'materiales/peticiones/index') await initPeticionesMaterial(headers);
    if (view === 'materiales/peticiones/nuevo') initNuevoPeticionMaterialForm(headers);

    
    if (view === 'fichajes/fichar') await initFichajesFichar(headers);
    if (view === 'fichajes/listado') await initFichajesListado(headers);
    if (view === 'fichajes/pausas') await initFichajesPausas(headers);
    if (view === 'fichajes/motivos') await initFichajesMotivos(headers);





    // Guardar en historial
    if (push) history.pushState({ view }, '', `#/${view}`);
  } catch (err) {
    console.error(err);
    document.getElementById('app-content').innerHTML =
      `<div class="alert alert-danger">Error al cargar ${view}</div>`;
  }
}

// === Clicks de menú lateral ===
document.querySelectorAll('a[data-view]').forEach(link => {
  link.addEventListener('click', async e => {
    e.preventDefault();
    const view = e.currentTarget.getAttribute('data-view');
    if (currentUserRole === 'trabajador') {
      const prohibidas = ['clientes', 'proyectos', 'pedidos', 'trabajadores', 'materiales', 'materiales/nuevo', 'materiales/editar'];
      if (prohibidas.includes(view)) {
        alert('No tienes acceso a este módulo');
        return;
      }
    }
    const headers = {};
    await navigateTo(view, headers, true);
  });
});
// Toggle manual del submenú de Materiales
const toggleMaterialesBtn = document.getElementById('toggleMateriales');
toggleMaterialesBtn?.addEventListener('click', () => {
  const submenu = document.getElementById('materialesSubmenu');
  const icon = document.getElementById('toggleMaterialesIcon');
  if (!submenu) return;
  submenu.classList.toggle('show');
  if (icon) icon.textContent = submenu.classList.contains('show') ? '▴' : '▾';
});
// Desplegar manualmente los grupos del menú
document.querySelectorAll('.nav-group-toggle').forEach(toggle => {
  toggle.addEventListener('click', e => {
    e.preventDefault();
    const parent = toggle.closest('.nav-group');
    parent?.classList.toggle('show');
  });
});

// === Botones atrás / adelante del navegador ===
window.addEventListener('popstate', async e => {
  const headers = {};

  // Si hay estado, úsalo. Si no, obtén la vista desde la URL.
  let view = e.state?.view;

  if (!view) {
    view = location.hash.replace('#/', '') || 'clientes';
  }

  await navigateTo(view, headers, false);
});

////////////////////////////////////////////////////////////////////// CLIENTES //////////////////////////////////////////////////////////////////////////////////
// === Listado de clientes ===
async function initClientes(headers) {
  const tbody = document.querySelector('#tablaClientes tbody');
  if (!tbody) {
    console.error('No se encontró la tabla de clientes en la vista cargada');
    return;
  }

  const resClientes = await fetch('/api/clientes', { headers });
  const clientes = await resClientes.json();

  tbody.innerHTML = clientes.data.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.nombrefiscal}</td>
      <td>${c.telefono || ''}</td>
      <td>${c.email || ''}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-light border btn-editar" data-id="${c.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-pencil"></use></svg>
        </button>
        <button class="btn btn-sm btn-light border text-danger btn-eliminar" data-id="${c.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-trash"></use></svg>
        </button>
      </td>
    </tr>
  `).join('');

  // Nuevo cliente
  const nuevoBtn = document.getElementById('nuevoClienteBtn');
  if (nuevoBtn) {
    nuevoBtn.addEventListener('click', async () => {
      await navigateTo('clientes/nuevo', headers);
    });
  }

  // Editar cliente
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = e.currentTarget.dataset.id;
      const res = await fetch(`/api/clientes/${id}`, { headers });
      const cliente = await res.json();

      await loadView('clientes/editar');
      history.pushState({ view: 'clientes/editar' }, '', '#/clientes/editar');
      initEditarClienteForm(cliente.data, headers);
    });
  });

  // Eliminar cliente
  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = e.currentTarget.dataset.id;
      if (!confirm('¿Seguro que deseas eliminar este cliente?')) return;
      await fetch(`/api/clientes/${id}`, { method: 'DELETE', headers });
      alert('Cliente eliminado');
      await navigateTo('clientes', headers);
    });
  });
}

// === Formulario nuevo cliente ===
function initNuevoClienteForm(headers) {
  const form = document.getElementById('formNuevoCliente');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      alert('Cliente creado correctamente');
      await navigateTo('clientes', headers);
    }
  });

  document.getElementById('volverClientesBtn').addEventListener('click', async () => {
    await navigateTo('clientes', headers);
  });

  const volverInferior = document.getElementById('volverClientesBtnBottom');
  if (volverInferior) {
    volverInferior.addEventListener('click', async () => {
      await navigateTo('clientes', headers);
    });
  }
}

// === Formulario editar cliente ===
function initEditarClienteForm(cliente, headers) {
  const form = document.getElementById('formEditarCliente');
  const btnGuardar = document.getElementById('btnGuardar');

  // Rellenamos valores originales
  for (const key in cliente) {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) input.value = cliente[key] ?? '';
  }

  // Guardamos los datos iniciales para comparar
  const initialData = new FormData(form);

  // Función para comprobar cambios
  const checkChanges = () => {
    const currentData = new FormData(form);

    for (const [key, value] of currentData.entries()) {
      if (value !== initialData.get(key)) {
        btnGuardar.disabled = false; // Se ha modificado algo
        return;
      }
    }
    btnGuardar.disabled = true; // No hay cambios
  };

  // Detectar cambios en cualquier input
  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', checkChanges);
  });

  // Acción al enviar
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());

    await fetch(`/api/clientes/${cliente.id}`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    alert("Cliente actualizado correctamente");
    document.querySelector('[data-view="clientes"]').click();
  });
}
////////////////////////////////////////////////////////////////////// PROYECTOS //////////////////////////////////////////////////////////////////////////////////
async function initProyectos(headers) {
  const tbody = document.querySelector('#tablaProyectos tbody');
  if (!tbody) return;


  const res = await fetch('/api/proyectos', { headers });
  const proyectos = await res.json();

  tbody.innerHTML = proyectos.data.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.nombreproyecto || ''}</td>
      <td>${p.cliente?.nombrefiscal || ''}</td>
      
      <td class="text-end">
        <button class="btn btn-sm btn-light border btn-editar" data-id="${p.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-pencil"></use></svg>
        </button>
        <button class="btn btn-sm btn-light border text-danger btn-eliminar" data-id="${p.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-trash"></use></svg>
        </button>
      </td>
    </tr>
  `).join('');

  // Nuevo proyecto
document.getElementById('nuevoProyectoBtn').addEventListener('click', async () => {
  await navigateTo('proyectos/nuevo', headers);
});


  // Editar proyecto
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = e.currentTarget.dataset.id;
      const res = await fetch(`/api/proyectos/${id}`, { headers });
      const proyecto = await res.json();

      sessionStorage.setItem("proyectoEdit", JSON.stringify(proyecto.data));
      await navigateTo('proyectos/editar', headers);
    });
  });

  // Eliminar proyecto
  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = e.currentTarget.dataset.id;
      if (!confirm("¿Eliminar proyecto?")) return;

      await fetch(`/api/proyectos/${id}`, { method: 'DELETE', headers });
      document.querySelector('[data-view="proyectos"]').click();
    });
  });
}
function initNuevoProyectoForm(headers) {
    const form = document.getElementById('formNuevoProyecto');
    const btnCrear = document.getElementById('btnCrearProyecto');
    const idClienteInput = form.querySelector('[name="idcliente"]');
    const nombreInput = form.querySelector('[name="nombreproyecto"]');

    const checkValid = () => {
        btnCrear.disabled = !(idClienteInput.value && nombreInput.value.trim() !== "");
    };

    form.querySelectorAll("input").forEach(input =>
        input.addEventListener("input", checkValid)
    );
  // 🔍 enganchar autocompletado
  attachClienteAutocomplete(headers);
    // Al enviar
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = Object.fromEntries(new FormData(form).entries());

        const res = await fetch(`/api/proyectos`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            alert("Error al crear proyecto.");
            return;
        }

        alert("Proyecto creado correctamente");
        document.querySelector('[data-view="proyectos"]').click();
    });

    // Activar/desactivar botón al inicio
    checkValid();
}



function initEditarProyectoForm(proyecto, headers) {
  const form = document.getElementById('formEditarProyecto');
  const btnGuardar = document.getElementById('btnGuardarProyecto');

  // Rellenar inputs automáticamente
  Object.keys(proyecto).forEach(key => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) input.value = proyecto[key] ?? '';
  });

  // Rellenar cliente visible
  document.getElementById('clienteInput').value = proyecto.cliente?.nombrefiscal || '';
 // Activar autocompletado
  attachClienteAutocomplete(headers);
  // Deshabilitar inicialmente
  btnGuardar.disabled = true;

  const initial = new FormData(form);

  const checkChanges = () => {
    const now = new FormData(form);
    for (const [k, v] of now) {
      if (v !== initial.get(k)) {
        btnGuardar.disabled = false;
        return;
      }
    }
    btnGuardar.disabled = true;
  };

  form.querySelectorAll('input').forEach(el => {
    el.addEventListener('input', checkChanges);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());

    await fetch(`/api/proyectos/${proyecto.id}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    alert("Proyecto actualizado");
    document.querySelector('[data-view="proyectos"]').click();
  });
}


function initBuscadorClientes(headers) {
    const input = document.getElementById("clienteInput");
    const hiddenId = document.getElementById("idcliente");
    const suggestionsBox = document.getElementById("clienteSuggestions");

    if (!input) return;

    let timeout = null;

    // Buscar clientes con debounce
    input.addEventListener("input", () => {
        const texto = input.value.trim();

        hiddenId.value = ""; // si cambia texto, resetea id
        suggestionsBox.innerHTML = "";

        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(async () => {
            if (texto.length < 2) return;

            const res = await fetch(`/api/clientes/buscar?texto=${encodeURIComponent(texto)}`, {
                headers
            });

            if (!res.ok) return;

            const data = await res.json();
            const clientes = data.data || [];

            suggestionsBox.innerHTML = "";

            clientes.forEach(cli => {
                const item = document.createElement("button");
                item.className = "list-group-item list-group-item-action";
                item.textContent = `${cli.id} - ${cli.nombrefiscal}`;
                item.addEventListener("click", () => {
                    input.value = cli.nombrefiscal;
                    hiddenId.value = cli.id;
                    suggestionsBox.innerHTML = "";
                });
                suggestionsBox.appendChild(item);
            });

        }, 300); // debounce 300ms
    });

    // Ocultar sugerencias si clicas fuera
    document.addEventListener("click", (e) => {
        if (!input.contains(e.target)) {
            suggestionsBox.innerHTML = "";
        }
    });
}

async function attachClienteAutocomplete(headers) {
  const input = document.getElementById('clienteInput');        // ✔ ID REAL
  const hidden = document.getElementById('idcliente');          // ✔ ID REAL
  const results = document.getElementById('clienteSuggestions'); // ✔ ID REAL

  if (!input || !hidden || !results) {
    console.warn('No se encontraron elementos para autocompletado de clientes (IDs incorrectos)');
    return;
  }

  let timeout = null;

  input.addEventListener('input', () => {
    const texto = input.value.trim();

    hidden.value = '';
    results.innerHTML = '';
    results.style.display = 'none';

    if (texto.length < 2) return;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clientes/buscar?texto=${encodeURIComponent(texto)}`, { headers });
        if (!res.ok) return;

        const json = await res.json();
        const clientes = json.data || [];

        results.innerHTML = '';

        if (!clientes.length) {
          results.innerHTML = `<div class="list-group-item text-muted">Sin resultados</div>`;
          results.style.display = 'block';
          return;
        }

        clientes.forEach(cli => {
          const item = document.createElement('button');
          item.type = "button";
          item.className = "list-group-item list-group-item-action";
          item.textContent = `${cli.id} - ${cli.nombrefiscal}`;

          item.addEventListener('click', () => {
            input.value = cli.nombrefiscal;
            hidden.value = cli.id;
            results.innerHTML = '';
            results.style.display = 'none';
          });

          results.appendChild(item);
        });

        results.style.display = 'block';

      } catch (err) {
        console.error("Error autocompletado:", err);
      }
    }, 250);
  });

  // Ocultar al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!results.contains(e.target) && e.target !== input) {
      results.innerHTML = '';
      results.style.display = 'none';
    }
  });
}
////////////////////////////////////////////////////////////////////// PEDIDOS //////////////////////////////////////////////////////////////////////////////////
async function initPedidos(headers) {
  const tbody = document.querySelector('#tablaPedidos tbody');
  if (!tbody) return;

  const res = await fetch('/api/pedidos', { headers });
  const pedidos = await res.json();

  tbody.innerHTML = pedidos.data.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.cliente?.nombrecomercial || ''}</td>
      <td>${p.pedido || ''}</td>
      <td>${p.fecha ? p.fecha.substring(0,10) : ''}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-light border btn-editar" data-id="${p.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-pencil"></use></svg>
        </button>
        <button class="btn btn-sm btn-light border text-danger btn-eliminar" data-id="${p.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-trash"></use></svg>
        </button>
        <button class="btn btn-sm btn-light border btn-albaranes" data-id="${p.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-description"></use></svg>
        </button>

      </td>
    </tr>
  `).join('');

  // nuevo
  document.getElementById('nuevoPedidoBtn').addEventListener('click', async () => {
     await navigateTo('pedidos/nuevo', headers, true);
  });

  // editar
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = btn.dataset.id;
      const res = await fetch(`/api/pedidos/${id}`, { headers });
      const pedido = await res.json();

      sessionStorage.setItem("pedidoEdit", JSON.stringify(pedido.data));
      await navigateTo('pedidos/editar', headers);

    });
  });

  // eliminar
  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = btn.dataset.id;
      if (!confirm("¿Eliminar pedido?")) return;

      await fetch(`/api/pedidos/${id}`, { method: "DELETE", headers });
      document.querySelector('[data-view="pedidos"]').click();
    });
  });

  document.querySelectorAll('.btn-albaranes').forEach(btn => {
  btn.addEventListener('click', async e => {
    const pedidoId = btn.dataset.id;

    // 🔥 Guardamos ID global
    sessionStorage.setItem("pedidoId", pedidoId);

    await navigateTo('pedidos/albaranes/index', headers);
  });
});

}
function initNuevoPedidoForm(headers) {
  const form = document.getElementById('formNuevoPedido');
  const btn = document.getElementById('btnCrearPedido');

  const idClienteInput = document.getElementById('idcliente');
  const checkValid = () => btn.disabled = !idClienteInput.value;
  form.querySelectorAll('input').forEach(i => i.addEventListener('input', checkValid));

  attachClienteAutocomplete(headers);

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/api/pedidos', {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) return alert("Error al crear pedido");

    alert("Pedido creado");
    document.querySelector('[data-view="pedidos"]').click();
  });

 
  checkValid();
}
function initEditarPedidoForm(pedido, headers) {
  const form = document.getElementById('formEditarPedido');
  const btnGuardar = document.getElementById('btnGuardarPedido');

  Object.keys(pedido).forEach(k => {
    const input = form.querySelector(`[name="${k}"]`);
    if (input) input.value = pedido[k] ?? '';
  });

  document.getElementById('clienteInput').value = pedido.cliente?.nombrecomercial || '';
  attachClienteAutocomplete(headers);

  btnGuardar.disabled = true;
  const initial = new FormData(form);

  form.querySelectorAll('input').forEach(el =>
    el.addEventListener('input', () => {
      const now = new FormData(form);
      for (const [k, v] of now)
        if (v !== initial.get(k)) return btnGuardar.disabled = false;
      btnGuardar.disabled = true;
    })
  );

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    await fetch(`/api/pedidos/${pedido.id}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    alert("Pedido actualizado");
    document.querySelector('[data-view="pedidos"]').click();
  });
}
////////////////////////////////////////////////////////////////////////  ALBARANES   //////////////////////////////////////////////////////////////////
async function initAlbaranes(headers) {
  const pedidoId = sessionStorage.getItem("pedidoId");
  if (!pedidoId) return;
  // === Mostrar número del pedido en el título ===
  const titulo = document.getElementById("tituloAlbaranes");
  if (titulo) {
    titulo.textContent = `Albaranes del pedido ${pedidoId}`;
  }

  const tbody = document.querySelector('#tablaAlbaranes tbody');

  const res = await fetch(`/api/albaranes/pedido/${pedidoId}`, { headers });
  const json = await res.json();
  const albaranes = json.albaranes || [];

  tbody.innerHTML = albaranes.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${a.fecha ? a.fecha.substring(0,10) : ''}</td>
      <td>${a.serie || ''}</td>
      <td>${a.nalbaran || ''}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-light border btn-editar" data-id="${a.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-pencil"></use></svg>
        </button>
        <button class="btn btn-sm btn-light border text-danger btn-eliminar" data-id="${a.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-trash"></use></svg>
        </button>
      </td>
    </tr>
  `).join('');

  // Nuevo albarán
  document.getElementById("nuevoAlbaranBtn").addEventListener("click", async () => {
    await navigateTo('pedidos/albaranes/nuevo', headers);
  });

  // Editar
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const res = await fetch(`/api/albaranes/${id}`, { headers });
      const data = await res.json();
      sessionStorage.setItem("albaranEdit", JSON.stringify(data.albaran));
      await navigateTo('pedidos/albaranes/editar', headers);
    });
  });

  // Eliminar
  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm("¿Eliminar albarán?")) return;

      await fetch(`/api/albaranes/${id}`, { method: "DELETE", headers });
      navigateTo("pedidos/albaranes/index", headers);
    });
  });

  // Botón volver
  
}
function initNuevoAlbaranForm(headers) {
  const pedidoId = sessionStorage.getItem("pedidoId");

  document.getElementById("crearAlbaranBtn").addEventListener("click", async () => {
    const res = await fetch(`/api/albaranes`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ pedidoId })
    });

    const json = await res.json();

    if (!json.ok) return alert("Error: " + json.error);

    alert("Albarán creado");
    navigateTo("pedidos/albaranes/index", headers);
  });


}
function initEditarAlbaranForm(headers) {
  const albaran = JSON.parse(sessionStorage.getItem("albaranEdit"));
  const pedidoId = albaran.pedidoId;

  const form = document.getElementById("formEditarAlbaran");

  form.fecha.value = albaran.fecha ? albaran.fecha.substring(0,10) : '';
  form.observacion.value = albaran.observacion || '';

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const payload = Object.fromEntries(new FormData(form).entries());

    await fetch(`/api/albaranes/${albaran.id}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    alert("Albarán actualizado");
    navigateTo("pedidos/albaranes", headers);
  });


}
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btnVolver') {
        history.back();
    }
});
////////////////////////////////////////////////////////////////////// TRABAJADORES //////////////////////////////////////////////////////////////////////////////////

// Listado de trabajadores
async function initTrabajadores(headers) {
  const tbody = document.querySelector('#tablaTrabajadores tbody');
  if (!tbody) {
    console.error('No se encontró la tabla de trabajadores en la vista cargada');
    return;
  }

  const res = await fetch('/api/trabajadores', { headers });
  const trabajadores = await res.json();

  tbody.innerHTML = trabajadores.data.map(t => `
    <tr>
      <td>${t.id}</td>
      <td>${t.nombrefiscal || t.nombrecomercial || ''}</td>
      <td>${t.telefono || t.movil || ''}</td>
      <td>${t.email || ''}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-light border btn-editar" data-id="${t.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-pencil"></use></svg>
        </button>
        <button class="btn btn-sm btn-light border text-danger btn-eliminar" data-id="${t.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-trash"></use></svg>
        </button>
      </td>
    </tr>
  `).join('');

  // Nuevo
  const nuevoBtn = document.getElementById('nuevoTrabajadorBtn');
  if (nuevoBtn) {
    nuevoBtn.addEventListener('click', async () => {
      await navigateTo('trabajadores/nuevo', headers);
    });
  }

  // Editar
  tbody.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const resItem = await fetch(`/api/trabajadores/${id}`, { headers });
      const data = await resItem.json();
      if (!data.data) return alert('No se pudo cargar el trabajador');
      sessionStorage.setItem('trabajadorEdit', JSON.stringify(data.data));
      await navigateTo('trabajadores/editar', headers);
    });
  });

  // Eliminar
  tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('¿Eliminar trabajador?')) return;
      await fetch(`/api/trabajadores/${id}`, { method: 'DELETE', headers });
      await navigateTo('trabajadores', headers, false);
    });
  });
}

// Formulario nuevo trabajador
function initNuevoTrabajadorForm(headers) {
  const form = document.getElementById('formNuevoTrabajador');
  if (!form) return;

  const btnsVolver = [
    document.getElementById('volverTrabajadoresBtn'),
    document.getElementById('volverTrabajadoresBtnBottom')
  ].filter(Boolean);
  btnsVolver.forEach(btn => btn.addEventListener('click', () => navigateTo('trabajadores', headers)));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/api/trabajadores', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) return alert(json.message || 'Error al crear');
    alert('Trabajador creado');
    await navigateTo('trabajadores', headers);
  });
}

// Formulario editar trabajador
function initEditarTrabajadorForm(headers) {
  const form = document.getElementById('formEditarTrabajador');
  const data = JSON.parse(sessionStorage.getItem('trabajadorEdit') || 'null');
  if (!form || !data) return;

  // Prefill
  Object.keys(data).forEach(k => {
    const input = form.querySelector(`[name="${k}"]`);
    if (input) input.value = data[k] ?? '';
  });

  const btnsVolver = [
    document.getElementById('btnVolver'),
    document.getElementById('btnVolverBottom')
  ].filter(Boolean);
  btnsVolver.forEach(btn => btn.addEventListener('click', () => navigateTo('trabajadores', headers)));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const res = await fetch(`/api/trabajadores/${data.id}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) return alert(json.message || 'Error al actualizar');
    alert('Trabajador actualizado');
    await navigateTo('trabajadores', headers);
  });
}

////////////////////////////////////////////////////////////////////// MATERIALES //////////////////////////////////////////////////////////////////////////////////
async function initMateriales(headers) {
  const tbody = document.querySelector('#tablaMateriales tbody');
  if (!tbody) return;
  const res = await fetch('/api/materiales', { headers });
  const json = await res.json();
  const items = json.data || [];

  tbody.innerHTML = items.map(m => `
    <tr>
      <td>${m.id}</td>
      <td>${m.descripcion || ''}</td>
      <td>${m.idcloud || ''}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-light border btn-editar" data-id="${m.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-pencil"></use></svg>
        </button>
        <button class="btn btn-sm btn-light border text-danger btn-eliminar" data-id="${m.id}">
          <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-trash"></use></svg>
        </button>
      </td>
    </tr>
  `).join('');

  document.getElementById('nuevoMaterialBtn')?.addEventListener('click', async () => {
    await navigateTo('materiales/nuevo', headers);
  });

  tbody.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const resItem = await fetch(`/api/materiales/${id}`, { headers });
      const data = await resItem.json();
      if (!data.data) return alert('No se pudo cargar el material');
      sessionStorage.setItem('materialEdit', JSON.stringify(data.data));
      await navigateTo('materiales/editar', headers);
    });
  });

  tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('¿Eliminar material?')) return;
      await fetch(`/api/materiales/${id}`, { method: 'DELETE', headers });
      await navigateTo('materiales', headers, false);
    });
  });
}

function initNuevoMaterialForm(headers) {
  const form = document.getElementById('formNuevoMaterial');
  if (!form) return;

  [document.getElementById('volverMaterialesBtn'), document.getElementById('volverMaterialesBtnBottom')]
    .filter(Boolean)
    .forEach(btn => btn.addEventListener('click', () => navigateTo('materiales', headers)));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/api/materiales', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) return alert(json.message || 'Error al crear material');
    alert('Material creado');
    await navigateTo('materiales', headers);
  });
}

function initEditarMaterialForm(headers) {
  const form = document.getElementById('formEditarMaterial');
  const data = JSON.parse(sessionStorage.getItem('materialEdit') || 'null');
  if (!form || !data) return;

  Object.keys(data).forEach(k => {
    const input = form.querySelector(`[name="${k}"]`);
    if (input) input.value = data[k] ?? '';
  });

  [document.getElementById('btnVolver'), document.getElementById('btnVolverBottom')]
    .filter(Boolean)
    .forEach(btn => btn.addEventListener('click', () => navigateTo('materiales', headers)));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const res = await fetch(`/api/materiales/${data.id}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) return alert(json.message || 'Error al actualizar material');
    alert('Material actualizado');
    await navigateTo('materiales', headers);
  });
}
async function initPeticionesMaterial(headers) {
  let firmaPad = null;
let firmaModal = null;
let firmaPeticionId = null;
  if (!currentUser) {
  await loadCurrentUser(); // fetch /api/auth/me
    }
    const nuevaPeticionBtn = document.getElementById('nuevaPeticionMaterialBtn');
    if (currentUserRole === 'trabajador') {
      nuevaPeticionBtn?.classList.remove('d-none');
      nuevaPeticionBtn?.addEventListener('click', () => navigateTo('materiales/peticiones/nuevo', headers));
    } else {
      nuevaPeticionBtn?.classList.add('d-none');
    }


  const tbody = document.querySelector('#tablaPeticionesMaterial tbody');
  if (!tbody) return;
  let url = '/api/peticiones-material';
  if (currentUserRole === 'trabajador' && currentUser?.idpersonal) {
    url = `/api/peticiones-material/trabajador/${currentUser.idpersonal}`;
  }

  const res = await fetch(url, { headers, credentials: 'same-origin' });
  const json = await res.json();
  const items = json.data || [];

  tbody.innerHTML = items.map(p => {
    const estado = p.cancelada
      ? 'Anulada'
      : p.firmado
        ? 'Firmada'
        : p.recibido
          ? 'Validada'
          : 'Pendiente';
    const isWorker = currentUserRole === 'trabajador';
    const disableValidar = p.recibido || p.cancelada || p.firmado;
    const disableAnular = p.cancelada || p.firmado;
    const disableAnularWorker = estado !== 'Pendiente';
    const disableFirmarWorker = estado !== 'Validada';



    if (isWorker) {
  return `
    <tr>
      <td>${p.id}</td>
      <td>${p.material?.descripcion || ''}</td>
      <td>${p.trabajador?.nombrefiscal || p.trabajador?.nombrecomercial || ''}</td>
      <td>${p.unidades || ''}</td>
      <td>${estado}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-secondary me-1 btn-anular-worker" data-id="${p.id}" ${disableAnularWorker ? 'disabled' : ''}>Anular</button>
        <button class="btn btn-sm btn-success btn-firmar-worker" data-id="${p.id}" ${disableFirmarWorker ? 'disabled' : ''}>Firmar</button>
      </td>
    </tr>
  `;
}
const isFirmada = estado === 'Firmada' && p.firma;
if (isFirmada) {
  return `
    <tr>
      <td>${p.id}</td>
      <td>${p.material?.descripcion || ''}</td>
      <td>${p.trabajador?.nombrefiscal || p.trabajador?.nombrecomercial || ''}</td>
      <td>${p.unidades || ''}</td>
      <td>${estado}</td>
      
      <td class="text-end">
        <button class="btn btn-sm btn-info btn-ver-firma" data-firma="${p.firma}">Ver firma</button>
      </td>
    </tr>`;
}
return `
  <tr>
    <td>${p.id}</td>
    <td>${p.material?.descripcion || ''}</td>
    <td>${p.trabajador?.nombrefiscal || p.trabajador?.nombrecomercial || ''}</td>
    <td>${p.unidades || ''}</td>
    <td>${estado}</td>
    <td class="text-end">
      <button class="btn btn-sm btn-success me-1 btn-validar" data-id="${p.id}" ${disableValidar ? 'disabled' : ''}>Validar</button>
      <button class="btn btn-sm btn-secondary btn-anular" data-id="${p.id}" ${disableAnular ? 'disabled' : ''}>Anular</button>
    </td>
  </tr>
`;

  }).join('');

if (currentUserRole === 'trabajador') {
  const canvas = document.getElementById('firmaCanvas');
  const ctx = canvas?.getContext('2d');
  let drawing = false;

  const startDraw = (x, y) => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (x, y) => {
    if (!drawing) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const stopDraw = () => drawing = false;

  const getPos = e => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Eventos de dibujo
  canvas?.addEventListener('mousedown', e => startDraw(...Object.values(getPos(e))));
  canvas?.addEventListener('mousemove', e => draw(...Object.values(getPos(e))));
  canvas?.addEventListener('mouseup', stopDraw);
  canvas?.addEventListener('mouseleave', stopDraw);
  canvas?.addEventListener('touchstart', e => {
    e.preventDefault();
    startDraw(...Object.values(getPos(e)));
  }, { passive: false });
  canvas?.addEventListener('touchmove', e => {
    e.preventDefault();
    draw(...Object.values(getPos(e)));
  }, { passive: false });
  canvas?.addEventListener('touchend', stopDraw);

  document.getElementById('btnLimpiarFirma')?.addEventListener('click', () => {
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  });

  document.getElementById('btnGuardarFirma')?.addEventListener('click', async () => {
    if (!canvas || !firmaPeticionId) return;
    const firmaBase64 = canvas.toDataURL('image/png');
    await fetch(`/api/peticiones-material/${firmaPeticionId}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ firmado: 1, firma: firmaBase64 })
    });
    // Cierra modal y recarga
    coreui.Modal.getInstance(document.getElementById('modalFirma'))?.hide();

    initPeticionesMaterial(headers);
  });

  // Botones “Firmar”
  tbody.querySelectorAll('.btn-firmar-worker').forEach(btn => {
    btn.addEventListener('click', () => {
      firmaPeticionId = btn.dataset.id;
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      new coreui.Modal(document.getElementById('modalFirma')).show();
    });
  });

  // Botones “Anular”
  tbody.querySelectorAll('.btn-anular-worker').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Anular petición?')) return;
      const id = btn.dataset.id;
      await fetch(`/api/peticiones-material/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelada: 1 })
      });
      initPeticionesMaterial(headers);
    });
  });
} else {
  
  // Listeners originales para admin/editor
  tbody.querySelectorAll('.btn-validar').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Validar esta petición?')) return;
      const id = btn.dataset.id;
      await fetch(`/api/peticiones-material/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recibido: 1 })
      });
      initPeticionesMaterial(headers);
    });
  });

  tbody.querySelectorAll('.btn-anular').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Anular petición?')) return;
      const id = btn.dataset.id;
      await fetch(`/api/peticiones-material/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelada: 1 })
      });
      initPeticionesMaterial(headers);
    });
  });
  const modalVerFirma = document.getElementById('modalVerFirma');
  const imgFirma = document.getElementById('imgFirmaRegistrada');

  tbody.querySelectorAll('.btn-ver-firma').forEach(btn => {
    btn.addEventListener('click', () => {
      const firma = btn.dataset.firma;
      if (!firma) return;
      imgFirma.src = firma;
      modalVerFirma.classList.add('is-open'); // la misma clase que usas para abrir el modal de firma
    });
  });

  document.getElementById('btnCerrarVerFirma')?.addEventListener('click', () => {
    modalVerFirma.classList.remove('is-open');
  });

  modalVerFirma?.addEventListener('click', e => {
    if (e.target === modalVerFirma) modalVerFirma.classList.remove('is-open');
  });

}

}

async function initNuevoPeticionMaterialForm(headers) {
  const form = document.getElementById('formNuevaPeticionMaterial');
  if (!form) return;

  const selectMaterial = form.querySelector('#materialSelect');
  const btnVolverArriba = document.getElementById('volverPeticionesBtn');
  const btnVolverAbajo = document.getElementById('volverPeticionesBtnBottom');

  const volverListado = () => navigateTo('materiales/peticiones/index', headers);
  btnVolverArriba?.addEventListener('click', volverListado);
  btnVolverAbajo?.addEventListener('click', volverListado);

  // Cargar catálogo de materiales para el select
  try {
    const resMateriales = await fetch('/api/materiales', { headers, credentials: 'same-origin' });
    const jsonMat = await resMateriales.json();
    const materiales = jsonMat.data || [];
    selectMaterial.innerHTML = materiales.map(mat =>
      `<option value="${mat.id}">${mat.descripcion || `Material #${mat.id}`}</option>`
    ).join('');
  } catch (err) {
    console.error('No se pudo cargar materiales', err);
    selectMaterial.innerHTML = '<option value="">Sin materiales</option>';
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.idfa_material) {
      alert('Selecciona el material a solicitar');
      return;
    }

    const payload = {
      descripcion: data.descripcion || '',
      fecha: data.fecha || null,
      hora: data.hora || null,
      idfa_material: Number(data.idfa_material),
      unidades: data.unidades ? Number(data.unidades) : null,
      talla: data.talla || '',
      enviado: data.enviado ? Number(data.enviado) : 0,
      recibido: 0,
      firmado: 0,
      firma: null,
      idcloud: data.idcloud || null
    };

    const res = await fetch('/api/peticiones-material', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.success) {
      alert(json.message || 'Error al crear la petición');
      return;
    }

    alert('Petición creada correctamente');
    volverListado();
  });
}
////////////////////////////////////////////////////////////////////// FICHAJES //////////////////////////////////////////////////////////////////////////////////

const toggleFichajesBtn = document.getElementById('toggleFichajes');
toggleFichajesBtn?.addEventListener('click', () => {
  const submenu = document.getElementById('fichajesSubmenu');
  const icon = document.getElementById('toggleFichajesIcon');
  if (!submenu) return;
  submenu.classList.toggle('show');
  if (icon) icon.textContent = submenu.classList.contains('show') ? '▲' : '▼';
});

function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
function formatDateLong(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
function secondsFromFichaje(item = {}) {
  if (Number.isFinite(item.segundos)) return Number(item.segundos);
  if (Number.isFinite(item.segundos_informe)) return Number(item.segundos_informe);
  if (!item.hora_inicio || !item.hora_fin) return 0;
  const toSeconds = (time) => {
    const [h = 0, m = 0, s = 0] = time.split(':').map(Number);
    return h * 3600 + m * 60 + (Number.isFinite(s) ? s : 0);
  };
  const diff = toSeconds(item.hora_fin) - toSeconds(item.hora_inicio);
  return diff > 0 ? diff : 0;
}
function formatDuration(totalSeconds = 0) {
  const value = Math.max(0, Math.trunc(totalSeconds));
  const hours = String(Math.floor(value / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((value % 3600) / 60)).padStart(2, '0');
  const seconds = String(value % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

async function initFichajesFichar(headers) {


  const dropdownProyectos = document.getElementById('dropdownProyectosFichaje');
const dropdownPausas = document.getElementById('dropdownPausasFichaje');

let motivosPausa = [];

const cargarMotivosPausa = async () => {
  const res = await fetch('/api/fichajes/motivos', { credentials: 'same-origin' });
  const json = await res.json();
  motivosPausa = (json.data || []).filter(m => m.activo);
};

const renderMotivosPausa = () => {
  dropdownPausas.innerHTML = motivosPausa.length
    ? motivosPausa.map(m => `<li><button class="dropdown-item motivo-pausa" data-motivo="${m.nombre}">${m.nombre}</button></li>`).join('')
    : '<li><span class="dropdown-item text-muted">Sin motivos</span></li>';
  dropdownPausas.querySelectorAll('.motivo-pausa').forEach(btn =>
    btn.addEventListener('click', () => pausarConMotivo(btn.dataset.motivo))
  );
};
  await cargarMotivosPausa();
renderMotivosPausa();
let proyectosCache = [];
const reanudarFichaje = async () => {
  try {
    const res = await fetchJSON('/api/fichajes/reanudar', { method: 'POST' });
    if (!res.success) throw new Error(res.message);
    closeDropdowns();           // si tienes este helper
    lockNonWorkButtons(true);
    lockWorkButton(true);
    await findActive();
    await cargarActividad();
  } catch (err) {
    alert(err.message || 'No se pudo reanudar el fichaje');
  }
};

const pausarConMotivo = async (motivo) => {
  try {
    const res = await fetchJSON('/api/fichajes/pausar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo })
    });
    if (!res.success) throw new Error(res.message);
    closeDropdowns();           // si tienes este helper, úsalo para cerrar el menú
    lockNonWorkButtons(true);
    lockWorkButton(true);
    await findActive();
    await cargarActividad();
  } catch (err) {
    alert(err.message || 'No se pudo pausar el fichaje');
  }
};



const closeDropdowns = () => {
  dropdownProyectos?.classList.remove('show');
  dropdownPausas?.classList.remove('show');
  btnToggle?.setAttribute('aria-expanded', 'false');
};

const setBotonModo = (modo) => {
  if (modo === 'iniciar') {
    btnToggle.innerHTML = '<svg class="icon me-2"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-media-play"></use></svg>Iniciar fichaje';
    dropdownProyectos?.classList.remove('d-none');
    dropdownPausas?.classList.add('d-none');
  } else if (modo === 'pausar') {
    btnToggle.innerHTML = '<svg class="icon me-2"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-media-pause"></use></svg>Pausar';
    dropdownProyectos?.classList.add('d-none');
    dropdownPausas?.classList.remove('d-none');
  } else if (modo === 'reanudar') {
    btnToggle.innerHTML = '<svg class="icon me-2"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-media-play"></use></svg>Reanudar';
    dropdownProyectos?.classList.add('d-none');
    dropdownPausas?.classList.add('d-none');
  }
  closeDropdowns();
};

const cargarProyectos = async () => {
  const res = await fetch('/api/proyectos/listado-simple', { credentials: 'same-origin' });
  const json = await res.json();
  const proyectos = json.data || [];
  dropdownProyectos.innerHTML = proyectos.length
    ? proyectos.map(p => `<li><button class="dropdown-item proyecto-opcion" data-id="${p.id}">${p.nombreproyecto || 'Proyecto #' + p.id}${p.cliente?.nombrefiscal ? ' · ' + p.cliente.nombrefiscal : ''}</button></li>`).join('')
    : '<li><span class="dropdown-item text-muted">Sin proyectos</span></li>';

  dropdownProyectos.querySelectorAll('.proyecto-opcion').forEach(btn => {
    btn.addEventListener('click', () => iniciarFichajeConProyecto(btn.dataset.id));
  });
};
await cargarProyectos();


  const form = document.getElementById('formNuevoFichaje');
  const closeProyectosDropdown = () => {
  dropdownProyectos?.classList.remove('show');
  btnToggle?.setAttribute('aria-expanded', 'false');
};
  const iniciarFichajeConProyecto = async (idProyecto) => {
  try {
    const payload = {
      descripcion: 'Trabajo',
      fecha: form?.fecha?.value || null,
      idobra: Number(idProyecto) || null,
      coord_latitud: form?.coord_latitud?.value || ubicacionActual?.lat || null,
      coord_longitud: form?.coord_longitud?.value || ubicacionActual?.lng || null
    };
    const res = await fetchJSON('/api/fichajes/iniciar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.success) throw new Error(res.message);
    closeProyectosDropdown();
    lockNonWorkButtons(true);
    lockWorkButton(true);
    await findActive();
    await cargarActividad();
  } catch (err) {
    alert(err.message || 'No se pudo iniciar el fichaje');
  }
};

  const tablaBody = document.getElementById('actividadRecienteBody');
  if (!form || !tablaBody) return;

  const trabajadorId = currentUser?.idpersonal;
  if (!trabajadorId) {
    tablaBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Tu usuario no está vinculado a un trabajador.</td></tr>`;
    return;
  }

  let fichajeState = { activo: null, pausaActiva: null };
  let fichajeTimer = null;


  const fechaTitulo = document.getElementById('tituloDiaFichajes');
  const totalDiaEl = document.getElementById('totalDiaFichajes');
  const resumenActividad = document.getElementById('resumenActividadActual');
  const btnRefrescar = document.getElementById('btnRefrescarActividad');
  const btnUbicacion = document.getElementById('btnCapturarUbicacion');
  const latInput = form.querySelector('[name="coord_latitud"]');
  const lngInput = form.querySelector('[name="coord_longitud"]');
  const resetBtn = document.getElementById('btnResetFichaje');
  const btnToggle = document.getElementById('btnToggleFichaje');
  const btnStop = document.getElementById('btnStopFichaje');


  const fetchJSON = async (url, options = {}) => {
    const res = await fetch(url, { credentials: 'same-origin', ...options });
    return res.json();
  };

  const lockNonWorkButtons = (locked) => {
    
  };
  const lockWorkButton = (locked) => {
  
  };
  lockNonWorkButtons(true);
  lockWorkButton(false);

  const setDefaults = () => {
    let now = new Date();
    now = now.toISOString().slice(0, 10);
    fechaTitulo.textContent = formatDateLong(now);
  

  };
let ubicacionActual = { lat: null, lng: null };

const renderMapa = (mensaje) => {
  const mapDiv = document.getElementById('mapaFichaje');
  if (!mapDiv) return;
  if (!ubicacionActual.lat || !ubicacionActual.lng) {
    mapDiv.innerHTML = `<p class="text-center text-muted py-5 mb-0">${mensaje || 'Sin ubicación'}</p>`;
    return;
  }
  mapDiv.innerHTML =
    `<iframe width="100%" height="260" style="border:0;" loading="lazy" allowfullscreen
      src="https://maps.google.com/maps?q=${ubicacionActual.lat},${ubicacionActual.lng}&z=16&output=embed"></iframe>`;
  // guarda en los campos hidden por si los usas en el payload
  if (form.coord_latitud) form.coord_latitud.value = ubicacionActual.lat;
  if (form.coord_longitud) form.coord_longitud.value = ubicacionActual.lng;
};

const precargarUbicacion = () => {
  const mapDiv = document.getElementById('mapaFichaje');
  if (mapDiv) mapDiv.innerHTML = '<p class="text-center text-muted py-5 mb-0">Obteniendo ubicación...</p>';
  if (!navigator.geolocation) {
    renderMapa('Tu navegador no soporta geolocalización');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      ubicacionActual = {
        lat: pos.coords.latitude.toFixed(6),
        lng: pos.coords.longitude.toFixed(6)
      };
      renderMapa();
    },
    err => renderMapa(`No se pudo obtener ubicación: ${err.message}`),
    { enableHighAccuracy: true, timeout: 8000 }
  );
};


  setDefaults();
  precargarUbicacion();
btnCapturarUbicacion?.addEventListener('click', precargarUbicacion);



  resetBtn?.addEventListener('click', () => setTimeout(setDefaults, 0));

  btnUbicacion?.addEventListener('click', () => {
    if (!navigator.geolocation) return alert('Tu navegador no soporta geolocalización');
    btnUbicacion.disabled = true;
    btnUbicacion.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Obteniendo...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (latInput) latInput.value = pos.coords.latitude.toFixed(6);
        if (lngInput) lngInput.value = pos.coords.longitude.toFixed(6);
        btnUbicacion.disabled = false;
        btnUbicacion.textContent = 'Usar mi ubicación';
      },
      err => {
        alert('No pudimos obtener tu ubicación: ' + err.message);
        btnUbicacion.disabled = false;
        btnUbicacion.textContent = 'Usar mi ubicación';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });





  const findActive = async () => {
    const res = await fetchJSON(`/api/fichajes/trabajador/${trabajadorId}/activo`);
    fichajeState.activo = res.data || null;
    fichajeState.pausaActiva = fichajeState.activo?.pausas?.find(p => !p.hora_fin) || null;
    pintarEstado();
  };

  function pintarEstado() {
    const etiqueta = document.getElementById('estadoFichajeEtiqueta');
    const detalle = document.getElementById('estadoFichajeDetalle');
    if (!etiqueta || !btnToggle) return;

    if (!fichajeState.activo) {
       setBotonModo('iniciar');
      etiqueta.textContent = 'Sin fichaje activo';
      detalle.textContent = 'Pulsa "Iniciar fichaje" para comenzar tu jornada.';
      btnToggle.innerHTML = '<svg class="icon me-2"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-media-play"></use></svg>Iniciar fichaje';
      btnToggle.classList.remove('btn-warning', 'btn-success');
      btnToggle.classList.add('btn-primary');
      btnStop?.classList.add('d-none');

      // deja preparado Trabajo como siguiente selección
   
      

      lockNonWorkButtons(true);
      lockWorkButton(false);
      clearInterval(fichajeTimer);
      fichajeTimer = null;
      let actividadCache = [];
      return;
    }


    const desc = fichajeState.activo.descripcion || 'Trabajo';
    const horaIni = fichajeState.activo.hora_inicio;
    const pausado = !!fichajeState.pausaActiva;

    etiqueta.textContent = pausado ? `${desc} (pausado)` : `${desc} en curso`;
    detalle.textContent = `Iniciado ${formatDateShort(fichajeState.activo.fecha)} a las ${horaIni}`;
    btnStop?.classList.remove('d-none');

    if (pausado) {
       setBotonModo('reanudar');
      btnToggle.innerHTML = '<svg class="icon me-2"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-media-play"></use></svg>Reanudar';
      btnToggle.classList.remove('btn-warning');
      btnToggle.classList.add('btn-success');
      // En pausa no se puede cambiar el motivo: bloquear todos
      lockNonWorkButtons(true);
      lockWorkButton(true);
    } else {
        setBotonModo('pausar');

      btnToggle.innerHTML = '<svg class="icon me-2"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-media-pause"></use></svg>Pausar';
      btnToggle.classList.remove('btn-primary', 'btn-success');
      btnToggle.classList.add('btn-warning');

      // Selecciona siempre Trabajo cuando está en curso
 
      

      // Fichaje en curso: Trabajo bloqueado, motivos de pausa disponibles
      lockNonWorkButtons(false);
      lockWorkButton(true);
    }


    if (!fichajeTimer) fichajeTimer = setInterval(() => actualizarTotal(actividadCache), 1000);

  }

const buildPayloadFromForm = () => ({
  descripcion: 'Trabajo',
  fecha: form.fecha.value || null,
  idobra: null, // el inicio real se hace desde el dropdown de proyectos
  coord_latitud: (ubicacionActual?.lat) || form.coord_latitud.value || null,
  coord_longitud: (ubicacionActual?.lng) || form.coord_longitud.value || null
});


  btnToggle?.addEventListener('click', () => {
  // si estamos en modo iniciar => toggle de proyectos
  if (!fichajeState.activo) {
    dropdownProyectos?.classList.toggle('show');
    btnToggle.setAttribute('aria-expanded', dropdownProyectos.classList.contains('show'));
    return;
  }
  // si estamos en modo pausar => toggle de motivos
  if (fichajeState.activo && !fichajeState.pausaActiva) {
    dropdownPausas?.classList.toggle('show');
    btnToggle.setAttribute('aria-expanded', dropdownPausas.classList.contains('show'));
    return;
  }
  // si estamos en modo reanudar => reanudar directamente
  if (fichajeState.pausaActiva) reanudarFichaje();
});

  btnStop?.addEventListener('click', async () => {
    if (!confirm('¿Seguro que quieres finalizar el fichaje actual?')) return;
    // usa ubicacionActual si la tienes; si no, pide geolocalización rápida
      let latFin = ubicacionActual?.lat || null;
      let lngFin = ubicacionActual?.lng || null;
    const res = await fetchJSON('/api/fichajes/parar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coord_latitud_fin: latFin,
      coord_longitud_fin: lngFin
    })
  });
  if (!res.success) {
    alert(res.message || 'No se pudo cerrar el fichaje');
    return;
  }
  await findActive();
  await cargarActividad();
  });

  function formatDuration(totalSeconds = 0) {
    const value = Math.max(0, Math.trunc(totalSeconds));
    const hh = String(Math.floor(value / 3600)).padStart(2, '0');
    const mm = String(Math.floor((value % 3600) / 60)).padStart(2, '0');
    const ss = String(value % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  function secondsFromFichaje(item = {}) {
    if (!item || !item.hora_inicio) return 0;
    const toSec = t => {
      const [h=0,m=0,s=0] = (t || '0:0:0').split(':').map(Number);
      return h*3600 + m*60 + s;
    };
    const nowStr = new Date().toTimeString().slice(0,8);
    const endSeconds = item.hora_fin ? toSec(item.hora_fin) : toSec(nowStr);
    let total = endSeconds - toSec(item.hora_inicio);
    (item.pausas || []).forEach(p => {
      if (!p.hora_inicio) return;
      const fin = p.hora_fin || nowStr; // si la pausa está abierta, descuenta hasta ahora
      total -= Math.max(0, toSec(fin) - toSec(p.hora_inicio));
    });
    return Math.max(0, total);
  }

  async function cargarActividad() {
    tablaBody.innerHTML = `<tr><td colspan="5" class="text-center py-4"><span class="spinner-border"></span></td></tr>`;
    const res = await fetch(`/api/fichajes/trabajador/${trabajadorId}`, { credentials: 'same-origin' });
    const json = await res.json();
    const items = json.data || [];

    if (!items.length) {
      tablaBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Todavía no tienes fichajes registrados.</td></tr>';
      totalDiaEl.textContent = '00:00:00';
      resumenActividad.innerHTML = '<p class="text-muted mb-0">Empieza a fichar para ver tu actividad más reciente aquí.</p>';
      return;
    }

    tablaBody.innerHTML = items.slice(0, 10).map(f => `
      <tr>
        <td>
          <div class="fw-semibold">${f.descripcion || '-'}</div>
          <small class="text-muted">${formatDateShort(f.fecha)}</small>
        </td>
        <td>${f.hora_inicio || '--:--'}</td>
        <td>${f.hora_fin || '--:--'}</td>
        <td><span class="badge bg-light text-dark">${formatDuration(secondsFromFichaje(f))}</span></td>
        <td>
          ${f.cliente?.nombrefiscal ? `<small class="text-muted d-block">${f.cliente.nombrefiscal}</small>` : ''}
          ${f.obra?.nombreproyecto ? `<small class="text-muted">${f.obra.nombreproyecto}</small>` : ''}
        </td>
      </tr>
    `).join('');

    const ultimo = items[0];
    resumenActividad.innerHTML = `
      <div class="d-flex align-items-center justify-content-between">
        <div>
          <p class="mb-0 fw-semibold">${ultimo.descripcion || '-'}</p>
          <small class="text-muted">${formatDateShort(ultimo.fecha)} · ${ultimo.hora_inicio || '--:--'} - ${ultimo.hora_fin || '--:--'}</small>
        </div>
        <span class="badge bg-success">${formatDuration(secondsFromFichaje(ultimo))}</span>
      </div>
    `;

    
    actividadCache = items;
    actualizarTotal(actividadCache);
  }

  function actualizarTotal(items = []) {
  const list = (items && items.length) ? items : actividadCache;
  const hoy = new Date().toISOString().slice(0, 10);
  const totalHoy = list
    .filter(f => f.fecha === hoy)
    .reduce((acc, f) => acc + secondsFromFichaje(f), 0);
  totalDiaEl.textContent = formatDuration(totalHoy);
}



  btnRefrescar?.addEventListener('click', e => {
    e.preventDefault();
    cargarActividad();
    findActive();
  });

  await findActive();
  await cargarActividad();
}






async function initFichajesListado(headers) {
  const tablaBody = document.querySelector('#tablaListadoFichajes tbody');
  const totalEl = document.getElementById('totalHorasListado');
  const filtros = document.getElementById('filtrosListadoFichajes');
    const selectTrab = document.getElementById('selectTrabajadorListado');
  const selectTrabWrapper = document.getElementById('selectTrabajadorWrapper');

  if (!tablaBody || !filtros) return;

  let dataset = [];
    const loadTrabajadores = async () => {
    if (!selectTrab) return;
    const res = await fetch('/api/trabajadores', { credentials: 'same-origin' });
    const json = await res.json();
    const list = json.data || [];
    selectTrab.innerHTML = '<option value="">-- Selecciona trabajador --</option>' +
      list.map(t => `<option value="${t.id}">${t.nombrefiscal || `Trabajador #${t.id}`}</option>`).join('');
  };


  const workedSeconds = (item = {}) => {
    if (!item.hora_inicio) return 0;
    const toSec = t => {
      const [h = 0, m = 0, s = 0] = (t || '0:0:0').split(':').map(Number);
      return h * 3600 + m * 60 + s;
    };
    const nowStr = new Date().toTimeString().slice(0, 8);
    const endSeconds = item.hora_fin ? toSec(item.hora_fin) : toSec(nowStr);
    let total = endSeconds - toSec(item.hora_inicio);
    (item.pausas || []).forEach(p => {
      if (!p.hora_inicio) return;
      const fin = p.hora_fin || nowStr;
      total -= Math.max(0, toSec(fin) - toSec(p.hora_inicio));
    });
    return Math.max(0, total);
  };

    const cargar = async () => {
    // Si es trabajador, siempre su propio listado
    if (currentUserRole === 'trabajador' && currentUser?.idpersonal) {
      selectTrabWrapper?.classList.add('d-none');
      const res = await fetch(`/api/fichajes/trabajador/${currentUser.idpersonal}`, { headers, credentials: 'same-origin' });
      const json = await res.json();
      dataset = json.data || [];
      render();
      return;
    }

    // Admin/editor: requiere selección previa
    selectTrabWrapper?.classList.remove('d-none');
    if (!selectTrab?.value) {
      dataset = [];
      tablaBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Selecciona un trabajador para ver sus fichajes.</td></tr>';
      totalEl.textContent = '00:00:00';
      return;
    }

    const res = await fetch(`/api/fichajes/trabajador/${selectTrab.value}`, { headers, credentials: 'same-origin' });
    const json = await res.json();
    dataset = json.data || [];
    render();
  };


  const render = () => {
  const data = Object.fromEntries(new FormData(filtros).entries());
  let rows = [...dataset];

  if (data.desde) rows = rows.filter(f => f.fecha && f.fecha >= data.desde);
  if (data.hasta) rows = rows.filter(f => f.fecha && f.fecha <= data.hasta);
  if (data.tipo) rows = rows.filter(f => (f.descripcion || '').toLowerCase() === data.tipo.toLowerCase());

  const term = (data.buscar || '').toLowerCase().trim();
  if (term) {
    rows = rows.filter(f => {
      const campos = [
        f.descripcion,
        f.fecha,
        f.hora_inicio,
        f.hora_fin,
        f.cliente?.nombrefiscal,
        f.obra?.nombreproyecto,
        String(f.id)
      ].map(v => (v || '').toString().toLowerCase());
      return campos.some(v => v.includes(term));
    });
  }

  if (!rows.length) {
    tablaBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay fichajes para los filtros seleccionados.</td></tr>';
  } else {
    tablaBody.innerHTML = rows.map(f => `
      <tr>
        <td>${f.descripcion || '-'}</td>
          <td>${formatDateShort(f.fecha)}</td>
          <td>${f.hora_inicio || '--:--'}
          ${f.coord_latitud && f.coord_longitud ? `<button class="btn btn-sm btn-link p-0 ms-2 ver-mapa" data-lat="${f.coord_latitud}" data-lng="${f.coord_longitud}" title="Ver ubicación de inicio">
            <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-globe-alt"></use></svg>
          </button>` : ''}
          </td>
          <td>${f.hora_fin || '--:--'}
           ${f.coord_latitud_fin && f.coord_longitud_fin ? `<button class="btn btn-sm btn-link p-0 ms-2 ver-mapa" data-lat="${f.coord_latitud_fin}" data-lng="${f.coord_longitud_fin}" title="Ver ubicación de fin">
            <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-globe-alt"></use></svg>
          </button>` : ''}
          </td>
          <td><span class="badge bg-light text-dark">${formatDuration(workedSeconds(f))}</span></td>
          
          <td>${f.obra?.nombreproyecto || '-'}</td>
          <td>
            <button class="btn btn-sm btn-link p-0 text-decoration-none ver-pausas" data-id="${f.id}">
              Ver pausas (${(f.pausas?.length || 0)})
          </button>
        </td>
      </tr>
      `).join('');
    }

    const totalSeconds = rows.reduce((acc, item) => acc + workedSeconds(item), 0);
    totalEl.textContent = formatDuration(totalSeconds);

  // Engancha aquí los clicks
  tablaBody.querySelectorAll('.ver-pausas').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      sessionStorage.setItem('fichajePausasId', id);
      await navigateTo('fichajes/pausas', headers);
    });
  });
  tablaBody.querySelectorAll('.ver-mapa').forEach(btn => {
  btn.addEventListener('click', () => {
    const { lat, lng } = btn.dataset;
    if (!lat || !lng) return;
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank', 'noopener');

  });
});
};





  filtros.addEventListener('submit', e => {
    e.preventDefault();
    render();
  });
  filtros.addEventListener('input', e => {
    if (['tipo', 'buscar'].includes(e.target.name)) render();
  });
  document.getElementById('btnResetFiltros')?.addEventListener('click', () => {
    filtros.reset();
    render();
  });
  if (currentUserRole !== 'trabajador') {
    await loadTrabajadores();
    selectTrab?.addEventListener('change', cargar);
  }

  await cargar();
}
async function initFichajesPausas(headers) {
  const id = sessionStorage.getItem('fichajePausasId');
  const body = document.getElementById('tablaPausasBody');
  const label = document.getElementById('pausasFichajeId');
  const btnVolver = document.getElementById('btnVolverListadoPausas');
  if (!id || !body || !label) return;
  label.textContent = id;
  btnVolver?.addEventListener('click', () => navigateTo('fichajes/listado', headers));
  body.innerHTML = `<tr><td colspan="5" class="text-center py-4"><span class="spinner-border"></span></td></tr>`;
  const res = await fetch(`/api/fichajes/${id}`, { credentials: 'same-origin' });
  const json = await res.json();
  const pausas = json.data?.pausas || [];
  if (!pausas.length) {
    body.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Sin pausas</td></tr>';
    return;
  }
  const toSec = t => { const [h=0,m=0,s=0]=t.split(':').map(Number); return h*3600+m*60+s; };
  body.innerHTML = pausas.map(p => {
    const dur = (p.hora_inicio && p.hora_fin) ? toSec(p.hora_fin) - toSec(p.hora_inicio) : 0;
    const hh = String(Math.floor(dur/3600)).padStart(2,'0');
    const mm = String(Math.floor((dur%3600)/60)).padStart(2,'0');
    const ss = String(dur%60).padStart(2,'0');
    return `
      <tr>
        <td>${p.fecha || '-'}</td>
        <td>${p.hora_inicio || '--:--'}</td>
        <td>${p.hora_fin || '--:--'}</td>
        <td>${p.motivo || '-'}</td>
        <td><span class="badge bg-light text-dark">${hh}:${mm}:${ss}</span></td>
      </tr>
    `;
  }).join('');
}
async function initFichajesMotivos(headers) {
  const tabla = document.querySelector('#tablaMotivos tbody');
  const btnNuevo = document.getElementById('btnNuevoMotivo');
  if (!tabla) return;

  let motivos = [];
  const showMotivoModal = ({ titulo, valores = {}, onSave }) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.45)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '1055';

    const card = document.createElement('div');
    card.style.background = '#fff';
    card.style.borderRadius = '12px';
    card.style.padding = '16px';
    card.style.width = 'min(420px, 90%)';
    card.style.boxShadow = '0 20px 50px rgba(0,0,0,0.15)';

    card.innerHTML = `
      <h6 style="margin-bottom:12px;">${titulo}</h6>
      <div class="mb-2">
        <label class="form-label">Nombre</label>
        <input type="text" class="form-control" id="motivoNombre" value="${valores.nombre || ''}">
      </div>
      <div class="mb-3">
        <label class="form-label">Orden (opcional)</label>
        <input type="number" class="form-control" id="motivoOrden" value="${valores.orden ?? ''}">
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-light" id="motivoCancelar">Cancelar</button>
        <button type="button" class="btn btn-primary" id="motivoGuardar">Guardar</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    card.querySelector('#motivoCancelar').addEventListener('click', close);
    card.querySelector('#motivoGuardar').addEventListener('click', async () => {
      const nombre = card.querySelector('#motivoNombre').value.trim();
      const orden = card.querySelector('#motivoOrden').value;
      await onSave({ nombre, orden: orden ? Number(orden) : null });
      close();
    });
  };

  const load = async () => {
    tabla.innerHTML = '<tr><td colspan="4" class="text-center py-4"><span class="spinner-border"></span></td></tr>';
    const res = await fetch('/api/fichajes/motivos', { credentials: 'same-origin' });
    const json = await res.json();
    motivos = json.data || [];
    render();
  };

  const render = () => {
    if (!motivos.length) {
      tabla.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Sin motivos</td></tr>';
      return;
    }

    tabla.innerHTML = motivos.map(m => `
      <tr>
        <td>${m.nombre || '-'}</td>
        <td>
          <input type="checkbox" class="form-check-input motivo-activo" data-id="${m.id}" ${m.activo ? 'checked' : ''}>
        </td>
        <td>${m.orden ?? ''}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-light border btn-editar-motivo" data-id="${m.id}" data-nombre="${m.nombre || ''}" data-orden="${m.orden ?? ''}">
            <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-pencil"></use></svg>
          </button>
          <button class="btn btn-sm btn-light border text-danger btn-eliminar-motivo" data-id="${m.id}">
            <svg class="icon"><use xlink:href="vendors/@coreui/icons/svg/free.svg#cil-trash"></use></svg>
          </button>
        </td>
      </tr>
    `).join('');

    // toggle activo
    tabla.querySelectorAll('.motivo-activo').forEach(chk => {
      chk.addEventListener('change', async () => {
        const id = chk.dataset.id;
        await fetch(`/api/fichajes/motivos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ activo: chk.checked ? 1 : 0 })
        });
        await load();
      });
    });

    // editar
    tabla.querySelectorAll('.btn-editar-motivo').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const nombreActual = btn.dataset.nombre || '';
        const ordenActual = btn.dataset.orden || '';
        showMotivoModal({
          titulo: 'Editar motivo',
          valores: { nombre: nombreActual, orden: ordenActual },
          onSave: async ({ nombre, orden }) => {
            if (!nombre) return;
            await fetch(`/api/fichajes/motivos/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify({ nombre, orden })
            });
            await load();
          }
        });
      });
    });

    // eliminar
    tabla.querySelectorAll('.btn-eliminar-motivo').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar motivo?')) return;
        const id = btn.dataset.id;
        await fetch(`/api/fichajes/motivos/${id}`, { method: 'DELETE', headers });
        await load();
      });
    });
  };

  btnNuevo?.addEventListener('click', async () => {
    showMotivoModal({
      titulo: 'Nuevo motivo',
      onSave: async ({ nombre, orden }) => {
        if (!nombre) return;
        await fetch('/api/fichajes/motivos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ nombre, orden })
        });
        await load();
      }
    });
  });

  await load();
}

// === Cargar vista según hash al abrir página ===
window.addEventListener('load', async () => {
  await loadModulesConfig();
  await loadCurrentUser();
  hideMotivosForNonAdmin()
  hideMenuForWorker();
  hideFicharForNonWorkers && hideFicharForNonWorkers(); // si añadiste este helper

  const hash = location.hash.replace('#/', '');
  const defaultView = hash || (
    currentUserRole === 'trabajador'
      ? 'fichajes/fichar'
      : 'home'
  );

  const headers = {};
  await navigateTo(defaultView, headers, false);
});
function hideMotivosForNonAdmin() {
  const item = document.querySelector('[data-view="fichajes/motivos"]')?.closest('li');
  if (!item) return;
  if (!['admin','editor'].includes((currentUserRole||'').toLowerCase())) item.classList.add('d-none');
}
function hideMenuForWorker() {
    if (currentUserRole !== 'trabajador') return;
    const prohibidas = ['clientes', 'proyectos', 'pedidos', 'trabajadores', 'materiales'];
    document.querySelectorAll('[data-view]').forEach(a => {
      const v = a.getAttribute('data-view');
      if (prohibidas.includes(v)) a.closest('li')?.classList.add('d-none');
    });
    
  }
  function hideFicharForNonWorkers() {
  const ficharItem = document.querySelector('[data-view="fichajes/fichar"]')?.closest('li');
  if (!ficharItem) return;
  if (currentUserRole !== 'trabajador') ficharItem.classList.add('d-none');
}

// === Logout global ===
(() => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch('/logout', { method: 'GET', credentials: 'same-origin' });
    } catch (err) {
      console.error('Error en logout:', err);
    } finally {
      localStorage.removeItem('token');
      sessionStorage.clear();
      window.location.href = '/';
    }
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl && window.coreui?.Sidebar) {
    coreui.Sidebar.getOrCreateInstance(sidebarEl);
  }
});
