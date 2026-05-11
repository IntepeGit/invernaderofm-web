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
  const [gastoForm, setGastoForm] = useState({ descripcion: '', categoria: 'Mano de obra', monto: '', invernadero_id: '', proveedor_id: '', numero_comprobante: '', nota: '', fecha: new Date().toISOString().split('T')[0] })
  const [invForm, setInvForm] = useState({ nombre: '', cultivo: '', variedad: '', largo: '', ancho: '', siembra: '', cosecha: '', estado: 'Activo', descripcion: '' })
  const [cliForm, setCliForm] = useState({ nombre: '', nit: '', tel: '', dir: '', ciudad: '', nota: '', email: '' })
  const [provForm, setProvForm] = useState({ nombre: '', nit: '', tel: '', dir: '', ciudad: '', nota: '' })

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
    e.preventDefault()
    const totalVenta = despachoForm.filas.reduce((acc, f) => acc + (parseFloat(f.cantidad || 0) * parseFloat(f.precio || 0)), 0)
    const { data: venta } = await supabase.from('ventas').insert([{
      numero_remision: despachoForm.numero_remision,
      cliente_id: despachoForm.cliente_id,
      invernadero_id: despachoForm.invernadero_id,
      total_venta: totalVenta, 
      fecha_venta: despachoForm.fecha_venta
    }]).select().single()

    if (venta) {
      const detalles = despachoForm.filas.map(f => ({
        venta_id: venta.id,
        descripcion: f.producto,
        escala: f.escala,
        cantidad: parseFloat(f.cantidad),
        precio_unitario: parseFloat(f.precio)
      }))
      await supabase.from('detalle_ventas').insert(detalles)
      mostrarAlerta("Despacho registrado con éxito")
      setDespachoForm({ ...despachoForm, numero_remision: '', filas: [{ producto: '', escala: '', cantidad: '', precio: '' }] })
      cargarTodo()
    }
  }

  const guardarPago = async (pagoData) => {
    const { error } = await supabase.from('pagos').insert([{
      cliente_id: pagoData.cliente_id,
      despacho_id: pagoData.despacho_id,
      fecha_pago: pagoData.fecha_pago,
      monto: parseFloat(pagoData.monto),
      referencia: pagoData.referencia
    }])

    if (!error) {
      mostrarAlerta("Pago registrado correctamente");
      cargarTodo();
    } else {
      mostrarAlerta("Error al registrar pago", "error");
    }
  }

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
            <div className="bg-white p-6 rounded-3xl shadow-sm text-center">
              <h3 className="font-black text-gray-400 text-[10px] mb-8 uppercase tracking-widest">Balance Consolidado por Invernadero</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={balancesGrafica}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="Ingresos" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Gastos" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Utilidad" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
            />
          )}

          {tab === 'pagos' && (
            <Pagos 
              listaClientes={listaClientes} 
              datosDespachos={datosDespachos} 
              guardarPago={guardarPago} 
              datosPagos={datosPagos} 
              mostrarAlerta={mostrarAlerta} 
            />
          )}

          {tab === 'gastos' && (
            <Gastos 
              gastoForm={gastoForm} setGastoForm={setGastoForm} 
              listaInvernaderos={listaInvernaderos} listaProveedores={listaProveedores} 
              mostrarAlerta={mostrarAlerta} cargarTodo={cargarTodo} 
              supabase={supabase} datosEgresos={datosEgresos} 
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