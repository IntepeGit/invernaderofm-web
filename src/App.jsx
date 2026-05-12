import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Importaciones de componentes
import Login from './pages/Login.jsx'
import Despachos from './pages/Despachos.jsx' 
import Gastos from './pages/Gastos.jsx'
import Pagos from './pages/Pagos.jsx' 
import ConfigInv from './pages/ConfigInv.jsx'
import ConfigCli from './pages/ConfigCli.jsx'
import ConfigProv from './pages/ConfigProv.jsx'
import ReporteVentas from './pages/ReporteVentas.jsx'

function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showConfigSubmenu, setShowConfigSubmenu] = useState(false)
  
  // Estados de datos consolidado
  const [datosDespachos, setDatosDespachos] = useState([]) 
  const [datosEgresos, setDatosEgresos] = useState([])
  const [datosPagos, setDatosPagos] = useState([]) 
  const [listaInvernaderos, setListaInvernaderos] = useState([])
  const [listaClientes, setListaClientes] = useState([])
  const [listaProveedores, setListaProveedores] = useState([])
  const [balancesGrafica, setBalancesGrafica] = useState([])
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'exito' });

  // Manejo de sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const mostrarAlerta = (msj, tipo = 'exito') => {
    setNotificacion({ visible: true, mensaje: msj, tipo });
    setTimeout(() => setNotificacion(prev => ({ ...prev, visible: false })), 3000);
  };

  // ESTADOS DE FORMULARIOS
  const [despachoForm, setDespachoForm] = useState({ 
    numero_remision: '', 
    cliente_id: '', 
    invernadero_id: '', 
    fecha_venta: new Date().toISOString().split('T')[0], 
    filas: [{ producto: '', escala: '', cantidad: '', precio: '' }] 
  })
  //const [gastoForm, setGastoForm] = useState({ descripcion: '', categoria: 'Mano de obra', monto: '', invernadero_id: '', proveedor_id: '', numero_comprobante: '', nota: '', fecha: new Date().toISOString().split('T')[0] })
  const [gastoForm, setGastoForm] = useState({ id_editando: null, descripcion: '', categoria: 'Mano de obra', monto: '', invernadero_id: '', proveedor_id: '', numero_comprobante: '', nota: '', fecha: new Date().toISOString().split('T')[0] })
  const [invForm, setInvForm] = useState({ nombre: '', cultivo: '', variedad: '', largo: '', ancho: '', siembra: '', cosecha: '', estado: 'Activo', descripcion: '' })
  const [cliForm, setCliForm] = useState({ nombre: '', nit: '', tel: '', dir: '', ciudad: '', nota: '', email: '' })
  const [provForm, setProvForm] = useState({ nombre: '', nit: '', tel: '', dir: '', ciudad: '', nota: '' })
  const [pagoForm, setPagoForm] = useState({ id_editando: null, cliente_id: '', venta_id: '', monto: '', metodo_pago: 'Efectivo', fecha_pago: new Date().toISOString().split('T')[0], nota: '' })
  
// PEGAR AQUÍ (Línea 118 aprox.)
const eliminarGasto = async (id) => {
  if (window.confirm("¿Está seguro de eliminar este gasto?")) {
    const { error } = await supabase.from('egresos').delete().eq('id', id);
    if (!error) { mostrarAlerta("Gasto eliminado"); cargarTodo(); }
  }
};

const prepararEdicionGasto = (g) => {
  setGastoForm({
    id_editando: g.id,
    descripcion: g.descripcion,
    categoria: g.categoria,
    monto: g.monto,
    invernadero_id: g.invernadero_id,
    proveedor_id: g.proveedor_id,
    numero_comprobante: g.numero_comprobante || '',
    nota: g.nota || '',
    fecha: g.fecha_gasto || g.fecha
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const guardarGasto = async (e) => {
  e.preventDefault();
  const payload = {
    descripcion: gastoForm.descripcion,
    categoria: gastoForm.categoria,
    monto: parseFloat(gastoForm.monto),
    invernadero_id: gastoForm.invernadero_id,
    proveedor_id: gastoForm.proveedor_id,
    numero_comprobante: gastoForm.numero_comprobante,
    nota: gastoForm.nota,
    fecha_gasto: gastoForm.fecha
  };
  if (gastoForm.id_editando) {
    await supabase.from('egresos').update(payload).eq('id', gastoForm.id_editando);
  } else {
    await supabase.from('egresos').insert([payload]);
  }
  mostrarAlerta(gastoForm.id_editando ? "Gasto actualizado" : "Gasto guardado");
  setGastoForm({ id_editando: null, descripcion: '', categoria: 'Mano de obra', monto: '', invernadero_id: '', proveedor_id: '', numero_comprobante: '', nota: '', fecha: new Date().toISOString().split('T')[0] });
  cargarTodo();
};

const eliminarPago = async (id) => {
  if (window.confirm("¿Está seguro de eliminar este pago?")) {
    const { error } = await supabase.from('pagos').delete().eq('id', id);
    if (!error) { mostrarAlerta("Pago eliminado"); cargarTodo(); }
  }
};

const prepararEdicionPago = (pago) => {
  setPagoForm({
    id_editando: pago.id,
    cliente_id: pago.cliente_id,
    despacho_id: pago.despacho_id, // <--- Asegúrate que diga despacho_id
    monto: pago.monto,
    fecha_pago: pago.fecha_pago,
    referencia: pago.referencia || '' // <--- Asegúrate que diga referencia
  });
  // Esto sube la pantalla suavemente al formulario
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const guardarPago = async (e) => {
  if (e && e.preventDefault) e.preventDefault();

  const payload = {
    cliente_id: pagoForm.cliente_id,
    despacho_id: pagoForm.despacho_id, 
    monto: parseFloat(pagoForm.monto),
    fecha_pago: pagoForm.fecha_pago,
    referencia: pagoForm.referencia 
  };

  try {
    if (pagoForm.id_editando) {
      // MODO EDICIÓN: Actualiza el abono existente
      await supabase.from('pagos').update(payload).eq('id', pagoForm.id_editando);
    } else {
      // MODO NUEVO: Inserta un nuevo abono
      await supabase.from('pagos').insert([payload]);
    }

    mostrarAlerta(pagoForm.id_editando ? "Abono actualizado correctamente" : "Abono guardado");

    // REESTABLECIMIENTO INTELIGENTE:
    // Usamos el operador spread (...pagoForm) para mantener el cliente y la remisión seleccionados.
    // Esto evita que la ficha técnica se cierre.
    setPagoForm({ 
      ...pagoForm,           
      id_editando: null,     // El botón volverá a ser verde ("Registrar")
      monto: '',             // Limpia el monto para un nuevo abono
      referencia: ''         // Limpia la nota
    });

    cargarTodo();
  } catch (error) {
    mostrarAlerta("Error: " + error.message, "error");
  }
}; // <-- Esta llave cierra la función guardarPago


// DESPUÉS DE ESTO DEBE SEGUIR: async function cargarTodo() { ...
  
  async function cargarTodo() {
    if (!session) return;
    const { data: v } = await supabase.from('ventas').select('*, clientes(*), invernaderos(*), detalle_ventas(*)')
    const { data: e } = await supabase.from('egresos').select('*, invernaderos(*), proveedores(*)')
    const { data: i } = await supabase.from('invernaderos').select('*')
    const { data: c } = await supabase.from('clientes').select('*')
    const { data: p } = await supabase.from('proveedores').select('*')
    const { data: pagos } = await supabase.from('pagos').select('*, clientes(nombre_completo), ventas(numero_remision)')

    setDatosDespachos(v || []);
    setDatosEgresos(e || []);
    setDatosPagos(pagos || []);
    setListaInvernaderos(i || []);
    setListaClientes(c || []);
    setListaProveedores(p || []);

    const resumen = i?.map(inv => {
      const ing = v?.filter(x => x.invernadero_id === inv.id).reduce((s, x) => s + (x.total_venta || 0), 0) || 0
      const egr = e?.filter(x => x.invernadero_id === inv.id).reduce((s, x) => s + (x.monto || 0), 0) || 0
      return { name: inv.nombre, Ingresos: ing, Gastos: egr, Utilidad: ing - egr }
    })
    setBalancesGrafica(resumen || [])
  }

  useEffect(() => { if (session) cargarTodo() }, [session]);

  const actualizarFilaDespacho = (index, campo, valor) => {
    const nuevasFilas = [...despachoForm.filas]
    nuevasFilas[index][campo] = valor
    setDespachoForm({ ...despachoForm, filas: nuevasFilas })
  }

  const guardarDespachoCompleto = async (e) => {
  e.preventDefault();
  
  try {
    if (pagoForm.id_editando) {
      await supabase.from('pagos').update(payload).eq('id', pagoForm.id_editando);
    } else {
      await supabase.from('pagos').insert([payload]);
    }
    
    mostrarAlerta(pagoForm.id_editando ? "Abono actualizado" : "Abono registrado");
    // ----------------------------------------------------

    // Ahora procedemos a guardar como si fuera nuevo, 
    // pero al haber borrado el anterior, el efecto es de "Actualización".
    const totalVenta = despachoForm.filas.reduce((acc, f) => 
      acc + (parseFloat(f.cantidad || 0) * parseFloat(f.precio || 0)), 0);

    const { data: venta, error: vError } = await supabase.from('ventas').insert([{
      numero_remision: despachoForm.numero_remision,
      cliente_id: despachoForm.cliente_id,
      invernadero_id: despachoForm.invernadero_id,
      total_venta: totalVenta, 
      fecha_venta: despachoForm.fecha_venta
    }]).select().single();

    if (vError) throw vError;

    if (venta) {
      const detalles = despachoForm.filas.map(f => ({
        venta_id: venta.id,
        descripcion: f.producto,
        escala: f.escala,
        cantidad: parseFloat(f.cantidad),
        precio_unitario: parseFloat(f.precio)
      }));

      const { error: dError } = await supabase.from('detalle_ventas').insert(detalles);
      if (dError) throw dError;

      mostrarAlerta(despachoForm.id_editando ? "Remisión actualizada correctamente" : "Despacho registrado");
      
      // Limpiamos el formulario y reseteamos id_editando a null
      setDespachoForm({ 
        id_editando: null, 
        numero_remision: '', 
        cliente_id: '', 
        invernadero_id: '', 
        fecha_venta: new Date().toISOString().split('T')[0], 
        filas: [{ producto: '', escala: '', cantidad: '', precio: '' }] 
      });
      
      cargarTodo(); // Recargamos la lista para ver los cambios
    }
  } catch (error) {
    mostrarAlerta("Error al procesar: " + error.message, "error");
  }
};

//=======



  // Función para ELIMINAR
const eliminarDespacho = async (id) => {
  if (window.confirm("¿Está seguro de eliminar esta remisión?")) {
    // 1. Borramos los detalles primero (por seguridad de la base de datos)
    await supabase.from('detalle_ventas').delete().eq('venta_id', id);
    // 2. Borramos la venta principal
    const { error } = await supabase.from('ventas').delete().eq('id', id);
    
    if (!error) {
      mostrarAlerta("Remisión eliminada correctamente");
      cargarTodo(); // Refresca la tabla
    }
  }
};

// Función para EDITAR (Carga los datos arriba para corregir)
const prepararEdicion = (despacho) => {
  setDespachoForm({
    id_editando: despacho.id, // Guardamos el ID para saber que vamos a actualizar este
    numero_remision: despacho.numero_remision,
    cliente_id: despacho.cliente_id,
    invernadero_id: despacho.invernadero_id,
    fecha_venta: despacho.fecha_venta,
    filas: despacho.detalle_ventas.map(d => ({
      producto: d.descripcion,
      escala: d.escala,
      cantidad: d.cantidad,
      precio: d.precio_unitario
    }))
  });
  window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube al formulario automáticamente
};

  

  const NavItem = ({ id, label, icon }) => (
    <button onClick={() => { setTab(id); setIsMenuOpen(false); setShowConfigSubmenu(false); }} 
      className={`flex items-center gap-3 w-full p-4 rounded-xl transition ${tab === id ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-800'}`}>
      <span className="text-xl">{icon}</span> <span className="font-bold text-sm capitalize">{label}</span>
    </button>
  )

  if (!session) return <Login setSession={setSession} />;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-900 shadow-2xl transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static transition-transform duration-300 flex flex-col`}>
        <div className="p-8 text-center border-b border-green-800">
          <h2 className="text-white font-black text-2xl tracking-tighter">🚜 GRANJA WP</h2>
        </div>
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          <NavItem id="dashboard" label="Dashboard" icon="📊" />
          <NavItem id="despachos" label="Despachos" icon="🚛" />
          <NavItem id="pagos" label="Pagos / Caja" icon="💳" />
          <NavItem id="gastos" label="Gastos" icon="📉" />
          <NavItem id="reporte" label="Reporte de Ventas" icon="📈" />
          
          <div className="space-y-1">
            <button onClick={() => setShowConfigSubmenu(!showConfigSubmenu)} 
              className={`flex items-center justify-between w-full p-4 rounded-xl transition ${tab.startsWith('config-') ? 'bg-green-800 text-white' : 'text-green-100 hover:bg-green-800'}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">⚙️</span>
                <span className="font-bold text-sm">Configuración</span>
              </div>
              <span className="text-xs">{showConfigSubmenu ? '▲' : '▼'}</span>
            </button>
            {showConfigSubmenu && (
              <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-200">
                <button onClick={() => { setTab('config-inv'); setIsMenuOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold transition ${tab === 'config-inv' ? 'text-white bg-green-700' : 'text-green-300 hover:bg-green-800'}`}>🏠 Invernaderos</button>
                <button onClick={() => { setTab('config-cli'); setIsMenuOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold transition ${tab === 'config-cli' ? 'text-white bg-green-700' : 'text-green-300 hover:bg-green-800'}`}>👥 Clientes</button>
                <button onClick={() => { setTab('config-prov'); setIsMenuOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold transition ${tab === 'config-prov' ? 'text-white bg-green-700' : 'text-green-300 hover:bg-green-800'}`}>🚚 Proveedores</button>
              </div>
            )}
          </div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 w-full p-4 rounded-xl text-red-200 hover:bg-red-900/50 mt-10">
            <span>🚪</span> <span className="text-sm font-bold">Cerrar Sesión</span>
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white p-4 shadow-sm flex justify-between items-center lg:px-10">
          <button className="lg:hidden text-2xl p-2 text-green-900" onClick={() => setIsMenuOpen(true)}>☰</button>
          <h1 className="text-xl font-black text-green-900 tracking-tight uppercase">{tab.replace('config-', 'Configuración: ').replace('reporte', 'Reporte de Ventas')}</h1>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 space-y-10">
        
{tab === 'dashboard' && (
  <div className="space-y-8 animate-in fade-in duration-500">
    {/* SECCIÓN DE KPIs GLOBALES */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-blue-500 transition-transform hover:scale-105">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Ingresos Totales</p>
        <p className="text-2xl font-black text-slate-800">
          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
            datosDespachos.reduce((acc, d) => acc + (d.total_venta || 0), 0)
          )}
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-red-500 transition-transform hover:scale-105">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Gastos Totales</p>
        <p className="text-2xl font-black text-slate-800">
          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
            datosEgresos.reduce((acc, e) => acc + (e.monto || 0), 0)
          )}
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-green-500 transition-transform hover:scale-105">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Utilidad Neta</p>
        <p className="text-2xl font-black text-green-600">
          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
            datosDespachos.reduce((acc, d) => acc + (d.total_venta || 0), 0) - 
            datosEgresos.reduce((acc, e) => acc + (e.monto || 0), 0)
          )}
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-3xl shadow-lg transition-transform hover:scale-105">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Eficiencia (Margen)</p>
        <p className="text-3xl font-black text-white">
          {(() => {
            const v = datosDespachos.reduce((acc, d) => acc + (d.total_venta || 0), 0);
            const g = datosEgresos.reduce((acc, e) => acc + (e.monto || 0), 0);
            return v > 0 ? (((v - g) / v) * 100).toFixed(1) : 0;
          })()}%
        </p>
      </div>
    </div>

    {/* GRÁFICO PRINCIPAL */}
    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h3 className="font-black text-slate-800 text-lg uppercase italic tracking-tighter">Balance Consolidado</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Rendimiento comparativo por invernadero</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-[9px] font-black uppercase text-slate-500">Ingresos</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-[9px] font-black uppercase text-slate-500">Gastos</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-[9px] font-black uppercase text-slate-500">Utilidad</span></div>
        </div>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={balancesGrafica} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" fontSize={11} fontWeight="900" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
            <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(value) => `$${value/1000000}M`} />
            <Tooltip 
              cursor={{fill: '#f8fafc'}}
              contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }} 
            />
            <Bar dataKey="Ingresos" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={40} />
            <Bar dataKey="Gastos" fill="#ef4444" radius={[10, 10, 0, 0]} barSize={40} />
            <Bar dataKey="Utilidad" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* SECCIÓN DE CARTERA PENDIENTE */}
    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="bg-amber-100 p-4 rounded-2xl text-2xl">💰</div>
        <div>
          <h4 className="font-black text-slate-800 uppercase italic text-sm">Cartera Total Pendiente</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Dinero por recaudar de despachos realizados</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-4xl font-black text-amber-600 tracking-tighter">
          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
            datosDespachos.reduce((acc, d) => acc + (d.total_venta || 0), 0) - 
            datosPagos.reduce((acc, p) => acc + (p.monto || 0), 0)
          )}
        </p>
      </div>
    </div>
  </div>
)}

          {tab === 'despachos' && (
            <Despachos 
              despachoForm={despachoForm} setDespachoForm={setDespachoForm} 
              listaClientes={listaClientes} listaInvernaderos={listaInvernaderos} 
              actualizarFilaDespacho={actualizarFilaDespacho} guardarDespachoCompleto={guardarDespachoCompleto} 
              datosDespachos={datosDespachos} 
              datosPagos={datosPagos} 
              mostrarAlerta={mostrarAlerta} 

              despachoForm={despachoForm} 
              setDespachoForm={setDespachoForm}
              listaClientes={listaClientes} 
              listaInvernaderos={listaInvernaderos}
              actualizarFilaDespacho={actualizarFilaDespacho} 
              guardarDespachoCompleto={guardarDespachoCompleto}
              datosDespachos={datosDespachos}
              // ESTAS DOS SON LAS QUE FALTAN CONECTAR:
              eliminarDespacho={eliminarDespacho} 
              prepararEdicion={prepararEdicion}


            />
          )}

          {tab === 'pagos' && (
            <Pagos 
              listaClientes={listaClientes} 
              datosDespachos={datosDespachos} 
              guardarPago={guardarPago} 
              datosPagos={datosPagos} 
              mostrarAlerta={mostrarAlerta} 
              pagoForm={pagoForm}
              setPagoForm={setPagoForm}
              cargarTodo={cargarTodo} 
              prepararEdicionPago={prepararEdicionPago}
              eliminarPago={eliminarPago}
            />
          )}
                    
      {tab === 'gastos' && (
        <Gastos 
          gastoForm={gastoForm} setGastoForm={setGastoForm} 
          listaInvernaderos={listaInvernaderos} listaProveedores={listaProveedores} 
          mostrarAlerta={mostrarAlerta} cargarTodo={cargarTodo} 
          supabase={supabase} datosEgresos={datosEgresos}
    // AÑADIR ESTAS 3 LÍNEAS ABAJO:
          guardarGasto={guardarGasto}
          prepararEdicionGasto={prepararEdicionGasto}
          eliminarGasto={eliminarGasto}
  />
)}  

          {tab === 'reporte' && (
            <ReporteVentas 
              listaInvernaderos={listaInvernaderos}
              datosDespachos={datosDespachos}
              datosEgresos={datosEgresos}
              datosPagos={datosPagos}
            />
          )}

          {tab === 'config-inv' && <ConfigInv invForm={invForm} setInvForm={setInvForm} mostrarAlerta={mostrarAlerta} cargarTodo={cargarTodo} supabase={supabase} lista={listaInvernaderos} />}
          {tab === 'config-cli' && <ConfigCli cliForm={cliForm} setCliForm={setCliForm} mostrarAlerta={mostrarAlerta} cargarTodo={cargarTodo} supabase={supabase} lista={listaClientes} />}
          {tab === 'config-prov' && <ConfigProv provForm={provForm} setProvForm={setProvForm} mostrarAlerta={mostrarAlerta} cargarTodo={cargarTodo} supabase={supabase} lista={listaProveedores} />}
        </main>
      </div>

      {notificacion.visible && (
        <div className="fixed bottom-10 right-10 z-[100] bg-white border border-green-100 p-6 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <span className="text-2xl">{notificacion.tipo === 'exito' ? '✅' : '❌'}</span>
          <p className="text-sm font-bold text-green-800">{notificacion.mensaje}</p>
        </div>
      )}
    </div>
  )
}

export default App;