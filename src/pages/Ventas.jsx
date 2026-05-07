export default function Ventas({ ventaForm, setVentaForm, listaClientes, listaInvernaderos, actualizarFilaVenta, guardarVentaCompleta, datosVentas }) {
  
  // Calcular el gran total de lo que se está digitando
  const totalFormulario = ventaForm.filas.reduce((acc, fila) => {
    return acc + (parseFloat(fila.cantidad || 0) * parseFloat(fila.precio || 0));
  }, 0);

  return (
    <div className="space-y-6 pb-20">
      {/* TARJETA DE REGISTRO DE VENTA */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border-t-8 border-green-700">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <h3 className="font-black text-green-900 uppercase text-sm tracking-widest">Nueva Venta / Remisión</h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase">Total a Registrar</p>
            <p className="text-2xl font-black text-green-700">${totalFormulario.toLocaleString('es-CO')}</p>
          </div>
        </div>
        
        <form onSubmit={guardarVentaCompleta} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">N° de Remisión</label>
              <input placeholder="Ej: 001" className="w-full border-2 p-3 rounded-xl focus:border-green-500 outline-none" 
                value={ventaForm.numero_remision} onChange={e=>setVentaForm({...ventaForm, numero_remision: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Fecha</label>
              <input type="date" className="w-full border-2 p-3 rounded-xl focus:border-green-500 outline-none" 
                value={ventaForm.fecha_venta} onChange={e=>setVentaForm({...ventaForm, fecha_venta: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Invernadero</label>
              <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-green-500" 
                value={ventaForm.invernadero_id} onChange={e=>setVentaForm({...ventaForm, invernadero_id: e.target.value})}>
                <option value="">Seleccionar...</option>
                {listaInvernaderos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Cliente</label>
              <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-green-500" 
                value={ventaForm.cliente_id} onChange={e=>setVentaForm({...ventaForm, cliente_id: e.target.value})}>
                <option value="">Seleccionar...</option>
                {listaClientes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
              </select>
            </div>
          </div>

          {/* DETALLE DE PRODUCTOS */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b pb-2">Detalle de Carga</h4>
            {ventaForm.filas.map((fila, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm relative">
                <input placeholder="Producto" className="w-full p-2 border-b bg-transparent outline-none text-sm font-bold" 
                  value={fila.producto} onChange={e=>actualizarFilaVenta(index, 'producto', e.target.value)} />
                <input placeholder="Escala" className="w-full p-2 border-b bg-transparent outline-none text-sm" 
                  value={fila.escala} onChange={e=>actualizarFilaVenta(index, 'escala', e.target.value)} />
                <input type="number" placeholder="Cant." className="w-full p-2 border-b bg-transparent outline-none text-sm font-black" 
                  value={fila.cantidad} onChange={e=>actualizarFilaVenta(index, 'cantidad', e.target.value)} />
                <input type="number" placeholder="Precio" className="w-full p-2 border-b bg-transparent outline-none text-sm font-black text-green-700" 
                  value={fila.precio} onChange={e=>actualizarFilaVenta(index, 'precio', e.target.value)} />
                
                <div className="flex items-center justify-end gap-4">
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Subtotal</p>
                    <p className="font-bold text-slate-700">${(parseFloat(fila.cantidad || 0) * parseFloat(fila.precio || 0)).toLocaleString()}</p>
                  </div>
                  {ventaForm.filas.length > 1 && (
                    <button type="button" onClick={() => setVentaForm({...ventaForm, filas: ventaForm.filas.filter((_, i) => i !== index)})} className="bg-red-100 text-red-600 w-8 h-8 rounded-full font-bold">✕</button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setVentaForm({...ventaForm, filas: [...ventaForm.filas, {producto:'', escala:'', cantidad:'', precio:''}]})} 
              className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[10px] hover:bg-slate-200 uppercase tracking-widest transition-colors">
              + Añadir Producto / Canastilla
            </button>
          </div>

          <button type="submit" className="w-full bg-green-700 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-green-800 transition-all uppercase tracking-widest active:scale-95 text-lg">
            Guardar Remisión y Actualizar Inventario
          </button>
        </form>
      </div>

      
     {/* HISTORIAL CON ALTO CONTRASTE Y SUMA REAL */}
{/* HISTORIAL CON ALTO CONTRASTE, PRODUCTOS Y CANTIDADES REALES */}
{/* HISTORIAL CON COLUMNA DE PRODUCTOS */}
{/* HISTORIAL CON COLUMNA DE PRODUCTO CORREGIDA */}
{/* HISTORIAL CON COLUMNA DE PRODUCTO (USANDO 'DESCRIPCION') */}
<div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-400">
  <div className="p-5 bg-gray-200 border-b-2 border-gray-400 flex justify-between items-center">
    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Historial de Ventas</h3>
    <span className="bg-green-700 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Oficial</span>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-left text-[11px] border-collapse">
      <thead>
        <tr className="bg-gray-300 text-slate-800 uppercase font-black">
          <th className="p-4 border-b-2 border-gray-400 text-center">N°</th>
          <th className="p-4 border-b-2 border-gray-400">Fecha</th>
          <th className="p-4 border-b-2 border-gray-400">Invernadero</th>
          <th className="p-4 border-b-2 border-gray-400">Cliente</th>
          <th className="p-4 border-b-2 border-gray-400">Producto</th>
          <th className="p-4 border-b-2 border-gray-400 text-center">Total Cant.</th>
          <th className="p-4 border-b-2 border-gray-400 text-right">Total Venta</th>
        </tr>
      </thead>
      <tbody className="divide-y-2 divide-gray-400">
        {datosVentas?.sort((a, b) => b.id - a.id).map((v, index) => {
          // Extraemos los items cargados desde detalle_ventas
          const items = v.detalle_ventas || [];
          
          // MAPEADO CORRECTO: Usamos 'item.descripcion' que es como se llama en tu tabla
          const textoProductos = items.length > 0 
            ? items.map(i => i.descripcion).filter(p => p).join(" / ") 
            : "Sin datos";

          // Sumamos las cantidades (campo 'cantidad')
          const sumaCantidades = items.reduce((acc, item) => acc + (parseFloat(item.cantidad) || 0), 0);

          return (
            <tr key={v.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-yellow-100 transition-colors`}>
              <td className="p-4 text-center font-black text-slate-600 border-l-8 border-green-700">
                {v.numero_remision}
              </td>
              <td className="p-4 text-slate-700 font-bold italic">
                {v.fecha_venta || '---'}
              </td>
              <td className="p-4">
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-black uppercase shadow-sm">
                  {v.invernaderos?.nombre || 'General'}
                </span>
              </td>
              <td className="p-4 font-black text-slate-900">
                {v.clientes?.nombre_completo || 'N/A'}
              </td>
              {/* Celda de Producto usando la columna descripcion */}
              <td className="p-4 text-slate-700 font-black uppercase italic">
                {textoProductos}
              </td>
              <td className="p-4 text-center">
                <span className="bg-slate-800 text-white px-3 py-1 rounded-md font-black text-xs">
                  {sumaCantidades}
                </span>
              </td>
              <td className="p-4 text-right font-black text-green-800 text-[13px]">
                ${new Intl.NumberFormat('es-CO').format(v.total_venta || 0)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</div>
    </div>
  );
}