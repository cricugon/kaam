let modulesConfig = { clientes: true, proyectos: true, pedidos: true, trabajadores: true };
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
  const order = ['clientes', 'proyectos', 'pedidos', 'trabajadores'];
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




    // Guardar en historial
    if (push) history.pushState({ view }, '', `#/${view}`);
  } catch (err) {
    console.error(err);
    document.getElementById('app-content').innerHTML =
      `<div class="alert alert-danger">Error al cargar ${view}</div>`;
  }
}

// === Clicks de menú lateral ===
document.querySelectorAll('[data-view]').forEach(link => {
  link.addEventListener('click', async e => {
    e.preventDefault();
    const view = e.target.closest('[data-view]').getAttribute('data-view');
    if (modulesConfig[view] === false) return alert('Módulo deshabilitado');
    const headers = {};
  await navigateTo(view, headers, true);
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
  const tbody = document.querySelector('#tablaPeticionesMaterial tbody');
  if (!tbody) return;
  const res = await fetch('/api/peticiones-material', { headers });
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

    const disableValidar = p.recibido || p.cancelada || p.firmado;
    const disableAnular = p.cancelada || p.firmado;

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

  tbody.querySelectorAll('.btn-validar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
       if (!confirm('¿Validar esta petición?')) return;
      await fetch(`/api/peticiones-material/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recibido: 1 })
      });
      initPeticionesMaterial(headers); // recargar
    });
  });

  tbody.querySelectorAll('.btn-anular').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('¿Anular petición?')) return;
      await fetch(`/api/peticiones-material/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelada: 1 })
      });
      initPeticionesMaterial(headers);
    });
  });
}

// === Cargar vista según hash al abrir página ===
window.addEventListener('load', async () => {
  await loadModulesConfig();
  const hash = location.hash.replace('#/', '');
  const view = hash || 'clientes';
  const headers = {};
  await navigateTo(view, headers, false);
});

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

