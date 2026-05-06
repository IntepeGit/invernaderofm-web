import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Dashboard from './pages/Dashboard.jsx'
import Ventas from './pages/Ventas.jsx'
import Gastos from './pages/Gastos.jsx'
import ConfigInv from './pages/ConfigInv.jsx'
import ConfigCli from './pages/ConfigCli.jsx'
import ConfigProv from './pages/ConfigProv.jsx'


function App() {
  const [tab, setTab] = useState('dashboard')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [datosVentas, setDatosVentas] = useState([])
  const [datosEgresos, setDatosEgresos] = useState([])
  const [listaInvernaderos, setListaInvernaderos] = useState([])
  const [listaClientes, setListaClientes] = useState([])
  const [listaProveedores, setListaProveedores] = useState([])
  const [balancesGrafica, setBalancesGrafica] = useState([])
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'exito' });

  const mostrarAlerta = (msj, tipo = 'exito') => {
    setNotificacion({ visible: true, mensaje: msj, tipo });
    setTimeout(() => setNotificacion(prev => ({ ...prev, visible: false })), 3000);
  };

  // Estados de Formularios
  const [ventaForm, setVentaForm] = useState({ numero_remision: '', cliente_id: '', invernadero_id: '', fecha_venta: new Date().toISOString().split('T')[0], filas: [{ producto: '', escala: '', cantidad: '', precio: '' }] })
  const [gastoForm, setGastoForm] = useState({ descripcion: '', categoria: 'Mano de obra', monto: '', invernadero_id: '', proveedor_id: '', numero_comprobante: '', nota: '', fecha: new Date().toISOString().split('T')[0] })
  const [invForm, setInvForm] = useState({ nombre: '', cultivo: '', variedad: '', largo: '', ancho: '', siembra: '', cosecha: '', estado: 'Activo', descripcion: '' })
  const [cliForm, setCliForm] = useState({ nombre: '', nit: '', tel: '', dir: '', ciudad: '', nota: '',email: ''})
  const [provForm, setProvForm] = useState({ nombre: '', nit: '', tel: '', dir: '', ciudad: '', nota: '' })

  // --- LÓGICA DE VENTAS REINSERTADA ---
  const actualizarFilaVenta = (index, campo, valor) => {
    const nuevasFilas = [...ventaForm.filas];
    nuevasFilas[index][campo] = valor;
    setVentaForm({ ...ventaForm, filas: nuevasFilas });
  };

  const guardarVentaCompleta = async (e) => {
    e.preventDefault();
    const totalVenta = ventaForm.filas.reduce((acc, f) => acc + (f.cantidad * f.precio), 0);
    
    const { data: venta } = await supabase.from('ventas').insert([{
      numero_remision: ventaForm.numero_remision,
      cliente_id: ventaForm.cliente_id,
      invernadero_id: ventaForm.invernadero_id,
      total_venta: totalVenta,
      fecha_venta: ventaForm.fecha_venta
    }]).select().single();

    if (venta) {
      const detalles = ventaForm.filas.map(f => ({
        venta_id: venta.id,
        descripcion: f.producto,
        escala: f.escala,
        cantidad: parseFloat(f.cantidad),
        precio_unitario: parseFloat(f.precio)
      }));
      await supabase.from('detalle_ventas').insert(detalles);
      mostrarAlerta("Venta registrada con éxito", "exito");
      setVentaForm({ ...ventaForm, numero_remision: '', filas: [{ producto: '', escala: '', cantidad: '', precio: '' }] });
      cargarTodo();
    }
  };
  // --- FIN LÓGICA DE VENTAS ---

  async function cargarTodo() {
    const { data: v } = await supabase.from('ventas').select('*, clientes(*), invernaderos(*)')
    const { data: e } = await supabase.from('egresos').select('*, invernaderos(*), proveedores(*)')
    const { data: i } = await supabase.from('invernaderos').select('*')
    const { data: c } = await supabase.from('clientes').select('*')
    const { data: p } = await supabase.from('proveedores').select('*')

    setDatosVentas(v || []); setDatosEgresos(e || []); setListaInvernaderos(i || []); setListaClientes(c || []); setListaProveedores(p || [])

    const resumen = i?.map(inv => {
      const ing = v?.filter(x => x.invernadero_id === inv.id).reduce((s, x) => s + (x.total_venta || 0), 0) || 0
      const egr = e?.filter(x => x.invernadero_id === inv.id).reduce((s, x) => s + (x.monto || 0), 0) || 0
      return { name: inv.nombre, Ingresos: ing, Gastos: egr, Utilidad: ing - egr }
    })
    setBalancesGrafica(resumen || [])
  }

  useEffect(() => { cargarTodo() }, [])

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-900 shadow-2xl transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static transition-transform duration-300`}>
        <div className="p-8 text-center border-b border-green-800">
          <h2 className="text-white font-black text-2xl tracking-tighter text-center flex items-center justify-center gap-2">🚜 GRANJA WP</h2>
        </div>
       
      <nav className="p-4 space-y-2 font-bold tracking-wide">
  {['dashboard', 'ventas', 'gastos', 'configuracion'].map(item => (
    <button 
      key={item} 
      onClick={() => { setTab(item); setIsMenuOpen(false); }} 
      className={`flex items-center gap-3 w-full p-4 rounded-xl transition shadow-sm ${
        tab === item 
          ? 'bg-green-700 text-white border-l-4 border-white' 
          : 'text-green-100 hover:bg-green-800'
      }`}
    >
      <span className="text-2xl">
        {item === 'dashboard' ? '📊' : item === 'ventas' ? '💰' : item === 'gastos' ? '📉' : '⚙️'}
      </span> 
      <span className="text-sm capitalize">
        {item}
      </span>
    </button>
  ))}
</nav>
       
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white p-4 shadow-sm flex justify-between items-center lg:justify-center relative">
          <button className="lg:hidden text-2xl" onClick={() => setIsMenuOpen(true)}>☰</button>
          <div className="flex items-center gap-3 mx-auto text-green-900 font-black">
            <img src="https://img.icons8.com/color/96/farm.png" alt="Logo" className="w-10 h-10" />
            <h1 className="text-2xl tracking-tighter">GRANJA WP</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 space-y-10">
          {tab === 'dashboard' && <Dashboard balancesGrafica={balancesGrafica} />}
          
          {tab === 'ventas' && (
            <Ventas 
              ventaForm={ventaForm} 
              setVentaForm={setVentaForm} 
              listaClientes={listaClientes} 
              listaInvernaderos={listaInvernaderos} 
              actualizarFilaVenta={actualizarFilaVenta} 
              guardarVentaCompleta={guardarVentaCompleta} 
              datosVentas={datosVentas} 
            />
          )}

          {tab === 'gastos' && (
            <Gastos 
              gastoForm={gastoForm} 
              setGastoForm={setGastoForm} 
              listaInvernaderos={listaInvernaderos} 
              listaProveedores={listaProveedores} 
              mostrarAlerta={mostrarAlerta} 
              cargarTodo={cargarTodo} 
              supabase={supabase} 
            />
          )}

          {tab === 'configuracion' && (
  <div className="space-y-10 pb-24">
    <ConfigInv invForm={invForm} setInvForm={setInvForm} mostrarAlerta={mostrarAlerta} cargarTodo={cargarTodo} supabase={supabase} />
    <ConfigCli cliForm={cliForm} setCliForm={setCliForm} mostrarAlerta={mostrarAlerta} cargarTodo={cargarTodo} supabase={supabase} />
    <ConfigProv provForm={provForm} setProvForm={setProvForm} mostrarAlerta={mostrarAlerta} cargarTodo={cargarTodo} supabase={supabase} />
  </div>
)}
        </main>
      </div>

      {notificacion.visible && (
        <div className="fixed bottom-10 right-10 z-[100] bg-white border border-green-100 p-6 rounded-2xl shadow-2xl flex items-center gap-3">
          <span className="text-2xl">{notificacion.tipo === 'exito' ? '✅' : '❌'}</span>
          <div>
            <p className="font-black text-[10px] uppercase text-gray-400">Granja WP</p>
            <p className="text-sm font-bold text-green-800">{notificacion.mensaje}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;