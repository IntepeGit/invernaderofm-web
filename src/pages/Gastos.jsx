export default function Gastos({ gastoForm, setGastoForm, listaInvernaderos, listaProveedores, mostrarAlerta, cargarTodo, supabase }) {
  const categorias = ["Mano de obra", "Insumo Agricola", "Flete", "Mto (Mantenimiento)", "S.Publicos", "Arriendos"];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación de campos obligatorios
    if (!gastoForm.invernadero_id || !gastoForm.monto || !gastoForm.descripcion) {
      mostrarAlerta("Invernadero, Monto y Descripción son obligatorios", "error");
      return;
    }

    // MAPEADO EXACTO A TU TABLA 'EGRESOS'
    const datosEgresos = {
      invernadero_id: gastoForm.invernadero_id,
      descripcion: gastoForm.descripcion,
      monto: parseFloat(gastoForm.monto),
      categoria: gastoForm.categoria,
      proveedor_id: gastoForm.proveedor_id || null,
      numero_comprobante: gastoForm.numero_comprobante,
      nota: gastoForm.nota,
      fecha_gasto: gastoForm.fecha || new Date().toISOString().split('T')[0] // Columna exacta de tu DB
    };

    const { error } = await supabase.from('egresos').insert([datosEgresos]);

    if (error) {
      console.error("Error en Supabase:", error);
      mostrarAlerta("Error al guardar: " + error.message, "error");
    } else {
      mostrarAlerta("Gasto registrado con éxito", "exito");
      
      // LIMPIEZA DE LOS CUADRITOS
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
      
      cargarTodo(); // Actualiza el Dashboard
    }
  };

  return (
    <div className="space-y-6 pb-20">
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
    </div>
  );
}