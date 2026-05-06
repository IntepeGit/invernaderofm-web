export default function ConfigProv({ provForm, setProvForm, mostrarAlerta, cargarTodo, supabase }) {
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
  );
}