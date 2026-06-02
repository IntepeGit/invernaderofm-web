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

  // --- CARGAR DATOS EN EL FORMULARIO PARA EDICIÓN EXACTA ---
  const prepararEdicionInvernadero = (item) => {
    let estadoDB = String(item.state || item.estado || 'ACTIVO')
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    // Homologación estricta de términos cortos antes de cargar el selector
    let estadoLimpio = 'ACTIVO';
    if (estadoDB.includes("COSECHA")) {
      estadoLimpio = "EN_COSECHA";
    } else if (estadoDB.includes("PREPARAC")) {
      estadoLimpio = "EN_PREPARACION";
    } else if (estadoDB.includes("DESCANSO") || estadoDB === "INACTIVO" && item.activo !== false) {
      estadoLimpio = "EN_DESCANSO"; // Si está activo el renglón pero dice inactivo, es descanso de tierra
    } else if (item.activo === false) {
      estadoLimpio = "INACTIVO";
    }

    setInvForm({
      id_editando: item.id, 
      nombre: item.nombre,
      cultivo: item.cultivo || item.cultivo_principal || '',
      variedad: item.variedad || '',
      largo: item.largo || '',
      ancho: item.ancho || '',
      siembra: item.fecha_siembra || '',
      cosecha: item.fecha_cosecha_est || '',
      estado: estadoLimpio, 
      descripcion: item.descripcion || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  // --- LIMPIAR FORMULARIO / CANCELAR EDICIÓN ---
  const limpiarFormulario = () => {
    setInvForm({
      id_editando: null,
      nombre: '', 
      cultivo: listaProductos[0]?.nombre_producto || '', 
      variedad: listaCalidades[0]?.nombre_calidad || '', 
      largo: '', 
      ancho: '',
      siembra: '', 
      cosecha: '', 
      estado: 'ACTIVO', 
      descripcion: ''
    });
  };

  // --- GUARDAR O ACTUALIZAR REGISTRO INVI ---
  const handleSave = async () => {
    if (!invForm.nombre) {
      mostrarAlerta("El nombre es obligatorio", "error");
      return;
    }

    const payload = {
      nombre: invForm.nombre.toUpperCase().trim(),
      cultivo_principal: invForm.cultivo || null,
      variedad: invForm.variedad || null, 
      largo: parseFloat(invForm.largo) || 0,
      ancho: parseFloat(invForm.ancho) || 0,
      fecha_siembra: invForm.siembra || null,
      fecha_cosecha_est: invForm.cosecha || null, 
      estado: invForm.estado, 
      descripcion: invForm.descripcion ? invForm.descripcion.toUpperCase().trim() : null,
      cultivo: invForm.cultivo || null 
    };

    try {
      let error;
      
      if (invForm.id_editando) {
        const res = await supabase
          .from('invernaderos')
          .update(payload)
          .eq('id', invForm.id_editando);
        error = res.error;
      } else {
        const res = await supabase
          .from('invernaderos')
          .insert([payload]);
        error = res.error;
      }

      if (error) throw error;

      mostrarAlerta(
        invForm.id_editando ? "Invernadero actualizado exitosamente" : "Invernadero creado exitosamente", 
        "exito"
      );
      
      limpiarFormulario();
      cargarTodo();
    } catch (err) {
      console.error("Error al procesar invernadero:", err);
      mostrarAlerta("Error de envío: " + err.message, "error");
    }
  };

  // --- PASAR A ESTADO INACTIVO (LÓGICO) ---
  const handleInactivarLogico = async (id, nombre) => {
    const confirmar = window.confirm(`¿Estás seguro de INACTIVAR el "${nombre}"? Se conservará su historial contable intacto pero ya no aparecerá en el Dashboard ni en formularios.`);
    
    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from('invernaderos')
        .update({ activo: false, estado: 'INACTIVO' })
        .eq('id', id);

      if (error) throw error;

      mostrarAlerta("Invernadero inactivado con éxito", "exito");
      await cargarTodo(); 
    } catch (err) {
      console.error("Error al inactivar el invernadero:", err);
      mostrarAlerta("No se pudo inactivar: " + (err.message || err), "error");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-green-700 h-fit">
          <div className="flex justify-between items-center mb-5 border-b pb-2">
            <h3 className="font-black text-slate-800 uppercase text-xs italic">
              {invForm.id_editando ? '📝 Editar Invernadero' : '🏠 Registrar Nuevo Invernadero'}
            </h3>
            {invForm.id_editando && (
              <button 
                onClick={limpiarFormulario}
                className="text-gray-400 hover:text-red-500 font-black text-sm"
                title="Cancelar edición"
              >
                ✕
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Nombre / Identificador</label>
              <input 
                type="text" 
                className="w-full border-2 p-2.5 rounded-xl font-bold text-sm uppercase outline-none focus:border-green-700" 
                value={invForm.nombre || ''} 
                onChange={e => setInvForm({...invForm, nombre: e.target.value})} 
                placeholder="Ej: INVERNADERO 1" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Tipo de Cultivo</label>
                <select 
                  className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs uppercase outline-none focus:border-green-700" 
                  value={invForm.cultivo || ''} 
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
                  className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs uppercase outline-none focus:border-green-700" 
                  value={invForm.variedad || ''} 
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
                  className="w-full border-2 p-2.5 rounded-xl font-bold text-sm outline-none focus:border-green-700" 
                  value={invForm.largo || ''} 
                  onChange={e => setInvForm({...invForm, largo: e.target.value})} 
                  placeholder="0.00" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Ancho (Metros)</label>
                <input 
                  type="number" 
                  className="w-full border-2 p-2.5 rounded-xl font-bold text-sm outline-none focus:border-green-700" 
                  value={invForm.ancho || ''} 
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
                  className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-green-700" 
                  value={invForm.siembra || ''} 
                  onChange={e => setInvForm({...invForm, siembra: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Est. Cosecha</label>
                <input 
                  type="date" 
                  className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-green-700" 
                  value={invForm.cosecha || ''} 
                  onChange={e => setInvForm({...invForm, cosecha: e.target.value})} 
                />
              </div>
            </div>

            {/* SELECTOR UNIFICADO CON LOS NUEVOS TÉRMINOS CORTOS */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Estado Actual del Bloque</label>
              <select 
                className="w-full border-2 p-2.5 rounded-xl font-black bg-white text-xs outline-none focus:border-green-700 uppercase text-slate-800" 
                value={invForm.estado || 'ACTIVO'} 
                onChange={e => setInvForm({...invForm, estado: e.target.value})}
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="EN_COSECHA">EN COSECHA</option>
                <option value="EN_PREPARACION">EN PREPARACIÓN</option>
                <option value="EN_DESCANSO">EN DESCANSO</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Notas / Descripción</label>
              <textarea 
                className="w-full border-2 p-2.5 rounded-xl font-bold h-16 text-xs uppercase outline-none focus:border-green-700" 
                value={invForm.descripcion || ''} 
                onChange={e => setInvForm({...invForm, descripcion: e.target.value})} 
                placeholder="Ej: Suelo tratado con micorrizas" 
              />
            </div>

            <button 
              onClick={handleSave} 
              className={`w-full py-3.5 text-white font-black rounded-xl uppercase text-xs tracking-widest transition-colors shadow-md ${
                invForm.id_editando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-800 hover:bg-green-900'
              }`}
            >
              {invForm.id_editando ? '💾 Actualizar Invernadero' : '💾 Crear Invernadero'}
            </button>
          </div>
        </div>

        {/* COLUMNA DERECHA: TABLA CON RENDERIZADO VISUAL REPARADO */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-4 bg-slate-800 text-white font-black text-xs uppercase tracking-widest italic">Mapeo Estructural de Bloques</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-300 text-slate-800 uppercase font-black">
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Cultivo / Clasificación</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4">Siembra / Est. Cosecha</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-400">
                {lista?.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-400 italic font-bold">No hay invernaderos configurados aún.</td>
                  </tr>
                ) : (
                  lista?.map((item, index) => {
                    const esInactivo = item.activo === false;
                    const estVisual = String(item.estado || '').toUpperCase();

                    return (
                      <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-yellow-100 transition-colors`}>
                        
                        <td className={`p-4 font-black text-slate-900 border-l-8 ${esInactivo ? 'border-red-600 bg-red-50/50' : 'border-green-700'}`}>
                          {item.nombre} {esInactivo && <span className="text-[9px] text-red-500 italic block mt-0.5">(Archivado)</span>}
                        </td>
                        
                        <td className="p-4 font-bold text-slate-700 uppercase">
                          {item.cultivo || item.cultivo_principal} - {item.variedad || 'S/C'}
                          <p className="text-[9px] text-slate-400 font-bold lowercase italic mt-0.5">📐 Área: {item.largo || 0}m × {item.ancho || 0}m</p>
                        </td>
                        
                        {/* CONTROL DE RENDERS DE COLOR CORREGIDO SEGÚN IMAGE_2C87C9.PNG */}
                        <td className="p-4 text-center">
                          {esInactivo ? (
                            <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase shadow-sm bg-red-100 text-red-600 border border-red-300">
                              INACTIVO
                            </span>
                          ) : (
                            <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase shadow-sm ${
                              estVisual === 'ACTIVO' ? 'bg-green-100 text-green-700 border border-green-300' : 
                              estVisual === 'EN_COSECHA' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                              estVisual === 'EN_PREPARACION' ? 'bg-amber-100 text-amber-700 border border-amber-300' : 
                              estVisual === 'EN_DESCANSO' || estVisual === 'INACTIVO' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                              'bg-gray-200 text-gray-700 border border-gray-300'
                            }`}>
                              {estVisual === 'EN_DESCANSO' || (estVisual === 'INACTIVO' && !esInactivo) ? 'EN DESCANSO' : estVisual.replace('_', ' ')}
                            </span>
                          )}
                        </td>

                        <td className="p-4 font-bold text-slate-600">
                          <p>🌱 <span className="text-slate-500">S:</span> {item.fecha_siembra || 'N/R'}</p>
                          <p>🚜 <span className="text-slate-500">C:</span> {item.fecha_cosecha_est || 'N/R'}</p>
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              type="button"
                              onClick={() => prepararEdicionInvernadero(item)}
                              className="p-1.5 bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg border border-amber-300 transition-colors"
                              title="Editar Invernadero"
                            >
                              ✏️
                            </button>
                            {!esInactivo ? (
                              <button
                                type="button"
                                onClick={() => handleInactivarLogico(item.id, item.nombre)}
                                className="p-1.5 bg-red-100 text-red-700 hover:bg-red-600 hover:text-white rounded-lg border border-red-200 transition-colors"
                                title="Inactivar / Archivar"
                              >
                                🚫
                              </button>
                            ) : (
                              <span className="text-[9px] text-gray-400 font-bold uppercase italic">Archivado</span>
                            )}
                          </div>
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