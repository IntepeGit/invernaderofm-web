export default function ConfigInv({ invForm, setInvForm, mostrarAlerta, cargarTodo, supabase }) {
  
  const handleSave = async () => {
    if (!invForm.nombre) {
      mostrarAlerta("El nombre es obligatorio", "error");
      return;
    }

    // Datos organizados para Supabase según tu esquema real
    const payload = {
      nombre: invForm.nombre,
      cultivo_principal: invForm.cultivo || null,
      variedad: invForm.variedad || null,
      largo: parseFloat(invForm.largo) || 0,
      ancho: parseFloat(invForm.ancho) || 0,
      fecha_siembra: invForm.siembra || null,
      fecha_cosecha_est: invForm.cosecha || null, 
      estado: invForm.estado || 'Activo',
      descripcion: invForm.descripcion || null,
      cultivo: invForm.cultivo || null
    };

    const { error } = await supabase.from('invernaderos').insert([payload]);
    
    if (error) {
      mostrarAlerta("Error de envío: " + error.message, "error");
    } else {
      mostrarAlerta("Invernadero creado exitosamente", "exito");
      
      // RESET TOTAL DE LOS CAMPOS (Limpiar cuadritos)
      setInvForm({
        nombre: '', cultivo: '', variedad: '', largo: '', ancho: '',
        siembra: '', cosecha: '', estado: 'Activo', descripcion: ''
      });
      
      cargarTodo(); // Recarga para ver el nuevo invernadero en los selectores
    }
  };

  return (
    <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-t-4 border-green-600">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">🏠</span>
        <h4 className="font-black text-green-900 uppercase text-sm tracking-widest">Configuración de Invernaderos</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Nombre del Invernadero</label>
          <input className="w-full border-2 p-3 rounded-xl outline-none focus:border-green-500" value={invForm.nombre} onChange={e=>setInvForm({...invForm, nombre: e.target.value})} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Tipo de Cultivo (Variedad)</label>
          <div className="flex gap-2">
            <input className="w-1/2 border-2 p-3 rounded-xl outline-none" placeholder="Cultivo" value={invForm.cultivo} onChange={e=>setInvForm({...invForm, cultivo: e.target.value})} />
            <input className="w-1/2 border-2 p-3 rounded-xl outline-none" placeholder="Variedad" value={invForm.variedad} onChange={e=>setInvForm({...invForm, variedad: e.target.value})} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Tamaño (Largo x Ancho m)</label>
          <div className="flex gap-2 text-center">
            <input type="number" className="w-1/2 border-2 p-3 rounded-xl outline-none" placeholder="Largo" value={invForm.largo} onChange={e=>setInvForm({...invForm, largo: e.target.value})} />
            <input type="number" className="w-1/2 border-2 p-3 rounded-xl outline-none" placeholder="Ancho" value={invForm.ancho} onChange={e=>setInvForm({...invForm, ancho: e.target.value})} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 px-1 uppercase tracking-tighter">Estado / Etapa</label>
          <select className="w-full border-2 p-3 rounded-xl bg-white font-bold outline-none" value={invForm.estado} onChange={e=>setInvForm({...invForm, estado: e.target.value})}>
            <option value="Activo">Activo</option>
            <option value="en Cosecha">en Cosecha</option>
            <option value="en Preparacion">en Preparacion</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 px-1 uppercase tracking-tighter">Fecha Siembra</label>
          <input type="date" className="w-full border-2 p-3 rounded-xl" value={invForm.siembra} onChange={e=>setInvForm({...invForm, siembra: e.target.value})} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 px-1 uppercase tracking-tighter">Fecha Est. Cosecha</label>
          <input type="date" className="w-full border-2 p-3 rounded-xl" value={invForm.cosecha} onChange={e=>setInvForm({...invForm, cosecha: e.target.value})} />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Descripción</label>
          <textarea className="w-full border-2 p-3 rounded-xl h-20 outline-none" placeholder="Notas adicionales..." value={invForm.descripcion} onChange={e=>setInvForm({...invForm, descripcion: e.target.value})} />
        </div>
        <button onClick={handleSave} className="md:col-span-2 bg-green-700 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-green-800 uppercase tracking-widest transition-all active:scale-95">
          Crear Invernadero
        </button>
      </div>
    </section>
  );
}