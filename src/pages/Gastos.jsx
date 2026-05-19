import { useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function Gastos({ 
  gastoForm, 
  setGastoForm, 
  listaInvernaderos, 
  listaProveedores, 
  mostrarAlerta, 
  cargarTodo, 
  supabase, 
  datosEgresos,
  eliminarGasto,   // Prop para eliminar
  imprimirGastoPDF // Prop para PDF
}) {
  const categorias = ["Mano de obra", "Insumo Agricola", "Flete", "Mto (Mantenimiento)", "S.Publicos", "Arriendos", "Quincena", "Otros"];
  const unidades = ["Canastilla", "Kilo", "Bulto", "Litro", "Jornal", "Unidad", "Hora", "Otra", "Caja", "Garrafa", "Galon"];

  // Cálculo automático del monto total (Cantidad x Precio Unitario)
  useEffect(() => {
    const total = (parseFloat(gastoForm.cantidad) || 0) * (parseFloat(gastoForm.precio_unitario) || 0);
    if (total !== parseFloat(gastoForm.monto)) {
      setGastoForm(prev => ({ ...prev, monto: total }));
    }
  }, [gastoForm.cantidad, gastoForm.precio_unitario, setGastoForm]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!gastoForm.invernadero_id || !gastoForm.monto || !gastoForm.descripcion) {
      mostrarAlerta("Invernadero, Monto y Descripción son obligatorios", "error");
      return;
    }

    const payload = {
      invernadero_id: gastoForm.invernadero_id,
      descripcion: gastoForm.descripcion,
      monto: parseFloat(gastoForm.monto) || 0,
      categoria: gastoForm.categoria,
      proveedor_id: gastoForm.proveedor_id || null,
      numero_comprobante: gastoForm.numero_comprobante || 'S/N',
      nota: gastoForm.nota,
      fecha_gasto: gastoForm.fecha || new Date().toISOString().split('T')[0],
      cantidad: parseFloat(gastoForm.cantidad) || 0,
      unidad_medida: gastoForm.unidad_medida,
      precio_unitario: parseFloat(gastoForm.precio_unitario) || 0
    };

    const { error } = await supabase.from('egresos').insert([payload]);

    if (error) {
      mostrarAlerta("Error al guardar: " + error.message, "error");
    } else {
      mostrarAlerta("Gasto registrado correctamente", "exito");
      setGastoForm({ 
        invernadero_id: '', descripcion: '', monto: 0, categoria: 'Insumo Agricola', 
        proveedor_id: '', numero_comprobante: '', nota: '', fecha: new Date().toISOString().split('T')[0], 
        cantidad: '', unidad_medida: 'Unidad', precio_unitario: '' 
      });
      cargarTodo();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* FORMULARIO DE REGISTRO */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border-t-8 border-red-700">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">💸</span>
            <h3 className="font-black text-red-900 uppercase text-sm tracking-widest">Nuevo Gasto / Egreso</h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Total a Pagar</p>
            <p className="text-2xl font-black text-red-700">${(parseFloat(gastoForm.monto) || 0).toLocaleString('es-CO')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Fecha</label>
            <input type="date" className="w-full border-2 p-3 rounded-xl outline-none focus:border-red-500 font-bold" 
              value={gastoForm.fecha} onChange={e => setGastoForm({...gastoForm, fecha: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Invernadero</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-red-500 font-bold" 
              value={gastoForm.invernadero_id} onChange={e => setGastoForm({...gastoForm, invernadero_id: e.target.value})}>
              <option value="">Seleccionar...</option>
              {listaInvernaderos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Categoría</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-red-500 font-bold" 
              value={gastoForm.categoria} onChange={e => setGastoForm({...gastoForm, categoria: e.target.value})}>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Concepto del Gasto</label>
            <input placeholder="Ej: Compra de abono" className="w-full border-2 p-3 rounded-xl outline-none focus:border-red-500 font-bold" 
              value={gastoForm.descripcion} onChange={e => setGastoForm({...gastoForm, descripcion: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Proveedor / Beneficiario</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white outline-none focus:border-red-500 font-bold" 
              value={gastoForm.proveedor_id} onChange={e => setGastoForm({...gastoForm, proveedor_id: e.target.value})}>
              <option value="">Particular / Otros</option>
              {listaProveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          {/* DETALLE ECONÓMICO */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 grid grid-cols-2 md:grid-cols-4 md:col-span-3 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase">Cantidad</label>
              <input type="number" className="w-full p-2 border-b-2 border-slate-300 bg-transparent outline-none font-black text-lg text-slate-700" 
                value={gastoForm.cantidad} onChange={e => setGastoForm({...gastoForm, cantidad: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase">U. Medida</label>
              <select className="w-full p-2 border-b-2 border-slate-300 bg-transparent outline-none font-bold" 
                value={gastoForm.unidad_medida} onChange={e => setGastoForm({...gastoForm, unidad_medida: e.target.value})}>
                {unidades.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase">Precio Unitario</label>
              <input type="number" className="w-full p-2 border-b-2 border-slate-300 bg-transparent outline-none font-black text-lg text-red-600" 
                value={gastoForm.precio_unitario} onChange={e => setGastoForm({...gastoForm, precio_unitario: e.target.value})} />
            </div>
            <div className="space-y-1 text-center">
              <label className="text-[9px] font-black text-slate-500 uppercase italic">Monto Total</label>
              <div className="text-xl font-black text-slate-800 p-2 italic">${(parseFloat(gastoForm.monto) || 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1 text-red-600">N° Comprobante</label>
            <input className="w-full border-2 border-red-200 p-3 rounded-xl outline-none font-bold" 
              value={gastoForm.numero_comprobante} onChange={e => setGastoForm({...gastoForm, numero_comprobante: e.target.value})} />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase px-1">Notas</label>
            <input className="w-full border-2 p-3 rounded-xl outline-none font-bold" 
              value={gastoForm.nota} onChange={e => setGastoForm({...gastoForm, nota: e.target.value})} />
          </div>

          <button type="submit" className="md:col-span-3 bg-red-700 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-red-800 transition-all uppercase tracking-widest text-lg">
            Registrar Egreso en Bitácora
          </button>
        </form>
      </div>

      {/* TABLA DE HISTORIAL */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-400">
        <div className="p-5 bg-gray-200 border-b-2 border-gray-400">
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Historial Detallado de Gastos</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-gray-300 text-slate-800 uppercase font-black italic">
                <th className="p-4 border-b-2 border-gray-400">Fecha / Factura</th>
                <th className="p-4 border-b-2 border-gray-400">Invernadero</th>
                <th className="p-4 border-b-2 border-gray-400">Concepto</th>
                <th className="p-4 border-b-2 border-gray-400 text-center">Detalle</th>
                <th className="p-4 border-b-2 border-gray-400 text-right">Monto</th>
                <th className="p-4 border-b-2 border-gray-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-400">
              {datosEgresos?.sort((a, b) => b.id - a.id).map((g, index) => (
                <tr key={g.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-yellow-100 transition-colors`}>
                  <td className="p-4 border-l-8 border-red-700">
                    <div className="font-black text-slate-900">{g.fecha_gasto}</div>
                    <div className="text-[10px] text-red-700 font-black">{g.numero_comprobante ? `DOC: ${g.numero_comprobante}` : 'S/N'}</div>
                  </td>
                  <td className="p-4">
                    <span className="bg-slate-700 text-white px-2 py-1 rounded text-[9px] font-black uppercase shadow-sm">
                      {g.invernaderos?.nombre || 'Gral'}
                    </span>
                  </td>
                  <td className="p-4 font-black uppercase">{g.descripcion}</td>
                  <td className="p-4 text-center">
                    <div className="font-black text-slate-800">{g.cantidad} {g.unidad_medida}</div>
                    <div className="text-[9px] text-slate-400 font-bold">${(g.precio_unitario || 0).toLocaleString()} c/u</div>
                  </td>
                  <td className="p-4 text-right font-black text-red-700 text-[13px]">
                    ${new Intl.NumberFormat('es-CO').format(g.monto || 0)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => imprimirGastoPDF(g)} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-black shadow-md flex items-center gap-1">
                        <span className="text-sm">🖨️</span><span className="text-[10px] font-bold">PDF</span>
                      </button>
                      <button onClick={() => eliminarGasto(g.id)} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md">🗑️</button>
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