import React from 'react';

export default function Despachos({ 
  despachoForm, 
  setDespachoForm, 
  listaClientes, 
  listaInvernaderos, 
  actualizarFilaDespacho, 
  guardarDespachoCompleto, 
  datosDespachos,
  prepararEdicion, // Función para cargar datos en el formulario
  eliminarDespacho // Función para borrar de la DB
}) {
  
  const opcionesEscala = ["Kilo", "Bulto", "Caja", "Unidad", "Gramos", "Canastilla"];

  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0 
  }).format(valor || 0);

  // Cálculo del gran total del despacho en tiempo real
  const totalFormulario = (despachoForm?.filas || []).reduce((acc, fila) => {
    return acc + (parseFloat(fila.cantidad || 0) * parseFloat(fila.precio || 0));
  }, 0);

  const agregarFila = () => {
    setDespachoForm({
      ...despachoForm,
      filas: [...despachoForm.filas, { producto: '', escala: '', cantidad: '', precio: '' }]
    });
  };

  const eliminarFilaFormulario = (index) => {
    if (despachoForm.filas.length === 1) return;
    const nuevasFilas = despachoForm.filas.filter((_, i) => i !== index);
    setDespachoForm({ ...despachoForm, filas: nuevasFilas });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* TARJETA DE REGISTRO DE DESPACHO */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border-t-8 border-green-700">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚛</span>
            <h3 className="font-black text-green-900 uppercase text-sm tracking-widest italic">
              {despachoForm.id_editando ? 'Corregir Remisión' : 'Nuevo Despacho / Remisión'}
            </h3>
          </div>
          <div className="text-right bg-green-50 p-4 rounded-2xl border border-green-100">
            <p className="text-[10px] font-black text-green-600 uppercase italic">Valor Total Carga</p>
            <p className="text-3xl font-black text-green-700">{formatoPesos(totalFormulario)}</p>
          </div>
        </div>
        
        <form onSubmit={guardarDespachoCompleto} className="space-y-8">
          {/* SECCIÓN 1: DATOS CABECERA */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase px-1 italic">N° Remisión</label>
              <input 
                className="w-full border-2 p-3 rounded-xl font-bold focus:border-green-500 outline-none bg-white text-lg" 
                value={despachoForm.numero_remision} 
                onChange={e => setDespachoForm({...despachoForm, numero_remision: e.target.value})} 
                required 
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase px-1 italic">Fecha Despacho</label>
              <input 
                type="date" 
                className="w-full border-2 p-3 rounded-xl font-bold bg-white" 
                value={despachoForm.fecha_venta} 
                onChange={e => setDespachoForm({...despachoForm, fecha_venta: e.target.value})} 
                required 
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase px-1 italic">Invernadero (Origen)</label>
              <select 
                className="w-full border-2 p-3 rounded-xl font-bold bg-white"
                value={despachoForm.invernadero_id}
                onChange={e => setDespachoForm({...despachoForm, invernadero_id: e.target.value})}
                required
              >
                <option value="">Seleccione...</option>
                {listaInvernaderos.map(inv => <option key={inv.id} value={inv.id}>{inv.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase px-1 italic">Cliente (Destino)</label>
              <select 
                className="w-full border-2 p-3 rounded-xl font-bold bg-white"
                value={despachoForm.cliente_id}
                onChange={e => setDespachoForm({...despachoForm, cliente_id: e.target.value})}
                required
              >
                <option value="">Seleccione...</option>
                {listaClientes.map(cli => <option key={cli.id} value={cli.id}>{cli.nombre_completo}</option>)}
              </select>
            </div>
          </div>

          {/* SECCIÓN 2: DETALLE MULTIPRODUCTO */}
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-[10px] font-black text-gray-400 uppercase italic">
              <div className="col-span-4">Producto / Variedad</div>
              <div className="col-span-2 text-center">Cantidad</div>
              <div className="col-span-2 text-center">Escala</div>
              <div className="col-span-2 text-center">Precio Unit.</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>

            {despachoForm.filas.map((fila, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-center">
                <div className="col-span-4">
                  <input 
                    placeholder="Ej: Tomate Larga Vida" 
                    className="w-full p-2 bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-green-500" 
                    value={fila.producto} 
                    onChange={e => actualizarFilaDespacho(index, 'producto', e.target.value)} 
                    required 
                  />
                </div>
                <div className="col-span-2">
                  <input 
                    type="number" 
                    placeholder="0" 
                    className="w-full p-2 bg-transparent font-black text-sm text-center outline-none border-b border-transparent focus:border-green-500" 
                    value={fila.cantidad} 
                    onChange={e => actualizarFilaDespacho(index, 'cantidad', e.target.value)} 
                    required 
                  />
                </div>
                <div className="col-span-2">
                  <select 
                    className="w-full p-2 bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-green-500" 
                    value={fila.escala} 
                    onChange={e => actualizarFilaDespacho(index, 'escala', e.target.value)} 
                    required
                  >
                    <option value="">...</option>
                    {opcionesEscala.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <input 
                    type="text" 
                    placeholder="$ 0" 
                    className="w-full p-2 bg-transparent font-black text-green-700 text-sm text-center outline-none border-b border-transparent focus:border-green-500" 
                    value={formatoPesos(fila.precio)} 
                    onChange={e => actualizarFilaDespacho(index, 'precio', e.target.value.replace(/\D/g, ""))} 
                    required 
                  />
                </div>
                <div className="col-span-2 flex justify-between items-center pl-4">
                  <p className="font-black text-slate-800 text-sm">
                    {formatoPesos(parseFloat(fila.cantidad || 0) * parseFloat(fila.precio || 0))}
                  </p>
                  {despachoForm.filas.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => eliminarFilaFormulario(index)}
                      className="text-red-400 hover:text-red-600 ml-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            <div className="flex justify-start px-2">
              <button 
                type="button" 
                onClick={agregarFila}
                className="bg-blue-600 text-white text-[10px] font-black px-6 py-2 rounded-full shadow-md hover:bg-blue-700 transition-all uppercase tracking-widest italic"
              >
                + Añadir clase de producto
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-green-700 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-[0.2em] text-sm hover:bg-green-800 transition-all active:scale-[0.98]"
          >
            {despachoForm.id_editando ? 'Actualizar Remisión Completa' : 'Guardar Despacho Completo'}
          </button>
        </form>
      </div>

      {/* HISTORIAL CON ACCIONES (EDITAR / ELIMINAR) */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-slate-800 p-4">
          <h3 className="text-white font-black uppercase text-[10px] tracking-widest italic">Historial Reciente de Cargas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase italic">
                <th className="p-4">Fecha</th>
                <th className="p-4">N° Remisión</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Productos (Cant + Escala)</th>
                <th className="p-4 text-right">Total Carga</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
  {datosDespachos?.map((d) => (
    <tr 
      key={d.id} 
      // Se cambia 'slate-50' por 'slate-100' para una cebra más fuerte
      // Se añade 'border-l-4' para marcar el inicio de cada fila como en el ejemplo
      className="hover:bg-green-50 transition-colors font-bold odd:bg-white even:bg-slate-100 border-l-4 border-transparent even:border-l-slate-300"
    >
      <td className="p-4 text-slate-600 italic">{d.fecha_venta}</td>
      <td className="p-4 font-black text-slate-900 text-sm">{d.numero_remision}</td>
      <td className="p-4 uppercase text-slate-700">{d.clientes?.nombre_completo || 'N/A'}</td>
      <td className="p-4">
        <div className="space-y-2">
          {d.detalle_ventas?.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <p className="font-black text-slate-800 uppercase leading-none">{item.descripcion}</p>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-[9px] font-black italic">
                {item.cantidad} {item.escala}
              </span>
            </div>
          ))}
        </div>
      </td>
      <td className="p-4 text-right font-black text-green-700 text-sm">
        {formatoPesos(d.total_venta)}
      </td>
      
      {/* ACCIONES SIEMPRE VISIBLES Y CON MÁS COLOR */}
      <td className="p-4 text-right">
        <div className="flex gap-3 justify-end">
          <button 
            onClick={() => prepararEdicion(d)}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md"
            title="Editar Remisión"
          >
            ✏️
          </button>
          <button 
            onClick={() => eliminarDespacho(d.id)}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md"
            title="Eliminar Remisión"
          >
            🗑️
          </button>
        </div>
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