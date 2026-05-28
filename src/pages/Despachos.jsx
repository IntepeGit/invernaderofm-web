import React from 'react';

export default function Despachos({ 
  despachoForm, 
  setDespachoForm, 
  listaClientes, 
  listaInvernaderos, 
  actualizarFilaDespacho, 
  guardarDespachoCompleto, 
  datosDespachos,
  prepararEdicion, 
  imprimirPDF, 
  eliminarDespacho 
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO DE DESPACHO (1/3) */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-green-700 h-fit">
          <div className="flex justify-between items-center mb-5 border-b pb-3">
            <h3 className="font-black text-slate-800 uppercase text-xs italic">
              {despachoForm.id_editando ? '📝 Editar Remisión' : '🚛 Nueva Remisión'}
            </h3>
            <div className="text-right bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
              <p className="text-[9px] font-black text-green-600 uppercase italic leading-none">Total Carga</p>
              <p className="text-sm font-black text-green-700 mt-0.5">{formatoPesos(totalFormulario)}</p>
            </div>
          </div>
          
          <form onSubmit={guardarDespachoCompleto} className="space-y-4">
            
            {/* CAMPO NÚMERO DE REMISIÓN */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Número de Remisión</label>
              <input
                type="text"
                placeholder="N° Remisión"
                className={`w-full p-2.5 border-2 rounded-xl font-black text-sm outline-none transition-all ${
                  despachoForm.errorDuplicado 
                    ? 'border-red-400 bg-red-50 text-red-600 focus:border-red-500' 
                    : 'border-blue-100 bg-blue-50/50 text-blue-600 focus:border-blue-500'
                }`}
                value={despachoForm.numero_remision}
                onChange={(e) => setDespachoForm({...despachoForm, numero_remision: e.target.value})}
              />
              {despachoForm.errorDuplicado && (
                <span className="text-[9px] font-black text-red-600 block mt-1 ml-1 animate-pulse">
                  ⚠️ ESTE NÚMERO YA EXISTE
                </span>
              )}
            </div>

            {/* FECHA DESPACHO */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Fecha Despacho</label>
              <input 
                type="date" 
                className="w-full border-2 p-2.5 rounded-xl font-bold text-sm bg-white outline-none focus:border-green-700" 
                value={despachoForm.fecha_venta} 
                onChange={e => setDespachoForm({...despachoForm, fecha_venta: e.target.value})} 
                required 
              />
            </div>

            {/* INVERNADERO ORIGEN */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Invernadero (Origen)</label>
              <select 
                className="w-full border-2 p-2.5 rounded-xl font-bold text-xs bg-white outline-none focus:border-green-700"
                value={despachoForm.invernadero_id}
                onChange={e => setDespachoForm({...despachoForm, invernadero_id: e.target.value})}
                required
              >
                <option value="">Seleccione bloque...</option>
                {listaInvernaderos.map(inv => <option key={inv.id} value={inv.id}>{inv.nombre}</option>)}
              </select>
            </div>

            {/* CLIENTE DESTINO */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Cliente (Destino)</label>
              <select 
                className="w-full border-2 p-2.5 rounded-xl font-bold text-xs bg-white outline-none focus:border-green-700"
                value={despachoForm.cliente_id}
                onChange={e => setDespachoForm({...despachoForm, cliente_id: e.target.value})}
                required
              >
                <option value="">Seleccione cliente...</option>
                {listaClientes.map(cli => <option key={cli.id} value={cli.id}>{cli.nombre_completo}</option>)}
              </select>
            </div>

            {/* SECCIÓN MULTIPRODUCTO DINÁMICA */}
            <div className="pt-2 space-y-3 border-t">
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider italic">📦 Desglose de Productos</p>
              
              {despachoForm.filas.map((fila, index) => (
                <div key={index} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 relative">
                  {despachoForm.filas.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => eliminarFilaFormulario(index)}
                      className="absolute top-2 right-3 text-red-400 hover:text-red-600 font-black text-xs"
                      title="Eliminar fila"
                    >
                      ✕
                    </button>
                  )}
                  
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase">Producto / Variedad</label>
                    <input 
                      placeholder="Ej: Tomate Larga Vida" 
                      className="w-full p-2 border bg-white rounded-xl font-bold text-xs outline-none focus:border-green-500" 
                      value={fila.producto} 
                      onChange={e => actualizarFilaDespacho(index, 'producto', e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Cantidad</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="w-full p-2 border bg-white rounded-xl font-black text-xs text-center outline-none focus:border-green-500" 
                        value={fila.cantidad} 
                        onChange={e => actualizarFilaDespacho(index, 'cantidad', e.target.value)} 
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Escala</label>
                      <select 
                        className="w-full p-2 border bg-white rounded-xl font-bold text-xs outline-none focus:border-green-500" 
                        value={fila.escala} 
                        onChange={e => actualizarFilaDespacho(index, 'escala', e.target.value)} 
                        required
                      >
                        <option value="">...</option>
                        {opcionesEscala.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center pt-1">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Precio Unit.</label>
                      <input 
                        type="text" 
                        placeholder="$ 0" 
                        className="w-full p-1.5 border bg-white rounded-xl font-black text-green-700 text-xs text-center outline-none focus:border-green-500" 
                        value={formatoPesos(fila.precio)} 
                        onChange={e => actualizarFilaDespacho(index, 'precio', e.target.value.replace(/\D/g, ""))} 
                        required 
                      />
                    </div>
                    <div className="text-right pr-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Subtotal</p>
                      <p className="font-black text-slate-800 text-xs mt-1">
                        {formatoPesos(parseFloat(fila.cantidad || 0) * parseFloat(fila.precio || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              <button 
                type="button" 
                onClick={agregarFila}
                className="w-full bg-blue-50 text-blue-600 text-[10px] font-black py-2 rounded-xl border border-dashed border-blue-300 hover:bg-blue-100 transition-colors uppercase tracking-widest"
              >
                + Añadir Producto
              </button>
            </div>

            <button 
              type="submit" 
              className="w-full bg-green-700 text-white font-black py-3.5 rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-green-800 transition-all"
            >
              {despachoForm.id_editando ? '💾 Actualizar Remisión' : '🚀 Guardar Remisión'}
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: TABLA HISTÓRICA DE CARGAS (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-4 bg-slate-800 text-white font-black text-xs uppercase tracking-widest italic flex justify-between items-center">
            <span>Historial Reciente de Cargas</span>
            <span className="text-[10px] bg-green-700 px-2 py-0.5 rounded-md">Despachos</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-300 text-slate-800 uppercase font-black">
                  <th className="p-4 border-b-2 border-gray-400">Fecha</th>
                  <th className="p-4 border-b-2 border-gray-400">N° Remisión</th>
                  <th className="p-4 border-b-2 border-gray-400">Cliente / Destino</th>
                  <th className="p-4 border-b-2 border-gray-400">Productos (Cant + Escala)</th>
                  <th className="p-4 border-b-2 border-gray-400 text-right">Total Carga</th>
                  <th className="p-4 border-b-2 border-gray-400 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-400">
                {datosDespachos?.map((d, index) => (
                  <tr 
                    key={d.id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-yellow-100 transition-colors border-l-8 border-green-700`}
                  >
                    <td className="p-4 font-bold text-slate-600 italic">{d.fecha_venta}</td>
                    <td className="p-4 font-black text-slate-900 text-sm">{d.numero_remision}</td>
                    <td className="p-4 uppercase font-bold text-slate-700">
                      <p>{d.clientes?.nombre_completo || 'N/A'}</p>
                      <p className="text-[9px] text-slate-400 lowercase italic font-medium mt-0.5">🌿 Bloque: {d.invernaderos?.nombre || 'Gral'}</p>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1.5">
                        {d.detalle_ventas?.map((item, i) => (
                          <div key={i} className="flex gap-1.5 items-center">
                            <p className="font-black text-slate-800 uppercase text-[10px] leading-none">{item.descripcion}</p>
                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md text-[8px] font-black italic">
                              {item.cantidad} {item.escala}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right font-black text-green-700 text-[12px]">
                      {formatoPesos(d.total_venta)}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1.5 justify-center">
                        <button 
                          onClick={() => imprimirPDF(d)} 
                          className="px-2 py-1 bg-slate-800 text-white rounded-lg hover:bg-black transition-colors flex items-center gap-1 border border-slate-900 shadow-md"
                          title="Imprimir PDF"
                        >
                          <span className="text-[11px]">🖨️</span><span className="text-[9px] font-black tracking-wider">PDF</span>
                        </button>
                        <button 
                          onClick={() => eliminarDespacho(d.id)}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md"
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
    </div>
  );
}