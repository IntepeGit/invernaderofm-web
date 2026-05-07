export default function Despachos({ despachoForm, setDespachoForm, listaClientes, listaInvernaderos, actualizarFilaDespacho, guardarDespachoCompleto, datosDespachos, datosPagos, mostrarAlerta }) {
  
  const opcionesEscala = ["Kilo", "Bulto", "Caja", "Unidad", "Gramos", "Canastilla"];

  // Validación de N° de Remisión duplicado
  const remisionExiste = datosDespachos?.some(d => d.numero_remision?.toString() === despachoForm.numero_remision?.toString());

  const totalFormulario = (despachoForm?.filas || []).reduce((acc, fila) => {
    return acc + (parseFloat(fila.cantidad || 0) * parseFloat(fila.precio || 0));
  }, 0);

  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0 
  }).format(valor || 0);

  const manejarEnvio = (e) => {
    e.preventDefault();
    if (remisionExiste) {
      mostrarAlerta(`El N° de Remisión ${despachoForm.numero_remision} ya existe.`, "error");
      return;
    }
    guardarDespachoCompleto(e);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* FORMULARIO DE REGISTRO */}
      <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-green-700">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚛</span>
            <h3 className="font-black text-green-900 uppercase text-sm italic">Registro de Despacho</h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase">Valor Total Carga</p>
            <p className="text-2xl font-black text-green-700">{formatoPesos(totalFormulario)}</p>
          </div>
        </div>
        
        <form onSubmit={manejarEnvio} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">N° Remisión</label>
              <input className="w-full border-2 p-3 rounded-xl font-bold focus:border-green-500 outline-none" value={despachoForm.numero_remision} onChange={e=>setDespachoForm({...despachoForm, numero_remision: e.target.value})} required />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Fecha</label>
              <input type="date" className="w-full border-2 p-3 rounded-xl font-bold" value={despachoForm.fecha_venta} onChange={e=>setDespachoForm({...despachoForm, fecha_venta: e.target.value})} required />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Invernadero</label>
              <select className="w-full border-2 p-3 rounded-xl bg-white font-bold" value={despachoForm.invernadero_id} onChange={e=>setDespachoForm({...despachoForm, invernadero_id: e.target.value})} required>
                <option value="">Seleccionar...</option>
                {listaInvernaderos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Cliente</label>
              <select className="w-full border-2 p-3 rounded-xl bg-white font-bold" value={despachoForm.cliente_id} onChange={e=>setDespachoForm({...despachoForm, cliente_id: e.target.value})} required>
                <option value="">Seleccionar...</option>
                {listaClientes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
             {/* ENCABEZADO DE PRODUCTOS */}
             <div className="hidden md:grid grid-cols-6 gap-2 px-3">
                <span className="md:col-span-2 text-[9px] font-black text-gray-400 uppercase italic">Producto</span>
                <span className="text-[9px] font-black text-gray-400 uppercase italic text-center">Cantidad</span>
                <span className="text-[9px] font-black text-gray-400 uppercase italic text-center">Escala</span>
                <span className="text-[9px] font-black text-green-700 uppercase italic text-center">Precio Unit.</span>
                <span className="text-[9px] font-black text-gray-400 uppercase italic text-right">SubTotal</span>
             </div>

            {despachoForm.filas.map((fila, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 items-end">
                <div className="md:col-span-2">
                  <input placeholder="Producto" className="w-full p-2 border-b bg-transparent font-bold uppercase text-xs" value={fila.producto} onChange={e=>actualizarFilaDespacho(index, 'producto', e.target.value)} required />
                </div>
                <div>
                  <input type="number" className="w-full p-2 border-b bg-transparent font-black text-xs text-center" value={fila.cantidad} onChange={e=>actualizarFilaDespacho(index, 'cantidad', e.target.value)} required />
                </div>
                <div>
                  <select className="w-full p-2 border-b bg-transparent font-bold text-xs" value={fila.escala} onChange={e=>actualizarFilaDespacho(index, 'escala', e.target.value)} required>
                    <option value="">...</option>
                    {opcionesEscala.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <input 
                    className="w-full p-2 border-b bg-transparent font-black text-green-700 text-xs text-center" 
                    value={fila.precio ? new Intl.NumberFormat('es-CO').format(fila.precio) : ''} 
                    onChange={e=>actualizarFilaDespacho(index, 'precio', e.target.value.replace(/\D/g, ""))} 
                    required 
                  />
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-700 text-xs">{formatoPesos(parseFloat(fila.cantidad || 0) * parseFloat(fila.precio || 0))}</p>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setDespachoForm({...despachoForm, filas: [...despachoForm.filas, {producto:'', escala:'', cantidad:'', precio:''}]})} className="text-[9px] font-black text-blue-600 uppercase">+ Agregar Fila</button>
          </div>
          <button type="submit" className="w-full bg-green-700 text-white font-black py-4 rounded-xl shadow-lg uppercase">Guardar Despacho</button>
        </form>
      </div>

      {/* HISTORIAL SIN COLUMNA DE ABONOS */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-400">
        <div className="p-4 bg-gray-200 border-b-2 border-gray-400 text-center font-black text-xs uppercase italic">Estado de Cartera (Saldos Reales)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="bg-gray-300 font-black uppercase">
                <th className="p-4 text-center">Remisión</th>
                <th className="p-4">Cliente</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Valor Venta</th>
                <th className="p-4 text-right bg-slate-800 text-white italic">Saldo Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-400">
              {datosDespachos?.sort((a, b) => b.id - a.id).map((d, index) => {
                const totalVenta = parseFloat(d.total_venta || 0);
                
                // Cálculo interno del saldo (aunque no mostremos la columna de abonos)
                const totalPagado = (datosPagos || [])
                  .filter(p => String(p.despacho_id) === String(d.id))
                  .reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);

                const saldo = totalVenta - totalPagado;

                let badge = { text: 'Sin Pago', color: 'bg-red-100 text-red-700 border-red-300' };
                if (saldo <= 0) badge = { text: 'Cancelado', color: 'bg-green-600 text-white border-green-700 shadow-md' };
                else if (totalPagado > 0) badge = { text: 'Por Cobrar', color: 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-sm' };

                return (
                  <tr key={d.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-100'} hover:bg-green-50 transition-colors`}>
                    <td className="p-4 text-center font-black border-l-8 border-green-700">{d.numero_remision}</td>
                    <td className="p-4 font-black uppercase text-slate-900">{d.clientes?.nombre_completo || 'N/A'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full font-black text-[9px] uppercase border ${badge.color}`}>{badge.text}</span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-500">{formatoPesos(totalVenta)}</td>
                    <td className={`p-4 text-right font-black text-[13px] ${saldo > 0 ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'}`}>
                      {formatoPesos(saldo)}
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