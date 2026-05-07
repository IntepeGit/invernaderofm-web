export default function Gastos({ gastoForm, setGastoForm, listaInvernaderos, listaProveedores, mostrarAlerta, cargarTodo, supabase, lista }) {
  const categorias = ["Mano de obra", "Insumo Agricola", "Flete", "Mto (Mantenimiento)", "S.Publicos", "Arriendos"];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!gastoForm.invernadero_id || !gastoForm.monto || !gastoForm.descripcion) {
      mostrarAlerta("Invernadero, Monto y Descripción son obligatorios", "error");
      return;
    }

    const datosEgresos = {
      invernadero_id: gastoForm.invernadero_id,
      descripcion: gastoForm.descripcion,
      monto: parseFloat(gastoForm.monto),
      categoria: gastoForm.categoria,
      proveedor_id: gastoForm.proveedor_id || null,
      numero_comprobante: gastoForm.numero_comprobante,
      nota: gastoForm.nota,
      fecha_gasto: gastoForm.fecha || new Date().toISOString().split('T')[0]
    };

    const { error } = await supabase.from('egresos').insert([datosEgresos]);

    if (error) {
      console.error("Error en Supabase:", error);
      mostrarAlerta("Error al guardar: " + error.message, "error");
    } else {
      mostrarAlerta("Gasto registrado con éxito", "exito");
      setGastoForm({ 
        descripcion: '', 
        categoria: 'Mano de obra', 
        monto: '', 
        invernadero_id: '', 
        proveedor_id: '', 
        numero_comprobante: '', 
        nota: '', 
        fecha: new Date().toISOString().split('T')[0] 
      });
      cargarTodo();
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* FORMULARIO DE REGISTRO */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border-t-8 border-red-600">
        <div className="flex items-center gap-2 mb-8 border-b pb-4">
          <span className="text-xl">📉</span>
          <h3 className="font-black text-red-900 uppercase text-sm tracking-widest">Registro Detallado de Gastos</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Invernadero / Destino</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-red-500" 
              value={gastoForm.invernadero_id} 
              onChange={e => setGastoForm({ ...gastoForm, invernadero_id: e.target.value })}>
              <option value="">Seleccionar Invernadero...</option>
              {listaInvernaderos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Fecha del Gasto</label>
            <input type="date" className="w-full border-2 p-3 rounded-xl outline-none" 
              value={gastoForm.fecha} 
              onChange={e => setGastoForm({ ...gastoForm, fecha: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Categoría</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-red-500" 
              value={gastoForm.categoria} 
              onChange={e => setGastoForm({ ...gastoForm, categoria: e.target.value })}>
              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Proveedor</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-red-500" 
              value={gastoForm.proveedor_id} 
              onChange={e => setGastoForm({ ...gastoForm, proveedor_id: e.target.value })}>
              <option value="">Seleccionar Proveedor...</option>
              {listaProveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Concepto / Descripción</label>
            <input placeholder="Ej: Compra de fertilizantes" className="w-full border-2 p-3 rounded-xl outline-none focus:border-red-500" 
              value={gastoForm.descripcion} 
              onChange={e => setGastoForm({ ...gastoForm, descripcion: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase text-red-500">Monto ($)</label>
            <input type="number" placeholder="0" className="w-full border-2 border-red-500 p-3 rounded-xl font-bold text-red-600 outline-none" 
              value={gastoForm.monto} 
              onChange={e => setGastoForm({ ...gastoForm, monto: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">N° Comprobante / Factura</label>
            <input placeholder="Ej: FAC-123" className="w-full border-2 p-3 rounded-xl outline-none focus:border-red-500" 
              value={gastoForm.numero_comprobante} 
              onChange={e => setGastoForm({ ...gastoForm, numero_comprobante: e.target.value })} />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Notas Adicionales</label>
            <textarea className="w-full border-2 p-3 rounded-xl h-20 outline-none focus:border-red-500" 
              placeholder="Observaciones..." 
              value={gastoForm.nota} 
              onChange={e => setGastoForm({ ...gastoForm, nota: e.target.value })} />
          </div>

          <button type="submit" className="md:col-span-2 bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-red-700 active:scale-95 transition-all uppercase tracking-widest">
            Guardar Gasto en Bitácora
          </button>
        </form>
      </div>

      {/* TABLA DE CONSULTA DE GASTOS */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
        <div className="p-5 bg-gray-50 border-b-2 border-gray-200 flex justify-between items-center">
          <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">Gastos Registrados</h3>
          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase">Historial</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-gray-200 text-slate-600 uppercase tracking-tighter font-black">
                <th className="p-4 border-b-2 border-gray-300">Invernadero</th>
                <th className="p-4 border-b-2 border-gray-300">Fecha</th>
                <th className="p-4 border-b-2 border-gray-300">Categoría</th>
                <th className="p-4 border-b-2 border-gray-300">Proveedor</th>
                <th className="p-4 border-b-2 border-gray-300 text-right">Monto</th>
                <th className="p-4 border-b-2 border-gray-300 text-center">Factura</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-200">
              {lista?.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-100'} hover:bg-yellow-50 transition-colors`}
                >
                  <td className="p-4 font-bold text-slate-800 border-l-4 border-red-600">
                    {item.invernaderos?.nombre || 'N/A'}
                  </td>
                  <td className="p-4 text-slate-600 font-medium">
                    {item.fecha_gasto}
                  </td>
                  <td className="p-4">
                    <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[9px] font-bold">
                      {item.categoria}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">
                    {item.proveedores?.nombre || '---'}
                  </td>
                  <td className="p-4 text-right font-black text-red-600">
                    ${new Intl.NumberFormat('es-CO').format(item.monto)}
                  </td>
                  <td className="p-4 text-center font-mono text-slate-500">
                    {item.numero_comprobante || '---'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {(!lista || lista.length === 0) && (
            <div className="p-10 text-center text-gray-400 italic">
              No hay gastos registrados todavía.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}