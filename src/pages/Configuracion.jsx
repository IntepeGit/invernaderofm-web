export default function Configuracion({ invForm, setInvForm, cliForm, setCliForm, provForm, setProvForm, mostrarAlerta, cargarTodo, supabase }) {
  
  // Función de guardado optimizada para limpiar todos los campos
  const handleSaveInvernadero = async () => {
  if (!invForm.nombre) {
    mostrarAlerta("El nombre es obligatorio", "error");
    return;
  }

  // Preparamos el objeto con los nombres exactos de tu imagen de Supabase
  const datosFinales = {
    nombre: invForm.nombre,
    cultivo_principal: invForm.cultivo || null,
    variedad: invForm.variedad || null,
    largo: parseFloat(invForm.largo) || 0,
    ancho: parseFloat(invForm.ancho) || 0,
    estado: invForm.estado || 'Activo',
    descripcion: invForm.descripcion || null,
    // Usamos comillas exactas por si hay un espacio invisible en la DB
    "fecha_siembra": invForm.siembra || null,
    "fecha_cosecha_es": invForm.cosecha || null
  };

  console.log("Enviando a Supabase:", datosFinales);

  const { error } = await supabase
    .from('invernaderos')
    .insert([datosFinales]);
  
  if (error) {
    console.error("Error completo de Supabase:", error);
    // Si el error persiste, la alerta te dirá exactamente qué columna falla
    mostrarAlerta("Error: " + error.message, "error");
  } else {
    mostrarAlerta("Invernadero creado correctamente", "exito");
    
    // LIMPIEZA AUTOMÁTICA DE TODOS LOS CAMPOS
    setInvForm({
      nombre: '', cultivo: '', variedad: '', largo: '', ancho: '',
      siembra: '', cosecha: '', estado: 'Activo', descripcion: ''
    });
    
    cargarTodo();
  }
};

  const handleSaveGral = async (tabla, datos, reset, mensaje) => {
    const { error } = await supabase.from(tabla).insert([datos]);
    if (!error) {
      mostrarAlerta(mensaje, "exito");
      reset();
      cargarTodo();
    } else {
      mostrarAlerta("Error al guardar", "error");
    }
  };

  return (
    <div className="space-y-10 pb-24 text-sm">
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-t-4 border-green-600">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xl">🏠</span>
          <h4 className="font-black text-green-900 uppercase text-sm tracking-widest">Configuración de Invernaderos</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Nombre del Invernadero</label>
            <input className="w-full border-2 p-3 rounded-xl focus:border-green-500 outline-none" placeholder="Ej: Invernadero Norte" value={invForm.nombre} onChange={e=>setInvForm({...invForm, nombre: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Tipo de Cultivo (Variedad)</label>
            <div className="flex gap-2">
              <input className="w-1/2 border-2 p-3 rounded-xl focus:border-green-500 outline-none" placeholder="Cultivo" value={invForm.cultivo} onChange={e=>setInvForm({...invForm, cultivo: e.target.value})} />
              <input className="w-1/2 border-2 p-3 rounded-xl focus:border-green-500 outline-none" placeholder="Variedad" value={invForm.variedad} onChange={e=>setInvForm({...invForm, variedad: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Tamaño (Largo x Ancho en metros)</label>
            <div className="flex gap-2 text-center">
              <input type="number" className="w-1/2 border-2 p-3 rounded-xl" placeholder="Largo" value={invForm.largo} onChange={e=>setInvForm({...invForm, largo: e.target.value})} />
              <span className="self-center font-bold text-gray-300">X</span>
              <input type="number" className="w-1/2 border-2 p-3 rounded-xl" placeholder="Ancho" value={invForm.ancho} onChange={e=>setInvForm({...invForm, ancho: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Estado del Cultivo</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white font-bold outline-none focus:border-green-500" value={invForm.estado} onChange={e=>setInvForm({...invForm, estado: e.target.value})}>
              <option value="Activo">Activo</option>
              <option value="en Cosecha">en Cosecha</option>
              <option value="en Preparacion">en Preparacion</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Fecha Siembra</label>
            <input type="date" className="w-full border-2 p-3 rounded-xl outline-none focus:border-green-500" value={invForm.siembra} onChange={e=>setInvForm({...invForm, siembra: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Fecha Est. Cosecha</label>
            <input type="date" className="w-full border-2 p-3 rounded-xl outline-none focus:border-green-500" value={invForm.cosecha} onChange={e=>setInvForm({...invForm, cosecha: e.target.value})} />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-gray-400 px-1 uppercase">Descripción</label>
            <textarea className="w-full border-2 p-3 rounded-xl h-20 outline-none focus:border-green-500" placeholder="Notas sobre la ubicación o estado actual..." value={invForm.descripcion} onChange={e=>setInvForm({...invForm, descripcion: e.target.value})} />
          </div>

          <button 
            onClick={handleSaveInvernadero} 
            className="md:col-span-2 bg-green-700 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-green-800 active:scale-95 transition-all uppercase tracking-widest"
          >
            Crear Invernadero
          </button>
        </div>
      </section>

      {/* SECCIÓN CLIENTES (Restaurado según imagen) */}
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-t-4 border-blue-600 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-900 text-xl">👥</span>
          <h4 className="font-black text-blue-900 uppercase text-sm tracking-widest">Gestión de Clientes</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="md:col-span-2 border-2 p-3 rounded-xl outline-none" placeholder="Nombre Completo" value={cliForm.nombre} onChange={e=>setCliForm({...cliForm, nombre: e.target.value})} />
          <input className="border-2 p-3 rounded-xl outline-none" placeholder="Nit, CC o TI" value={cliForm.nit} onChange={e=>setCliForm({...cliForm, nit: e.target.value})} />
          <input className="border-2 p-3 rounded-xl outline-none" placeholder="Teléfono" value={cliForm.tel} onChange={e=>setCliForm({...cliForm, tel: e.target.value})} />
          <input className="border-2 p-3 rounded-xl outline-none" placeholder="Dirección" value={cliForm.dir} onChange={e=>setCliForm({...cliForm, dir: e.target.value})} />
          <input className="border-2 p-3 rounded-xl outline-none" placeholder="Ciudad" value={cliForm.ciudad} onChange={e=>setCliForm({...cliForm, ciudad: e.target.value})} />
          <textarea className="md:col-span-2 border-2 p-3 rounded-xl h-16 outline-none" placeholder="Nota del cliente..." value={cliForm.nota} onChange={e=>setCliForm({...cliForm, nota: e.target.value})} />
          <button onClick={() => handleSave('clientes', {nombre_completo: cliForm.nombre, nit_cc: cliForm.nit, telefono: cliForm.tel, direccion: cliForm.dir, ciudad: cliForm.ciudad, nota: cliForm.nota}, () => setCliForm({nombre:'', nit:'', tel:'', dir:'', ciudad:'', nota:''}), "Cliente guardado")} className="md:col-span-2 bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg uppercase">
            Guardar Cliente
          </button>
        </div>
      </section>

      {/* SECCIÓN PROVEEDORES (Restaurado según imagen) */}
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
          <button onClick={() => handleSave('proveedores', {nombre: provForm.nombre, nit_cc: provForm.nit, telefono: provForm.tel, direccion: provForm.dir, ciudad: provForm.ciudad, nota: provForm.nota}, () => setProvForm({nombre:'', nit:'', tel:'', dir:'', ciudad:'', nota:''}), "Proveedor guardado")} className="md:col-span-2 bg-orange-700 text-white font-black py-4 rounded-2xl shadow-lg uppercase">
            Guardar Proveedor
          </button>
        </div>
      </section>
    </div>
  );
}