import React from 'react';

export default function ConfigCli({ cliForm, setCliForm, mostrarAlerta, cargarTodo, supabase, lista }) {
  
  const handleSave = async () => {
    if (!cliForm.nombre || !cliForm.nit) {
      mostrarAlerta("Nombre y NIT son obligatorios", "error");
      return;
    }

    // Armamos el payload con datos limpios y formateados tal como están en tu Supabase
    const payload = {
      nombre_completo: cliForm.nombre.toUpperCase().trim(),
      nit_cc: cliForm.nit.toString().trim(),
      telefono: cliForm.tel ? cliForm.tel.toString().trim() : null,
      correo: cliForm.email ? cliForm.email.toLowerCase().trim() : null,
      direccion: cliForm.dir ? cliForm.dir.toUpperCase().trim() : null,
      ciudad: cliForm.ciudad ? cliForm.ciudad.toUpperCase().trim() : null,
      nota: cliForm.nota ? cliForm.nota.trim() : null
    };

    try {
      if (cliForm.id_editando) {
        // === MODO EDICIÓN BLINDADO ===
        // Forzamos el ID a corresponder exactamente con el registro de la DB
        const { error: updateError } = await supabase
          .from('clientes')
          .update(payload)
          .eq('id', cliForm.id_editando);

        if (updateError) throw updateError;
        mostrarAlerta("Cliente actualizado con éxito", "exito");

      } else {
        // === MODO CREACIÓN ===
        const { error: insertError } = await supabase
          .from('clientes')
          .insert([payload]);

        if (insertError) throw insertError;
        mostrarAlerta("Cliente registrado con éxito", "exito");
      }

      // Si todo sale bien, limpiamos el formulario y recargamos los datos del backend
      limpiarFormulario();
      await cargarTodo();

    } catch (error) {
      console.error("Error detallado en la operación:", error);
      mostrarAlerta("Error en base de datos: " + (error.message || error), "error");
    }
  };

  const prepararEdicion = (item) => {
    setCliForm({
      id_editando: item.id,
      nombre: item.nombre_completo || '',
      nit: item.nit_cc || '',
      tel: item.telefono || '', 
      email: item.correo || '',  
      dir: item.direccion || '',
      ciudad: item.ciudad || '',
      nota: item.nota || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarCliente = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de eliminar al cliente "${nombre}"? Esta acción no se puede deshacer.`)) {
      try {
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) throw error;
        
        mostrarAlerta("Cliente eliminado definitivamente", "exito");
        await cargarTodo();
      } catch (err) {
        console.error("Error al eliminar:", err);
        mostrarAlerta("No se puede eliminar: El cliente tiene registros o ventas amarradas en el historial.", "error");
      }
    }
  };

  const limpiarFormulario = () => {
    setCliForm({ id_editando: null, nombre: '', nit: '', tel: '', email: '', dir: '', ciudad: '', nota: '' });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-green-800 h-fit">
          <h3 className="font-black text-slate-800 uppercase text-xs italic mb-5">
            {cliForm.id_editando ? '📝 Editar Cliente' : '👤 Nuevo Cliente'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Nombre Completo</label>
              <input className="w-full border-2 p-2.5 rounded-xl font-bold text-sm uppercase outline-none focus:border-green-700" value={cliForm.nombre} onChange={e=>setCliForm({...cliForm, nombre: e.target.value})} placeholder="Ej: JUAN PEREZ" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">NIT / Cédula</label>
              <input className="w-full border-2 p-2.5 rounded-xl font-bold text-sm outline-none focus:border-green-700" value={cliForm.nit} onChange={e=>setCliForm({...cliForm, nit: e.target.value})} placeholder="900.000.000-1" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Teléfono / Celular</label>
                <input className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-green-700" value={cliForm.tel} onChange={e=>setCliForm({...cliForm, tel: e.target.value})} placeholder="310..." />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Ciudad</label>
                <input className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase outline-none focus:border-green-700" value={cliForm.ciudad} onChange={e=>setCliForm({...cliForm, ciudad: e.target.value})} placeholder="Bogotá" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Correo Electrónico</label>
              <input type="email" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-green-700" value={cliForm.email} onChange={e=>setCliForm({...cliForm, email: e.target.value})} placeholder="cliente@correo.com" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Dirección</label>
              <input className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase outline-none focus:border-green-700" value={cliForm.dir} onChange={e=>setCliForm({...cliForm, dir: e.target.value})} placeholder="Calle 10 #..." />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Notas Internas</label>
              <textarea className="w-full border-2 p-2.5 rounded-xl font-bold h-16 text-xs outline-none focus:border-green-700" value={cliForm.nota} onChange={e=>setCliForm({...cliForm, nota: e.target.value})} placeholder="Observaciones..." />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className={`flex-1 py-3.5 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-md transition-colors ${cliForm.id_editando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-800 hover:bg-green-900'}`}>
                {cliForm.id_editando ? '💾 Actualizar' : '💾 Guardar Cliente'}
              </button>
              {cliForm.id_editando && (
                <button onClick={limpiarFormulario} className="px-4 py-3.5 bg-gray-200 text-gray-700 font-black rounded-xl uppercase text-xs hover:bg-gray-300">X</button>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: TABLA */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-4 bg-slate-800 text-white font-black text-xs uppercase tracking-widest italic flex justify-between items-center">
            <span>Base de Datos Clientes</span>
            <span className="text-[10px] bg-green-700 px-2 py-0.5 rounded-md">Comercial</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-300 text-slate-800 uppercase font-black">
                  <th className="p-4 border-b-2 border-gray-400">Nombre Cliente</th>
                  <th className="p-4 border-b-2 border-gray-400">NIT / Identificación</th>
                  <th className="p-4 border-b-2 border-gray-400">Contacto / Ciudad</th>
                  <th className="p-4 border-b-2 border-gray-400 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-400">
                {lista?.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-gray-400 italic font-bold">No hay clientes registrados.</td>
                  </tr>
                ) : (
                  lista?.map((item, index) => (
                    <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-yellow-100 transition-colors`}>
                      <td className="p-4 font-black text-slate-900 border-l-8 border-green-700">
                        <p className="uppercase">{item.nombre_completo}</p>
                        <p className="text-[9px] text-blue-600 lowercase font-bold">{item.correo || '---'}</p>
                      </td>
                      <td className="p-4 font-bold text-slate-700">{item.nit_cc}</td>
                      <td className="p-4 font-bold text-slate-600">
                        <p>📞 {item.telefono || 'N/R'}</p>
                        <p className="uppercase text-slate-400 text-[9px] mt-0.5">📍 {item.ciudad || 'N/R'}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => prepararEdicion(item)} className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-700 hover:text-white transition-colors border border-amber-200">
                            ✏️
                          </button>
                          <button onClick={() => eliminarCliente(item.id, item.nombre_completo)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-700 hover:text-white transition-colors border border-red-200">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}