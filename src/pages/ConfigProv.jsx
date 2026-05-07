export default function ConfigProv({ provForm, setProvForm, mostrarAlerta, cargarTodo, supabase, lista }) {
  const handleSave = async () => {
    const { error } = await supabase.from('proveedores').insert([{
      nombre: provForm.nombre,
      nit_cc: provForm.nit,
      telefono: provForm.tel,
      direccion: provForm.dir,
      ciudad: provForm.ciudad,
      nota: provForm.nota
    }]);

    if (error) {
      mostrarAlerta("Error al guardar proveedor", "error");
    } else {
      mostrarAlerta("Proveedor guardado correctamente", "exito");
      setProvForm({ nombre: '', nit: '', tel: '', dir: '', ciudad: '', nota: '' });
      cargarTodo();
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-t-4 border-orange-600 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl text-orange-900">🚛</span>
          <h4 className="font-black text-orange-900 uppercase text-sm tracking-widest">Gestión de Proveedores</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="md:col-span-2 border-2 p-3 rounded-xl outline-none" placeholder="Nombre del Proveedor" value={provForm.nombre} onChange={e=>setProvForm({...provForm, nombre: e.target.value})} />
          <input className="border-2 p-3 rounded-xl outline-none" placeholder="Nit, CC o TI" value={provForm.nit} onChange={e=>setProvForm({...provForm, nit: e.target.value})} />
          <input className="border-2 p-3 rounded-xl outline-none" placeholder="Teléfono" value={provForm.tel} onChange={e=>setProvForm({...provForm, tel: e.target.value})} />
          <input className="border-2 p-3 rounded-xl outline-none" placeholder="Dirección" value={provForm.dir} onChange={e=>setProvForm({...provForm, dir: e.target.value})} />
          <input className="border-2 p-3 rounded-xl outline-none" placeholder="Ciudad" value={provForm.ciudad} onChange={e=>setProvForm({...provForm, ciudad: e.target.value})} />
          <textarea className="md:col-span-2 border-2 p-3 rounded-xl h-16 outline-none" placeholder="Nota del proveedor..." value={provForm.nota} onChange={e=>setProvForm({...provForm, nota: e.target.value})} />
          <button onClick={handleSave} className="md:col-span-2 bg-orange-700 text-white font-black py-4 rounded-2xl shadow-lg uppercase active:scale-95 transition-all">
            Guardar Proveedor
          </button>
        </div>
      </section>

      {/* Tabla de Consulta con Efecto Cebra */}
      {/* TABLA DE PROVEEDORES ESTILO VENTAS */}
<div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-400">
  <div className="p-5 bg-gray-200 border-b-2 border-gray-400 flex justify-between items-center">
    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Listado de Proveedores</h3>
    <span className="bg-orange-700 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Logística</span>
  </div>
  <div className="overflow-x-auto">
    <table className="w-full text-left text-[11px] border-collapse">
      <thead>
        <tr className="bg-gray-300 text-slate-800 uppercase font-black">
          <th className="p-4 border-b-2 border-gray-400">Nombre</th>
          <th className="p-4 border-b-2 border-gray-400">NIT/CC</th>
          <th className="p-4 border-b-2 border-gray-400">Teléfono</th>
          <th className="p-4 border-b-2 border-gray-400">Ciudad</th>
          <th className="p-4 border-b-2 border-gray-400">Nota</th>
        </tr>
      </thead>
      <tbody className="divide-y-2 divide-gray-400">
        {lista?.map((item, index) => (
          <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-yellow-100 transition-colors`}>
            <td className="p-4 font-black text-slate-900 border-l-8 border-orange-700">{item.nombre}</td>
            <td className="p-4 font-bold">{item.nit_cc}</td>
            <td className="p-4 font-black text-slate-700">{item.telefono}</td>
            <td className="p-4 font-black text-slate-600 uppercase">{item.ciudad}</td>
            <td className="p-4 italic text-slate-500">{item.nota}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
    </div>
  );
}