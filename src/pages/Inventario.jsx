import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Inventario({ mostrarAlerta, datosInvernaderos, userRole }) {
  // Estados principales
  const [listaInventario, setListaInventario] = useState([]);
  const [tabActiva, setTabActiva] = useState('bodega'); // 'bodega', 'entrada', 'salida'
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Estado para controlar qué insumo se está editando directamente en la tabla
  const [idEditando, setIdEditando] = useState(null);
  const [filaEditable, setFilaEditable] = useState({ nombre_insumo: '', categoria: '', unidad_medida: '', cantidad_actual: 0, stock_minimo: 0 });

  // Estados para los formularios de creación, entrada y salida
  const [insumoForm, setInsumoForm] = useState({ nombre_insumo: '', categoria: 'Fertilizante', unidad_medida: 'Bulto', stock_minimo: 5 });
  const [entradaForm, setEntradaForm] = useState({ insumo_id: '', cantidad_ingresada: '', precio_unitario_compra: '', numero_factura_comprobante: '', observaciones: '' });
  const [salidaForm, setSalidaForm] = useState({ insumo_id: '', cantidad_retirada: '', invernadero_id: '', responsable: '', nota_uso: '' });

  // Categorías y Unidades estándar acordadas
  const categorias = ['Fertilizante', 'Veneno', 'Semilla', 'Herramienta', 'Canastilla', 'Plastico','Accesorio','Manguera','Otros'];
  const unidades = ['Bulto', 'Kilo', 'Litro', 'Metro','Unidad'];

  const esAdmin = userRole === 'admin'; // 👈 Validación rápida de rol

  useEffect(() => {
    cargarInventario();
  }, []);

  // --- 1. CONSULTA REAL A SUPABASE ---
  const cargarInventario = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .order('nombre_insumo', { ascending: true });

      if (error) throw error;
      setListaInventario(data || []);
    } catch (err) {
      console.error("Error cargando bodega:", err);
      if (mostrarAlerta) mostrarAlerta("No se pudo cargar el inventario", "error");
    } finally {
      setCargando(false);
    }
  };

  // --- 2. REGISTRAR NUEVO INSUMO MAESTRO ---
  const crearInsumoBauche = async (e) => {
    e.preventDefault();
    if (!esAdmin) return; // Protección de seguridad
    if (!insumoForm.nombre_insumo) return;

    try {
      const { error } = await supabase
        .from('inventario')
        .insert([{
          nombre_insumo: insumoForm.nombre_insumo.toUpperCase(),
          categoria: insumoForm.categoria,
          unidad_medida: insumoForm.unidad_medida,
          stock_minimo: parseFloat(insumoForm.stock_minimo) || 0,
          cantidad_actual: 0 
        }]);

      if (error) throw error;
      
      mostrarAlerta("Insumo creado en bodega", "exito");
      setInsumoForm({ nombre_insumo: '', categoria: 'Fertilizante', unidad_medida: 'Bulto', stock_minimo: 5 });
      cargarInventario();
    } catch (err) {
      mostrarAlerta("El insumo ya existe o hubo un error", "error");
    }
  };

  // --- 3. REGISTRAR ENTRADA (SUMA AUTOMÁTICA POR TRIGGER) ---
  const registrarEntradaBodega = async (e) => {
    e.preventDefault();
    const cant = parseFloat(entradaForm.cantidad_ingresada);
    const precio = parseFloat(entradaForm.precio_unitario_compra) || 0;
    if (!entradaForm.insumo_id || cant <= 0) return;

    try {
      const { error } = await supabase
        .from('entradas_inventario')
        .insert([{
          insumo_id: entradaForm.insumo_id,
          cantidad_ingresada: cant,
          precio_unitario_compra: precio,
          monto_total_compra: cant * precio,
          numero_factura_comprobante: entradaForm.numero_factura_comprobante || 'S/N',
          observaciones: entradaForm.observaciones
        }]);

      if (error) throw error;

      mostrarAlerta("Ingreso registrado con éxito", "exito");
      setEntradaForm({ insumo_id: '', cantidad_ingresada: '', precio_unitario_compra: '', numero_factura_comprobante: '', observaciones: '' });
      cargarInventario();
    } catch (err) {
      mostrarAlerta("Error al procesar la entrada", "error");
    }
  };

  // --- 4. REGISTRAR SALIDA A INVERNADERO (RESTA AUTOMÁTICA POR TRIGGER) ---
  const registrarSalidaInvernadero = async (e) => {
    e.preventDefault();
    const cant = parseFloat(salidaForm.cantidad_retirada);
    if (!salidaForm.insumo_id || cant <= 0) return;

    // Validación de seguridad local antes de disparar el trigger
    const insumoSeleccionado = listaInventario.find(i => i.id === salidaForm.insumo_id);
    if (insumoSeleccionado && insumoSeleccionado.cantidad_actual < cant) {
      mostrarAlerta("No puedes retirar más de lo que hay en existencia", "error");
      return;
    }

    try {
      const { error } = await supabase
        .from('salidas_inventario')
        .insert([{
          insumo_id: salidaForm.insumo_id,
          cantidad_retirada: cant,
          invernadero_id: salidaForm.invernadero_id || null,
          responsable: salidaForm.responsable.toUpperCase(),
          nota_uso: salidaForm.nota_uso
        }]);

      if (error) throw error;

      mostrarAlerta("Insumo despachado a cultivo", "exito");
      setSalidaForm({ insumo_id: '', cantidad_retirada: '', invernadero_id: '', responsable: '', nota_uso: '' });
      cargarInventario();
    } catch (err) {
      mostrarAlerta("Error al registrar la salida", "error");
    }
  };

  // --- 5. EDICIÓN DIRECTA EN TABLA (SÓLO ADMIN) ---
  const iniciarEdicion = (ins) => {
    if (!esAdmin) return;
    setIdEditando(ins.id);
    setFilaEditable({
      nombre_insumo: ins.nombre_insumo,
      categoria: ins.categoria,
      unidad_medida: ins.unidad_medida,
      cantidad_actual: ins.cantidad_actual,
      stock_minimo: ins.stock_minimo
    });
  };

  const cancelarEdicion = () => {
    setIdEditando(null);
  };

  const guardarEdicionFila = async (id) => {
    if (!esAdmin) return;
    try {
      const { error } = await supabase
        .from('inventario')
        .update({
          nombre_insumo: filaEditable.nombre_insumo.toUpperCase(),
          categoria: filaEditable.categoria,
          unidad_medida: filaEditable.unidad_medida,
          cantidad_actual: parseFloat(filaEditable.cantidad_actual) || 0,
          stock_minimo: parseFloat(filaEditable.stock_minimo) || 0
        })
        .eq('id', id);

      if (error) throw error;

      mostrarAlerta("Existencias y parámetros actualizados directamente", "exito");
      setIdEditando(null);
      cargarInventario();
    } catch (err) {
      console.error(err);
      mostrarAlerta("Error al actualizar existencias", "error");
    }
  };

  const eliminarInsumoCompleto = async (id, nombre) => {
    if (!esAdmin) return;
    if (window.confirm(`¿Está seguro de eliminar COMPLETAMENTE el insumo "${nombre}"? Esto podría fallar si tiene registros asociados.`)) {
      try {
        const { error } = await supabase.from('inventario').delete().eq('id', id);
        if (error) throw error;
        mostrarAlerta("Insumo eliminado del sistema", "exito");
        cargarInventario();
      } catch (err) {
        mostrarAlerta("No se puede eliminar porque tiene historial de entradas/salidas", "error");
      }
    }
  };

  // Filtrar insumos críticos en Alerta de Escasez
  const insumosCriticos = listaInventario.filter(i => i.cantidad_actual <= i.stock_minimo);

  // Filtrar por barra de búsqueda
  const insumosFiltrados = listaInventario.filter(i => 
    i.nombre_insumo.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      {/* TARJETA DE ALERTAS DE STOCK MÍNIMO */}
      {insumosCriticos.length > 0 && (
        <div className="bg-red-50 border-l-8 border-red-600 p-4 rounded-2xl shadow-md animate-pulse">
          <h4 className="font-black text-red-900 text-xs uppercase tracking-wider mb-2">⚠️ Alerta de Stock Mínimo (Por Agotarse)</h4>
          <div className="flex flex-wrap gap-2">
            {insumosCriticos.map(ins => (
              <span key={ins.id} className="bg-red-200 text-red-900 font-bold text-[11px] px-3 py-1 rounded-lg uppercase">
                {ins.nombre_insumo}: <b className="font-black">{ins.cantidad_actual}</b> {ins.unidad_medida}(s)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* MENÚ DE SECCIONES INTERNAS */}
      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setTabActiva('bodega')} className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${tabActiva === 'bodega' ? 'bg-[#117097] text-white shadow' : 'bg-gray-200 text-gray-600'}`}>📦 Ver Bodega / Ajustar</button>
        <button onClick={() => setTabActiva('entrada')} className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${tabActiva === 'entrada' ? 'bg-[#117097] text-white shadow' : 'bg-gray-200 text-gray-600'}`}>📥 Registrar Entrada</button>
        <button onClick={() => setTabActiva('salida')} className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${tabActiva === 'salida' ? 'bg-[#117097] text-white shadow' : 'bg-gray-200 text-gray-600'}`}>📤 Aplicar Insumo</button>
      </div>

      {/* PANELES DE ACCIÓN */}
      {tabActiva === 'bodega' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CREADOR DE INSUMOS MAESTROS: 🚨 SÓLO SE MUESTRA AL ADMINISTRADOR */}
          {esAdmin ? (
            <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-200 h-fit">
              <h3 className="font-black text-slate-800 uppercase text-xs italic mb-4">➕ Registrar Nuevo Insumo en el Sistema</h3>
              <form onSubmit={crearInsumoBauche} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase italic">Nombre del Insumo</label>
                  <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold bg-gray-50 uppercase focus:border-[#117097] focus:bg-white" value={insumoForm.nombre_insumo} onChange={e => setInsumoForm({...insumoForm, nombre_insumo: e.target.value})} placeholder="Ej: Triple 15 / Mancozeb" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase italic">Categoría</label>
                    <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white focus:border-[#117097]" value={insumoForm.categoria} onChange={e => setInsumoForm({...insumoForm, categoria: e.target.value})}>
                      {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase italic">U. Medida</label>
                    <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white focus:border-[#117097]" value={insumoForm.unidad_medida} onChange={e => setInsumoForm({...insumoForm, unidad_medida: e.target.value})}>
                      {unidades.map(un => <option key={un} value={un}>{un}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase italic">Alerta Stock Mínimo</label>
                  <input type="number" className="w-full border-2 p-2.5 rounded-xl font-bold bg-gray-50 focus:border-[#117097] focus:bg-white" value={insumoForm.stock_minimo} onChange={e => setInsumoForm({...insumoForm, stock_minimo: e.target.value})} required />
                </div>
                <button type="submit" className="w-full py-3 bg-[#117097] text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-[#0a4c68] transition-colors shadow-md">💾 Guardar Insumo</button>
              </form>
            </div>
          ) : null}

          {/* TABLA DE EXISTENCIAS EN BODEGA: 🚨 Toma todo el ancho si el operario no ve el panel de creación */}
          <div className={`${esAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 flex flex-col`}>
            <div className="p-4 bg-[#117097] text-white font-black text-xs uppercase tracking-widest italic flex flex-col md:flex-row md:items-center justify-between gap-2">
              <span>Existencias en Bodega Central</span>
              <input 
                type="text" 
                placeholder="🔍 Buscar insumo..." 
                className="px-3 py-1 text-xs rounded-lg text-slate-800 outline-none font-bold placeholder-gray-400 max-w-xs"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 border-b">
                    <th className="p-3">Insumo</th>
                    <th className="p-3 text-center">Categoría</th>
                    <th className="p-3 text-right">Cant. Actual</th>
                    <th className="p-3 text-center">Unidad</th>
                    <th className="p-3 text-center">Estado</th>
                    {/* 🚨 Mostrar columna de Acciones SÓLO si es Admin */}
                    {esAdmin && <th className="p-3 text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y text-xs font-bold text-slate-700">
                  {insumosFiltrados.length === 0 ? (
                    <tr><td colSpan={esAdmin ? 6 : 5} className="p-6 text-center text-gray-400 italic">No hay insumos registrados en el sistema</td></tr>
                  ) : (
                    insumosFiltrados.map((ins, idx) => {
                      const esCritico = ins.cantidad_actual <= ins.stock_minimo;
                      const editandoEste = idEditando === ins.id;

                      return (
                        <tr key={ins.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-slate-50 transition-colors'}>
                          
                          {/* Columna: Nombre */}
                          <td className="p-3 font-black text-slate-900 uppercase">
                            {editandoEste ? (
                              <input 
                                type="text" 
                                className="border-2 px-2 py-1 rounded-lg w-full bg-white focus:border-[#117097] uppercase" 
                                value={filaEditable.nombre_insumo} 
                                onChange={e => setFilaEditable({...filaEditable, nombre_insumo: e.target.value})} 
                              />
                            ) : (
                              ins.nombre_insumo
                            )}
                          </td>

                          {/* Columna: Categoría */}
                          <td className="p-3 text-center uppercase text-gray-500">
                            {editandoEste ? (
                              <select 
                                className="border-2 px-2 py-1 rounded-lg bg-white focus:border-[#117097]" 
                                value={filaEditable.categoria} 
                                onChange={e => setFilaEditable({...filaEditable, categoria: e.target.value})}
                              >
                                {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                            ) : (
                              ins.categoria
                            )}
                          </td>

                          {/* Columna: Cantidad Actual */}
                          <td className={`p-3 text-right font-black text-sm ${esCritico ? 'text-red-600' : 'text-green-700'}`}>
                            {editandoEste ? (
                              <input 
                                type="number" 
                                step="any"
                                className="border-2 px-2 py-1 rounded-lg w-20 text-right focus:border-[#117097]" 
                                value={filaEditable.cantidad_actual} 
                                onChange={e => setFilaEditable({...filaEditable, cantidad_actual: e.target.value})} 
                              />
                            ) : (
                              ins.cantidad_actual
                            )}
                          </td>

                          {/* Columna: Unidad de Medida */}
                          <td className="p-3 text-center text-gray-400">
                            {editandoEste ? (
                              <select 
                                className="border-2 px-2 py-1 rounded-lg bg-white focus:border-[#117097]" 
                                value={filaEditable.unidad_medida} 
                                onChange={e => setFilaEditable({...filaEditable, unidad_medida: e.target.value})}
                              >
                                {unidades.map(un => <option key={un} value={un}>{un}</option>)}
                              </select>
                            ) : (
                              ins.unidad_medida
                            )}
                          </td>

                          {/* Columna: Estado */}
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${esCritico ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {esCritico ? 'Escaso' : 'Disponible'}
                            </span>
                          </td>

                          {/* Columna: Acciones de Edición (🚨 SÓLO ADMIN) */}
                          {esAdmin && (
                            <td className="p-3 text-center">
                              {editandoEste ? (
                                <div className="flex gap-1 justify-center">
                                  <button onClick={() => guardarEdicionFila(ins.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">💾 Sí</button>
                                  <button onClick={() => cancelarEdicion()} className="bg-gray-400 hover:bg-gray-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">❌ No</button>
                                </div>
                              ) : (
                                <div className="flex gap-1 justify-center">
                                  <button onClick={() => iniciarEdicion(ins)} className="bg-slate-700 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">✏️ Editar</button>
                                  <button onClick={() => eliminarInsumoCompleto(ins.id, ins.nombre_insumo)} className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-lg text-[10px] font-black">🗑️</button>
                                </div>
                              )}
                            </td>
                          )}

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRO DE ENTRADAS (COMPRAS) */}
      {tabActiva === 'entrada' && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-[#117097] max-w-2xl mx-auto">
          <h3 className="font-black text-[#117097] uppercase text-sm mb-4 italic">📥 Ingreso de Insumos (Compra a Proveedores)</h3>
          <form onSubmit={registrarEntradaBodega} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase italic">Seleccione Insumo</label>
              <select className="w-full border-2 p-3 rounded-xl font-bold bg-white text-sm focus:border-[#117097]" value={entradaForm.insumo_id} onChange={e => setEntradaForm({...entradaForm, insumo_id: e.target.value})} required>
                <option value="">Seleccione...</option>
                {listaInventario.map(i => <option key={i.id} value={i.id}>{i.nombre_insumo} ({i.unidad_medida})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase italic">Cantidad que Entra</label>
                <input type="number" step="any" className="w-full border-2 p-3 rounded-xl font-black text-lg text-emerald-700 focus:border-[#117097]" value={entradaForm.cantidad_ingresada} onChange={e => setEntradaForm({...entradaForm, cantidad_ingresada: e.target.value})} required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase italic">P. Unitario de Compra</label>
                <input type="number" className="w-full border-2 p-3 rounded-xl font-black text-lg text-slate-700 focus:border-[#117097]" value={entradaForm.precio_unitario_compra} onChange={e => setEntradaForm({...entradaForm, precio_unitario_compra: e.target.value})} placeholder="Opcional" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase italic">N° Comprobante / Factura</label>
              <input type="text" className="w-full border-2 p-3 rounded-xl font-bold focus:border-[#117097]" value={entradaForm.numero_factura_comprobante} onChange={e => setEntradaForm({...entradaForm, numero_factura_comprobante: e.target.value})} placeholder="Ej: FAC-4589" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase italic">Observaciones / Nota de Compra</label>
              <textarea className="w-full border-2 p-3 rounded-xl font-bold h-20 bg-gray-50 uppercase focus:bg-white text-xs focus:border-[#117097]" value={entradaForm.observaciones} onChange={e => setEntradaForm({...entradaForm, observaciones: e.target.value})} placeholder="Ej: Comprado en Almacén El Ganadero" />
            </div>
            <button type="submit" className="w-full py-4 bg-[#117097] hover:bg-[#0a4c68] transition-colors text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg">📈 Confirmar Entrada e Incrementar Stock</button>
          </form>
        </div>
      )}

      {/* REGISTRO DE SALIDAS (APLICACIÓN EN CAMPO) */}
      {tabActiva === 'salida' && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-[#117097] max-w-2xl mx-auto">
          <h3 className="font-black text-[#117097] uppercase text-sm mb-4 italic">📤 Despacho de Insumos (Consumo / Aplicación)</h3>
          <form onSubmit={registrarSalidaInvernadero} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase italic">Insumo a Retirar</label>
              <select className="w-full border-2 p-3 rounded-xl font-bold bg-white text-sm focus:border-[#117097]" value={salidaForm.insumo_id} onChange={e => setSalidaForm({...salidaForm, insumo_id: e.target.value})} required>
                <option value="">Seleccione...</option>
                {listaInventario.map(i => (
                  <option key={i.id} value={i.id}>{i.nombre_insumo} — Disponible: {i.cantidad_actual} {i.unidad_medida}(s)</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase italic">Cantidad a Retirar</label>
                <input type="number" step="any" className="w-full border-2 p-3 rounded-xl font-black text-lg text-red-600 focus:border-[#117097]" value={salidaForm.cantidad_retirada} onChange={e => setSalidaForm({...salidaForm, cantidad_retirada: e.target.value})} required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase italic">Invernadero Destino</label>
                <select className="w-full border-2 p-3 rounded-xl font-bold bg-white text-sm focus:border-[#117097]" value={salidaForm.invernadero_id} onChange={e => setSalidaForm({...salidaForm, invernadero_id: e.target.value})} required>
                  <option value="">Seleccione Destino...</option>
                  {datosInvernaderos?.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.nombre?.toUpperCase() || inv.nombre_invernadero?.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase italic">Responsable del Retiro / Operario</label>
              <input type="text" className="w-full border-2 p-3 rounded-xl font-bold uppercase bg-gray-50 focus:bg-white focus:border-[#117097]" value={salidaForm.responsable} onChange={e => setSalidaForm({...salidaForm, responsable: e.target.value})} placeholder="Nombre del trabajador" required />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase italic">Nota de Uso / Dosis Aplicada</label>
              <textarea className="w-full border-2 p-3 rounded-xl font-bold h-20 bg-gray-50 uppercase focus:bg-white text-xs focus:border-[#117097]" value={salidaForm.nota_uso} onChange={e => setSalidaForm({...salidaForm, nota_uso: e.target.value})} placeholder="Ej: Aplicado para control de gota en el bloque B" />
            </div>
            <button type="submit" className="w-full py-4 bg-[#117097] hover:bg-[#0a4c68] transition-colors text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg">📉 Confirmar Despacho y Descontar de Bodega</button>
          </form>
        </div>
      )}
    </div>
  );
}