import React, { useState, useEffect } from 'react';

export default function ConfigInv({ invForm, setInvForm, mostrarAlerta, cargarTodo, supabase, lista }) {
  
  // ESTADOS: Para almacenar las listas dinámicas de parámetros
  const [listaProductos, setListaProductos] = useState([]);
  const [listaCalidades, setListaCalidades] = useState([]); 

  // Al abrir la pantalla, disparamos la lectura de tus configuraciones vivas en Supabase
  useEffect(() => {
    obtenerParametrosConfigurados();
  }, []);

  // --- Consulta productos y calidades en paralelo ---
  const obtenerParametrosConfigurados = async () => {
    try {
      const [resProd, resCal] = await Promise.all([
        supabase.from('config_productos').select('*').order('nombre_producto', { ascending: true }),
        supabase.from('config_calidades').select('*').order('nombre_calidad', { ascending: true }) 
      ]);

      if (resProd.error) throw resProd.error;
      if (resCal.error) throw resCal.error;
      
      const productosObtenidos = resProd.data || [];
      const calidadesObtenidas = resCal.data || [];

      setListaProductos(productosObtenidos);
      setListaCalidades(calidadesObtenidas);

      // Inyectamos valores por defecto automáticos en el formulario si están vacíos
      setInvForm(prev => ({
        ...prev,
        cultivo: prev.cultivo || productosObtenidos[0]?.nombre_producto || '',
        variedad: prev.variedad || calidadesObtenidas[0]?.nombre_calidad || '' 
      }));

    } catch (err) {
      console.error("Error obteniendo parámetros para invernaderos:", err);
      mostrarAlerta("No se pudieron cargar las configuraciones de cultivo y calidades", "error");
    }
  };

  const handleSave = async () => {
    if (!invForm.nombre) {
      mostrarAlerta("El nombre es obligatorio", "error");
      return;
    }

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
      
      setInvForm({
        nombre: '', 
        cultivo: listaProductos[0]?.nombre_producto || '', 
        variedad: listaCalidades[0]?.nombre_calidad || '', 
        largo: '', 
        ancho: '',
        siembra: '', 
        cosecha: '', 
        estado: 'Activo', 
        descripcion: ''
      });
      cargarTodo();
    }
  };

  
  // --- FUNCIÓN ACTUALIZADA: PASAR A ESTADO INACTIVO ---
 const handleInactivarLogico = async (id, nombre) => {
    const confirmar = window.confirm(`¿Estás seguro de INACTIVAR el "${nombre}"? Se conservará su historial contable intacto pero ya no aparecerá en el Dashboard ni en formularios.`);
    
    if (!confirmar) return;

    try {
      // Modificamos la columna 'activo' a false (tal como se ve en tu Supabase)
      const { error } = await supabase
        .from('invernaderos')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;

      mostrarAlerta("Invernadero inactivado con éxito", "exito");
      await cargarTodo(); // Forzar recarga general inmediata en el padre
    } catch (err) {
      console.error("Error al inactivar el invernadero:", err);
      mostrarAlerta("No se pudo inactivar: " + (err.message || err), "error");
    }
  };
  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMULARIO DE CREACIÓN */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-green-800 h-fit">
          <h3 className="font-black text-slate-800 uppercase text-xs italic mb-5">🏠 Registrar Nuevo Invernadero</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Nombre / Identificador</label>
              <input 
                type="text" 
                className="w-full border-2 p-2.5 rounded-xl font-bold text-sm uppercase" 
                value={invForm.nombre} 
                onChange={e => setInvForm({...invForm, nombre: e.target.value.toUpperCase()})} 
                placeholder="Ej: INVERNADERO 1" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Tipo de Cultivo</label>
                <select 
                  className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs uppercase" 
                  value={invForm.cultivo} 
                  onChange={e => setInvForm({...invForm, cultivo: e.target.value})}
                >
                  {listaProductos.length === 0 ? (
                    <option value="">No hay cultivos creados...</option>
                  ) : (
                    listaProductos.map(p => (
                      <option key={p.id} value={p.nombre_producto}>{p.nombre_producto}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Clasificación / Variedad</label>
                <select 
                  className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs uppercase" 
                  value={invForm.variedad} 
                  onChange={e => setInvForm({...invForm, variedad: e.target.value})}
                >
                  {listaCalidades.length === 0 ? (
                    <option value="">No hay calidades creadas...</option>
                  ) : (
                    listaCalidades.map(c => (
                      <option key={c.id} value={c.nombre_calidad}>{c.nombre_calidad}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Largo (Metros)</label>
                <input 
                  type="number" 
                  className="w-full border-2 p-2.5 rounded-xl font-bold text-sm" 
                  value={invForm.largo} 
                  onChange={e => setInvForm({...invForm, largo: e.target.value})} 
                  placeholder="0.00" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Ancho (Metros)</label>
                <input 
                  type="number" 
                  className="w-full border-2 p-2.5 rounded-xl font-bold text-sm" 
                  value={invForm.ancho} 
                  onChange={e => setInvForm({...invForm, ancho: e.target.value})} 
                  placeholder="0.00" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Fecha Siembra</label>
                <input 
                  type="date" 
                  className="w-full border-2 p-2.5 rounded-xl font-bold text-xs" 
                  value={invForm.siembra} 
                  onChange={e => setInvForm({...invForm, siembra: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Est. Cosecha</label>
                <input 
                  type="date" 
                  className="w-full border-2 p-2.5 rounded-xl font-bold text-xs" 
                  value={invForm.cosecha} 
                  onChange={e => setInvForm({...invForm, cosecha: e.target.value})} 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Estado Inicial del Bloque</label>
              <select 
                className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs" 
                value={invForm.estado} 
                onChange={e => setInvForm({...invForm, estado: e.target.value})}
              >
                <option value="Activo">ACTIVO / EN PRODUCCIÓN</option>
                <option value="Preparación">EN PREPARACIÓN / ARADO</option>
                <option value="Descanso">EN DESCANSO / VACÍO</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Notas / Descripción</label>
              <textarea 
                className="w-full border-2 p-2.5 rounded-xl font-bold h-16 text-xs uppercase" 
                value={invForm.descripcion} 
                onChange={e => setInvForm({...invForm, descripcion: e.target.value})} 
                placeholder="Ej: Suelo tratado con micorrizas" 
              />
            </div>

            <button 
              onClick={handleSave} 
              className="w-full py-3.5 bg-green-800 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-green-900 shadow-md transition-colors"
            >
              💾 Crear Invernadero
            </button>
          </div>
        </div>

        {/* TABLA HISTÓRICA DE INVERNADEROS */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-4 bg-slate-800 text-white font-black text-xs uppercase tracking-widest italic">Mapeo Estructural de Bloques</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-300 text-slate-800 uppercase font-black">
                  <th className="p-4 border-b-2 border-gray-400">Nombre</th>
                  <th className="p-4 border-b-2 border-gray-400">Cultivo / Clasificación</th>
                  <th className="p-4 border-b-2 border-gray-400 text-center">Estado</th>
                  <th className="p-4 border-b-2 border-gray-400">Siembra / Est. Cosecha</th>
                  <th className="p-4 border-b-2 border-gray-400 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-400">
                {lista?.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-400 italic font-bold">No hay invernaderos configurados aún.</td>
                  </tr>
                ) : (
                  lista?.map((item, index) => {
                    // Evaluamos si el invernadero está marcado como inactivo por la columna booleana
                    const esInactivo = item.activo === false;

                    return (
                      <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-yellow-100 transition-colors`}>
                        {/* NOMBRE CON DETALLE DE ARCHIVADO Y BORDE ROJO SI ESTÁ INACTIVO */}
                        <td className={`p-4 font-black text-slate-900 border-l-8 ${esInactivo ? 'border-red-600 bg-red-50/50' : 'border-green-700'}`}>
                          {item.nombre} {esInactivo && <span className="text-[9px] text-red-500 italic block mt-0.5">(Archivado)</span>}
                        </td>
                        
                        <td className="p-4 font-bold text-slate-700 uppercase">
                          {item.cultivo || item.cultivo_principal} - {item.variedad || 'S/C'}
                        </td>
                        
                        {/* COLUMNA ESTADO: EVALÚA VISUALMENTE EN ROJO SI ESTÁ INACTIVO */}
                        <td className="p-4 text-center">
                          {esInactivo ? (
                            <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase shadow-sm bg-red-100 text-red-600 border border-red-300">
                              INACTIVO
                            </span>
                          ) : (
                            <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase shadow-sm ${
                              item.estado === 'Activo' ? 'bg-green-200 text-green-800' : 
                              item.estado === 'Preparación' ? 'bg-amber-200 text-amber-800' : 
                              item.estado === 'Inactivo' || item.estado === 'INACTIVO' ? 'bg-red-100 text-red-600 border border-red-200' : 
                              'bg-gray-300 text-gray-700'
                            }`}>
                              {item.estado}
                            </span>
                          )}
                        </td>

                        <td className="p-4 font-bold text-slate-600">
                          <p>🌱 <span className="text-slate-500">S:</span> {item.fecha_siembra || 'N/R'}</p>
                          <p>🚜 <span className="text-slate-500">C:</span> {item.fecha_cosecha_est || 'N/R'}</p>
                        </td>

                        {/* COLUMNA ACCIONES: SI YA ESTÁ INACTIVO SE OCULTA EL BOTÓN */}
                        <td className="p-4 text-center">
                          {esInactivo ? (
                            <span className="text-[10px] text-gray-400 font-bold uppercase italic tracking-wider">Sin acciones</span>
                          ) : (
                            <button
                              onClick={() => handleInactivarLogico(item.id, item.nombre)}
                              className="px-2 py-1 bg-amber-100 text-amber-700 hover:bg-amber-700 hover:text-white rounded-lg font-bold uppercase text-[9px] tracking-wider border border-amber-300 transition-colors"
                            >
                              🚫 Inactivar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}