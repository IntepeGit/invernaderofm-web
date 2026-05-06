export default function Ventas({ ventaForm, setVentaForm, listaClientes, listaInvernaderos, actualizarFilaVenta, guardarVentaCompleta, datosVentas }) {
  return (
    <div className="space-y-6 pb-20">
      {/* TARJETA DE REGISTRO DE VENTA */}
      
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border-t-8 border-green-700">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xl">💰</span>
          <h3 className="font-black text-green-900 uppercase text-sm tracking-widest">Nueva Venta / Registro de Remisión</h3>
        </div>
        
        <form onSubmit={guardarVentaCompleta} className="space-y-6">
          {/* ENCABEZADO DE VENTA CON ETIQUETAS ORIGINALES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">N° de Remisión</label>
              <input placeholder="Ej: 001" className="w-full border-2 p-3 rounded-xl focus:border-green-500 outline-none" 
                value={ventaForm.numero_remision} onChange={e=>setVentaForm({...ventaForm, numero_remision: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Seleccionar Cliente</label>
              <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-green-500" 
                value={ventaForm.cliente_id} onChange={e=>setVentaForm({...ventaForm, cliente_id: e.target.value})}>
                <option value="">¿A quién le vendes?</option>
                {listaClientes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Seleccionar Invernadero</label>
              <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-green-500" 
                value={ventaForm.invernadero_id} onChange={e=>setVentaForm({...ventaForm, invernadero_id: e.target.value})}>
                <option value="">Origen del producto...</option>
                {listaInvernaderos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Fecha de Venta</label>
              <input type="date" className="w-full border-2 p-3 rounded-xl focus:border-green-500 outline-none" 
                value={ventaForm.fecha_venta} onChange={e=>setVentaForm({...ventaForm, fecha_venta: e.target.value})} />
            </div>
          </div>

          {/* DETALLE DE PRODUCTOS */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-tighter border-b pb-2">Detalle de Productos</h4>
            {ventaForm.filas.map((fila, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border relative animate-in fade-in slide-in-from-left-2">
                <div className="md:col-span-1">
                  <input placeholder="Producto (Fresa, Lechuga...)" className="w-full p-2 border-b bg-transparent outline-none text-sm" 
                    value={fila.producto} onChange={e=>actualizarFilaVenta(index, 'producto', e.target.value)} />
                </div>
                <input placeholder="Escala (Extra, Primera...)" className="w-full p-2 border-b bg-transparent outline-none text-sm" 
                  value={fila.escala} onChange={e=>actualizarFilaVenta(index, 'escala', e.target.value)} />
                <input type="number" placeholder="Cantidad" className="w-full p-2 border-b bg-transparent outline-none text-sm" 
                  value={fila.cantidad} onChange={e=>actualizarFilaVenta(index, 'cantidad', e.target.value)} />
                <div className="flex gap-2">
                  <input type="number" placeholder="Precio Unit." className="w-full p-2 border-b bg-transparent outline-none text-sm font-bold text-green-700" 
                    value={fila.precio} onChange={e=>actualizarFilaVenta(index, 'precio', e.target.value)} />
                  {ventaForm.filas.length > 1 && (
                    <button type="button" onClick={() => setVentaForm({...ventaForm, filas: ventaForm.filas.filter((_, i) => i !== index)})} className="text-red-400 px-2 font-bold">✕</button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setVentaForm({...ventaForm, filas: [...ventaForm.filas, {producto:'', escala:'', cantidad:'', precio:''}]})} 
              className="text-green-700 font-black text-[10px] hover:underline uppercase tracking-widest">
              + Añadir otro producto a esta remisión
            </button>
          </div>

          <button type="submit" className="w-full bg-green-700 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-green-800 transition-all active:scale-95 uppercase tracking-widest">
            Registrar Venta Completa
          </button>
        </form>
      </div>

     <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest">Historial Detallado de Remisiones</h3>
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Mostrando últimas 10</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-gray-400 border-b uppercase font-black tracking-tighter">
                <th className="py-2 px-1 text-center">No.</th>
                <th className="py-2">Fecha</th>
                <th className="py-2">Invernadero</th>
                <th className="py-2">Cliente</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Ordenamos por ID descendente para ver la última venta primero */}
              {[...datosVentas].sort((a, b) => b.id - a.id).slice(0, 10).map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-slate-50 transition animate-in fade-in">
                  <td className="py-3 px-1 font-bold text-center text-gray-400">{v.numero_remision}</td>
                  <td className="py-3 whitespace-nowrap">{v.fecha_venta || 'S/F'}</td>
                  <td className="py-3">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium">
                      {v.invernaderos?.nombre || 'General'}
                    </span>
                  </td>
                  <td className="py-3">
                    <p className="font-bold text-gray-700">{v.clientes?.nombre_completo}</p>
                  </td>
                  <td className="py-3 text-right font-black text-green-700 text-sm">
                    ${v.total_venta?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}