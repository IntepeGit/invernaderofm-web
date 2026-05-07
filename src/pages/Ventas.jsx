export default function Ventas({ ventaForm, setVentaForm, listaClientes, listaInvernaderos, actualizarFilaVenta, guardarVentaCompleta, datosVentas }) {
  
  const opcionesEscala = ["Kilo", "Bulto", "Caja", "Unidad", "Gramos", "Canastilla"];

  const totalFormulario = ventaForm.filas.reduce((acc, fila) => {
    return acc + (parseFloat(fila.cantidad || 0) * parseFloat(fila.precio || 0));
  }, 0);

  return (
    <div className="space-y-6 pb-20">
      {/* FORMULARIO DE REGISTRO */}
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
              <input placeholder="Ej: 001" className="w-full border-2 p-3 rounded-xl focus:border-green-500 outline-none font-bold" 
                value={ventaForm.numero_remision} onChange={e=>setVentaForm({...ventaForm, numero_remision: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Fecha</label>
              <input type="date" className="w-full border-2 p-3 rounded-xl focus:border-green-500 outline-none font-bold" 
                value={ventaForm.fecha_venta} onChange={e=>setVentaForm({...ventaForm, fecha_venta: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Invernadero</label>
              <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-green-500 font-bold" 
                value={ventaForm.invernadero_id} onChange={e=>setVentaForm({...ventaForm, invernadero_id: e.target.value})}>
                <option value="">Seleccionar...</option>
                {listaInvernaderos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Cliente</label>
              <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-green-500 font-bold" 
                value={ventaForm.cliente_id} onChange={e=>setVentaForm({...ventaForm, cliente_id: e.target.value})}>
                <option value="">Seleccionar...</option>
                {listaClientes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b pb-2">Detalle de Carga</h4>
            {ventaForm.filas.map((fila, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm relative">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-1">Producto</label>
                  <input placeholder="Producto" className="w-full p-2 border-b bg-transparent outline-none text-sm font-bold focus:border-green-500" 
                    value={fila.producto} onChange={e=>actualizarFilaVenta(index, 'producto', e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-1">Escala</label>
                  <select
                    className="w-full border-2 p-2 rounded-xl bg-white outline-none focus:border-green-500 font-bold text-xs"
                    value={fila.escala}
                    onChange={(e) => actualizarFilaVenta(index, 'escala', e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {opcionesEscala.map(opcion => (
                      <option key={opcion} value={opcion}>{opcion}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-1">Cant.</label>
                  <input type="number" placeholder="0" className="w-full p-2 border-b bg-transparent outline-none text-sm font-black focus:border-green-500" 
                    value={fila.cantidad} onChange={e=>actualizarFilaVenta(index, 'cantidad', e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase px-1">Precio</label>
                  <input type="number" placeholder="0" className="w-full p-2 border-b bg-transparent outline-none text-sm font-black text-green-700 focus:border-green-500" 
                    value={fila.precio} onChange={e=>actualizarFilaVenta(index, 'precio', e.target.value)} />
                </div>
                
                <div className="flex items-center justify-end gap-4">
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Subtotal</p>
                    <p className="font-black text-slate-700">${(parseFloat(fila.cantidad || 0) * parseFloat(fila.precio || 0)).toLocaleString()}</p>
                  </div>
                  {ventaForm.filas.length > 1 && (
                    <button type="button" onClick={() => setVentaForm({...ventaForm, filas: ventaForm.filas.filter((_, i) => i !== index)})} 
                      className="bg-red-100 text-red-600 w-8 h-8 rounded-full font-bold hover:bg-red-200 transition-colors">✕</button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setVentaForm({...ventaForm, filas: [...ventaForm.filas, {producto:'', escala:'', cantidad:'', precio:''}]})} 
              className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[10px] hover:bg-slate-200 uppercase tracking-widest transition-colors">
              + Añadir Producto
            </button>
          </div>

          <button type="submit" className="w-full bg-green-700 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-green-800 transition-all uppercase tracking-widest text-lg">
            Guardar Remisión
          </button>
        </form>
      </div>

      {/* HISTORIAL CON ESCALA VISIBLE */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-400">
        <div className="p-5 bg-gray-200 border-b-2 border-gray-400 flex justify-between items-center">
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Historial de Ventas</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-gray-300 text-slate-800 uppercase font-black">
                <th className="p-4 border-b-2 border-gray-400 text-center">N°</th>
                <th className="p-4 border-b-2 border-gray-400">Fecha</th>
                <th className="p-4 border-b-2 border-gray-400">Invernadero</th>
                <th className="p-4 border-b-2 border-gray-400">Cliente</th>
                <th className="p-4 border-b-2 border-gray-400">Detalle Productos</th>
                <th className="p-4 border-b-2 border-gray-400 text-center">Cant.</th>
                <th className="p-4 border-b-2 border-gray-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-400">
              {datosVentas?.sort((a, b) => b.id - a.id).map((v, index) => {
                const items = v.detalle_ventas || [];
                const sumaCantidades = items.reduce((acc, item) => acc + (parseFloat(item.cantidad) || 0), 0);
                
                return (
                  <tr key={v.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-yellow-100 transition-colors`}>
                    <td className="p-4 text-center font-black text-slate-600 border-l-8 border-green-700">
                      {v.numero_remision}
                    </td>
                    <td className="p-4 text-slate-700 font-bold italic whitespace-nowrap">
                      {v.fecha_venta || '---'}
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-black uppercase whitespace-nowrap">
                        {v.invernaderos?.nombre || 'General'}
                      </span>
                    </td>
                    <td className="p-4 font-black text-slate-900 uppercase">
                      {v.clientes?.nombre_completo || 'N/A'}
                    </td>
                    <td className="p-4">
                      {/* Aquí mostramos Producto y Escala debajo */}
                      <div className="flex flex-col gap-1">
                        {items.length > 0 ? items.map((item, i) => (
                          <div key={i} className="mb-1 last:mb-0">
                            <p className="font-black text-slate-800 uppercase leading-none">{item.descripcion}</p>
                            <p className="text-[9px] font-bold text-green-700 italic"> {item.escala || 'N/A'}</p>
                          </div>
                        )) : <span className="text-gray-400 italic">Sin datos</span>}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-800 text-white px-2 py-1 rounded-md font-black text-[10px]">
                        {sumaCantidades}
                      </span>
                    </td>
                    <td className="p-4 text-right font-black text-green-800 text-[12px] whitespace-nowrap">
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