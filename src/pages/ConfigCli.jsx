export default function ConfigCli({ cliForm, setCliForm, mostrarAlerta, cargarTodo, supabase }) {
  const handleSave = async () => {
    // Mapeo de datos hacia las columnas de Supabase
    const { error } = await supabase.from('clientes').insert([{
      nombre_completo: cliForm.nombre,
      nit_cc: cliForm.nit,
      telefono: cliForm.tel,
      direccion: cliForm.dir,
      ciudad: cliForm.ciudad,
      nota: cliForm.nota,
      correo: cliForm.email // Enviamos el dato a la columna 'correo'
    }]);

    if (error) {
      mostrarAlerta("Error al guardar cliente: " + error.message, "error");
    } else {
      mostrarAlerta("Cliente guardado correctamente", "exito");
      // Limpiamos todos los campos, incluyendo el nuevo email
      setCliForm({ nombre: '', nit: '', tel: '', dir: '', ciudad: '', nota: '', email: '' });
      cargarTodo();
    }
  };

  return (
    <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-t-4 border-blue-600 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-blue-900 text-xl">👥</span>
        <h4 className="font-black text-blue-900 uppercase text-sm tracking-widest">Gestión de Clientes</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input className="md:col-span-2 border-2 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="Nombre Completo" value={cliForm.nombre} onChange={e=>setCliForm({...cliForm, nombre: e.target.value})} />
        
        <input className="border-2 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="Nit, CC o TI" value={cliForm.nit} onChange={e=>setCliForm({...cliForm, nit: e.target.value})} />
        
        {/* Nuevo campo de Correo Electrónico */}
        <input type="email" className="border-2 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="Correo Electrónico" value={cliForm.email} onChange={e=>setCliForm({...cliForm, email: e.target.value})} />
        
        <input className="border-2 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="Teléfono" value={cliForm.tel} onChange={e=>setCliForm({...cliForm, tel: e.target.value})} />
        
        <input className="border-2 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="Dirección" value={cliForm.dir} onChange={e=>setCliForm({...cliForm, dir: e.target.value})} />
        
        <input className="md:col-span-2 border-2 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="Ciudad" value={cliForm.ciudad} onChange={e=>setCliForm({...cliForm, ciudad: e.target.value})} />
        
        <textarea className="md:col-span-2 border-2 p-3 rounded-xl h-16 outline-none focus:border-blue-500" placeholder="Nota del cliente..." value={cliForm.nota} onChange={e=>setCliForm({...cliForm, nota: e.target.value})} />
        
        <button onClick={handleSave} className="md:col-span-2 bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg uppercase active:scale-95 transition-all">
          Guardar Cliente
        </button>
      </div>
    </section>
  );
}