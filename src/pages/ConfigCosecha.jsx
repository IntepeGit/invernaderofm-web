import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ConfigCosecha({ mostrarAlerta }) {
  // Estados para almacenar las listas de Supabase
  const [productos, setProductos] = useState([]);
  const [calidades, setCalidades] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Estados para los campos de texto de los nuevos registros
  const [nuevoProducto, setNuevoProducto] = useState('');
  const [nuevaCalidad, setNuevaCalidad] = useState('');
  const [nuevaUnidad, setNuevaUnidad] = useState('');

  useEffect(() => {
    cargarTodosLosParametros();
  }, []);

  // --- 1. CARGAR DATOS EN TIEMPO REAL DESDE SUPABASE ---
  const cargarTodosLosParametros = async () => {
    setCargando(true);
    try {
      const [resProd, resCal, resUni] = await Promise.all([
        supabase.from('config_productos').select('*').order('nombre_producto', { ascending: true }),
        supabase.from('config_calidades').select('*').order('nombre_calidad', { ascending: true }),
        supabase.from('config_unidades').select('*').order('nombre_unidad', { ascending: true })
      ]);

      if (resProd.error) throw resProd.error;
      if (resCal.error) throw resCal.error;
      if (resUni.error) throw resUni.error;

      setProductos(resProd.data || []);
      setCalidades(resCal.data || []);
      setUnidades(resUni.data || []);
    } catch (err) {
      console.error("Error cargando parámetros:", err);
      mostrarAlerta("No se pudieron cargar las configuraciones", "error");
    } finally {
      setCargando(false);
    }
  };

  // --- 2. FUNCIONES PARA AGREGAR ELEMENTOS ---
  const agregarProducto = async (e) => {
    e.preventDefault();
    if (!nuevoProducto.trim()) return;
    try {
      const { error } = await supabase
        .from('config_productos')
        .insert([{ nombre_producto: nuevoProducto.trim().toUpperCase() }]);
      
      if (error) throw error;
      mostrarAlerta("Producto añadido", "exito");
      setNuevoProducto('');
      cargarTodosLosParametros();
    } catch (err) {
      mostrarAlerta("El producto ya existe o hubo un error", "error");
    }
  };

  const agregarCalidad = async (e) => {
    e.preventDefault();
    if (!nuevaCalidad.trim()) return;
    try {
      const { error } = await supabase
        .from('config_calidades')
        .insert([{ nombre_calidad: nuevaCalidad.trim().toUpperCase() }]);
      
      if (error) throw error;
      mostrarAlerta("Calidad añadida", "exito");
      setNuevaCalidad('');
      cargarTodosLosParametros();
    } catch (err) {
      mostrarAlerta("La calidad ya existe o hubo un error", "error");
    }
  };

  const agregarUnidad = async (e) => {
    e.preventDefault();
    if (!nuevaUnidad.trim()) return;
    try {
      const { error } = await supabase
        .from('config_unidades')
        .insert([{ nombre_unidad: nuevaUnidad.trim().toUpperCase() }]);
      
      if (error) throw error;
      mostrarAlerta("Unidad de medida añadida", "exito");
      setNuevaUnidad('');
      cargarTodosLosParametros();
    } catch (err) {
      mostrarAlerta("La unidad ya existe o hubo un error", "error");
    }
  };

  // --- 3. FUNCIONES PARA ELIMINAR ELEMENTOS ---
  const eliminarElemento = async (tabla, id, campoNombre, valorNombre) => {
    if (!window.confirm(`¿Seguro que deseas eliminar "${valorNombre}" de las opciones?`)) return;
    try {
      const { error } = await supabase.from(tabla).delete().eq('id', id);
      if (error) throw error;
      mostrarAlerta("Opción eliminada con éxito", "exito");
      cargarTodosLosParametros();
    } catch (err) {
      mostrarAlerta("No se pudo eliminar. Puede estar en uso en la cosecha", "error");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-4 rounded-2xl shadow border-l-4 border-amber-500">
        <p className="text-xs font-bold text-slate-600 uppercase">💡 Información de Configuración</p>
        <p className="text-[11px] text-slate-400 mt-1">Los elementos que agregues aquí aparecerán de forma inmediata como opciones desplegables dentro del formulario de Cosecha Diaria.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUMNA 1: PRODUCTOS */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col justify-between">
          <div className="p-4 bg-slate-800 text-white font-black text-xs uppercase tracking-wider italic">🍅 Catálogo de Productos</div>
          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
            <form onSubmit={agregarProducto} className="flex gap-2">
              <input type="text" className="flex-1 border-2 p-2 rounded-xl font-bold text-xs uppercase bg-gray-50 focus:bg-white" value={nuevoProducto} onChange={e => setNuevoProducto(e.target.value)} placeholder="NUEVO PRODUCTO..." required />
              <button type="submit" className="px-3 bg-green-700 text-white font-black rounded-xl text-xs hover:bg-green-800">＋</button>
            </form>
            <div className="max-h-60 overflow-y-auto divide-y border rounded-xl bg-gray-50">
              {productos.map(p => (
                <div key={p.id} className="p-2.5 flex justify-between items-center text-xs font-bold uppercase text-slate-700 bg-white">
                  <span>{p.nombre_producto}</span>
                  <button onClick={() => eliminarElemento('config_productos', p.id, 'nombre_producto', p.nombre_producto)} className="text-red-500 hover:text-red-700 px-1">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA 2: CALIDADES */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col justify-between">
          <div className="p-4 bg-slate-800 text-white font-black text-xs uppercase tracking-wider italic">⭐ Clasificación de Calidades</div>
          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
            <form onSubmit={agregarCalidad} className="flex gap-2">
              <input type="text" className="flex-1 border-2 p-2 rounded-xl font-bold text-xs uppercase bg-gray-50 focus:bg-white" value={nuevaCalidad} onChange={e => setNuevaCalidad(e.target.value)} placeholder="NUEVA CALIDAD..." required />
              <button type="submit" className="px-3 bg-green-700 text-white font-black rounded-xl text-xs hover:bg-green-800">＋</button>
            </form>
            <div className="max-h-60 overflow-y-auto divide-y border rounded-xl bg-gray-50">
              {calidades.map(c => (
                <div key={c.id} className="p-2.5 flex justify-between items-center text-xs font-bold uppercase text-slate-700 bg-white">
                  <span>{c.nombre_calidad}</span>
                  <button onClick={() => eliminarElemento('config_calidades', c.id, 'nombre_calidad', c.nombre_calidad)} className="text-red-500 hover:text-red-700 px-1">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA 3: UNIDADES DE MEDIDA */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col justify-between">
          <div className="p-4 bg-slate-800 text-white font-black text-xs uppercase tracking-wider italic">⚖️ Unidades de Medida</div>
          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
            <form onSubmit={agregarUnidad} className="flex gap-2">
              <input type="text" className="flex-1 border-2 p-2 rounded-xl font-bold text-xs uppercase bg-gray-50 focus:bg-white" value={nuevaUnidad} onChange={e => setNuevaUnidad(e.target.value)} placeholder="NUEVA UNIDAD..." required />
              <button type="submit" className="px-3 bg-green-700 text-white font-black rounded-xl text-xs hover:bg-green-800">＋</button>
            </form>
            <div className="max-h-60 overflow-y-auto divide-y border rounded-xl bg-gray-50">
              {unidades.map(u => (
                <div key={u.id} className="p-2.5 flex justify-between items-center text-xs font-bold uppercase text-slate-700 bg-white">
                  <span>{u.nombre_unidad}</span>
                  <button onClick={() => eliminarElemento('config_unidades', u.id, 'nombre_unidad', u.nombre_unidad)} className="text-red-500 hover:text-red-700 px-1">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}