import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Nomina({ mostrarAlerta, listaInvernaderos }) {
  // Estados de control de datos
  const [trabajadores, setTrabajadores] = useState([]);
  const [jornalesPendientes, setJornalesPendientes] = useState([]);
  const [valesPendientes, setValesPendientes] = useState([]);
  const [tabInterna, setTabInterna] = useState('planilla'); // 'planilla', 'liquidacion', 'personal'
  const [cargando, setCargando] = useState(false);

  // Estados para formularios
  const [formTrabajador, setFormTrabajador] = useState({ nombre_completo: '', cedula: '', telefono: '', pago_jornal_base: '' });
  const [formJornal, setFormJornal] = useState({ trabajador_id: '', fecha_labor: new Date().toISOString().split('T')[0], invernadero_id: '', tipo_labor: 'JORNAL', valor_pagar: '' });
  const [formVale, setFormVale] = useState({ trabajador_id: '', fecha_vale: new Date().toISOString().split('T')[0], monto_vale: '', motivo_nota: '' });

  // Formateador de moneda colombiana
  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor || 0);

  useEffect(() => {
    cargarDatosNomina();
  }, []);

  // --- 1. CARGAR DATOS GENERALES DESDE SUPABASE ---
  const cargarDatosNomina = async () => {
    setCargando(true);
    try {
      const [resTrab, resJor, resVal] = await Promise.all([
        supabase.from('nomina_trabajadores').select('*').eq('activo', true).order('nombre_completo', { ascending: true }),
        supabase.from('nomina_jornales').select('*, nomina_trabajadores(nombre_completo), invernaderos(nombre)').eq('liquidado', false).order('fecha_labor', { ascending: false }),
        supabase.from('nomina_vales').select('*, nomina_trabajadores(nombre_completo)').eq('descontado', false).order('fecha_vale', { ascending: false })
      ]);

      setTrabajadores(resTrab.data || []);
      setJornalesPendientes(resJor.data || []);
      setValesPendientes(resVal.data || []);
    } catch (err) {
      console.error("Error en nómina:", err);
      mostrarAlerta("Error al sincronizar datos de nómina", "error");
    } finally {
      setCargando(false);
    }
  };

  // --- 2. ACCIONES: CREAR TRABAJADOR ---
  const registrarTrabajador = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('nomina_trabajadores').insert([{
        nombre_completo: formTrabajador.nombre_completo.toUpperCase(),
        cedula: formTrabajador.cedula,
        telefono: formTrabajador.telefono,
        pago_jornal_base: parseFloat(formTrabajador.pago_jornal_base) || 0
      }]);
      if (error) throw error;
      mostrarAlerta("Trabajador registrado", "exito");
      setFormTrabajador({ nombre_completo: '', cedula: '', telefono: '', pago_jornal_base: '' });
      cargarDatosNomina();
    } catch (err) { mostrarAlerta("Error o cédula duplicada", "error"); }
  };

  // --- 3. ACCIONES: MARCAR ASISTENCIA / JORNAL ---
  const registrarJornalDiario = async (e) => {
    e.preventDefault();
    if (!formJornal.trabajador_id) return;
    
    // Si no puso tarifa, hereda automáticamente la del operario
    let valorFinal = parseFloat(formJornal.valor_pagar);
    if (!valorFinal) {
      const operario = trabajadores.find(t => t.id === formJornal.trabajador_id);
      valorFinal = operario ? operario.pago_jornal_base : 0;
    }

    try {
      const { error } = await supabase.from('nomina_jornales').insert([{
        trabajador_id: formJornal.trabajador_id,
        fecha_labor: formJornal.fecha_labor,
        invernadero_id: formJornal.invernadero_id || null,
        tipo_labor: formJornal.tipo_labor.toUpperCase(),
        valor_pagar: valorFinal,
        observaciones: formJornal.observaciones?.toUpperCase()
      }]);
      if (error) throw error;
      mostrarAlerta("Asistencia cargada", "exito");
      setFormJornal({ ...formJornal, valor_pagar: '', observaciones: '' });
      cargarDatosNomina();
    } catch (err) { mostrarAlerta("Error al registrar jornal", "error"); }
  };

  // --- 4. ACCIONES: REGISTRAR VALE / AVANCE ---
  const registrarValeAdelanto = async (e) => {
    e.preventDefault();
    const monto = parseFloat(formVale.monto_vale);
    if (!formVale.trabajador_id || monto <= 0) return;

    try {
      const { error } = await supabase.from('nomina_vales').insert([{
        trabajador_id: formVale.trabajador_id,
        fecha_vale: formVale.fecha_vale,
        monto_vale: monto,
        motivo_nota: formVale.motivo_nota.toUpperCase()
      }]);
      if (error) throw error;
      mostrarAlerta("Vale de adelanto autorizado", "exito");
      setFormVale({ ...formVale, monto_vale: '', motivo_nota: '' });
      cargarDatosNomina();
    } catch (err) { mostrarAlerta("Error al registrar el vale", "error"); }
  };

  // --- 5. ALGORITMO INTEGRAL DE LIQUIDACIÓN DE CUENTAS ---
  const calcularPreLiquidacion = () => {
    return trabajadores.map(t => {
      const jornalesObrero = jornalesPendientes.filter(j => j.trabajador_id === t.id);
      const valesObrero = valesPendientes.filter(v => v.trabajador_id === t.id);

      const totalGanado = jornalesObrero.reduce((acc, j) => acc + parseFloat(j.valor_pagar || 0), 0);
      const totalVales = valesObrero.reduce((acc, v) => acc + parseFloat(v.monto_vale || 0), 0);
      const netoPagar = totalGanado - totalVales;

      return {
        id: t.id,
        nombre: t.nombre_completo,
        diasTrabajados: jornalesObrero.length,
        totalGanado,
        totalVales,
        netoPagar
      };
    }).filter(l => l.diasTrabajados > 0 || l.totalVales > 0);
  };

  // --- 6. PROCESAR LIQUIDACIÓN EN BLOQUE ---
  const pagarNominaTrabajador = async (trabajadorId, nombre) => {
    if (!window.confirm(`¿Confirmas el pago y cierre de cuentas de la semana para ${nombre}?`)) return;

    try {
      // 1. Cambiamos jornales de ese obrero a liquidado
      await supabase.from('nomina_jornales').update({ liquidado: true }).eq('trabajador_id', trabajadorId).eq('liquidado', false);
      // 2. Cambiamos vales a descontado
      await supabase.from('nomina_vales').update({ descontado: true }).eq('trabajador_id', trabajadorId).eq('descontado', false);

      mostrarAlerta(`Cuentas de ${nombre} saldadas con éxito`, "exito");
      cargarDatosNomina();
    } catch (err) {
      mostrarAlerta("Hubo un error al cerrar cuentas", "error");
    }
  };

  const listaLiquidacion = calcularPreLiquidacion();

  return (
    <div className="space-y-6 pb-20">
      {/* MENÚ DE ACCESO INTERNO */}
      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setTabInterna('planilla')} className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${tabInterna === 'planilla' ? 'bg-green-800 text-white shadow' : 'bg-gray-200 text-gray-600'}`}>📅 Planilla Diaria / Vales</button>
        <button onClick={() => setTabInterna('liquidacion')} className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${tabInterna === 'liquidacion' ? 'bg-amber-700 text-white shadow' : 'bg-gray-200 text-gray-600'}`}>💰 Liquidar Sábado ({listaLiquidacion.length})</button>
        <button onClick={() => setTabInterna('personal')} className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${tabInterna === 'personal' ? 'bg-slate-800 text-white shadow' : 'bg-gray-200 text-gray-600'}`}>👥 Registro de Trabajadores</button>
      </div>

      {/* PESTAÑA 1: PLANILLA Y REGISTRO DIARIO */}
      {tabInterna === 'planilla' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MARCAR ASISTENCIA */}
          <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-200">
            <h3 className="font-black text-slate-800 uppercase text-xs italic mb-4">📝 Asistencia y Labores por Invernadero</h3>
            <form onSubmit={registrarJornalDiario} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase italic">Fecha</label>
                  <input type="date" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs" value={formJornal.fecha_labor} onChange={e => setFormJornal({...formJornal, fecha_labor: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase italic">Invernadero</label>
                  <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs" value={formJornal.invernadero_id} onChange={e => setFormJornal({...formJornal, invernadero_id: e.target.value})}>
                    <option value="">GENERAL / TODA LA GRANJA</option>
                    {listaInvernaderos?.map(inv => <option key={inv.id} value={inv.id}>{inv.nombre?.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase italic">Seleccione Trabajador</label>
                <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs uppercase" value={formJornal.trabajador_id} onChange={e => setFormJornal({...formJornal, trabajador_id: e.target.value})} required>
                  <option value="">Seleccione...</option>
                  {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre_completo} (Tarifa: {formatoPesos(t.pago_jornal_base)})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase italic">Tipo de Labor</label>
                  <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase" value={formJornal.tipo_labor} onChange={e => setFormJornal({...formJornal, tipo_labor: e.target.value})} placeholder="JORNAL / CONTRATO / RECOLECCIÓN" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase italic">Valor Jornal Especial</label>
                  <input type="number" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs" value={formJornal.valor_pagar} onChange={e => setFormJornal({...formJornal, valor_pagar: e.target.value})} placeholder="Vacio = Usa jornal base" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase italic">Detalle de la labor</label>
                <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase" value={formJornal.observaciones} onChange={e => setFormJornal({...formJornal, observaciones: e.target.value})} placeholder="Ej: Amarre de plantas bloque 2" />
              </div>
              <button type="submit" className="w-full py-3 bg-green-800 text-white font-black rounded-xl uppercase text-xs shadow-md">✓ Cargar Jornal</button>
            </form>
          </div>

          {/* VALES Y AVANCES */}
          <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-200 h-fit">
            <h3 className="font-black text-slate-800 uppercase text-xs italic mb-4">🎟️ Registrar Vales, Adelantos y Descuentos</h3>
            <form onSubmit={registrarValeAdelanto} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase italic">Fecha Vale</label>
                  <input type="date" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs" value={formVale.fecha_vale} onChange={e => setFormVale({...formVale, fecha_vale: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase italic">Monto Adelantado</label>
                  <input type="number" className="w-full border-2 p-2.5 rounded-xl font-black text-green-700 text-sm" value={formVale.monto_vale} onChange={e => setFormVale({...formVale, monto_vale: e.target.value})} placeholder="Ej: 50000" required />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase italic">Trabajador</label>
                <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs uppercase" value={formVale.trabajador_id} onChange={e => setFormVale({...formVale, trabajador_id: e.target.value})} required>
                  <option value="">Seleccione...</option>
                  {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase italic">Motivo del Adelanto</label>
                <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase" value={formVale.motivo_nota} onChange={e => setFormVale({...formVale, motivo_nota: e.target.value})} placeholder="Ej: Avance de mitad de semana" required />
              </div>
              <button type="submit" className="w-full py-3 bg-amber-600 text-white font-black rounded-xl uppercase text-xs shadow-md">💸 Registrar Adelanto</button>
            </form>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: ASISTENTE DE LIQUIDACIÓN DE CAJA (MÁGICO) */}
      {tabInterna === 'liquidacion' && (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-4 bg-amber-700 text-white font-black text-xs uppercase tracking-widest italic">Asistente Central de Cierre de Cuentas</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 border-b">
                  <th className="p-3">Trabajador</th>
                  <th className="p-3 text-center">Días Devengados</th>
                  <th className="p-3 text-right">Total Ganado (+)</th>
                  <th className="p-3 text-right">Vales/Adelantos (-)</th>
                  <th className="p-3 text-right">Neto a Pagar (=)</th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs font-bold text-slate-700">
                {listaLiquidacion.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-400 italic">No hay labores registradas ni adelantos pendientes esta semana.</td></tr>
                ) : (
                  listaLiquidacion.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}>
                      <td className="p-3 font-black text-slate-900 uppercase">{item.nombre}</td>
                      <td className="p-3 text-center text-sm">{item.diasTrabajados} d</td>
                      <td className="p-3 text-right text-green-700 font-black">{formatoPesos(item.totalGanado)}</td>
                      <td className="p-3 text-right text-red-600 font-black">{formatoPesos(item.totalVales)}</td>
                      <td className="p-3 text-right text-slate-900 font-extrabold text-sm bg-gray-50/80">{formatoPesos(item.netoPagar)}</td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => pagarNominaTrabajador(item.id, item.nombre)}
                          className="px-3 py-1.5 bg-green-700 text-white text-[10px] font-black uppercase rounded-lg hover:bg-green-800 shadow shadow-green-900/10 active:scale-95 transition-all"
                        >
                          💵 Marcar Pagado
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: DIRECTORIO DE COLABORADORES */}
      {tabInterna === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* REGISTRAR OPERARIO */}
          <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-200 h-fit">
            <h3 className="font-black text-slate-800 uppercase text-xs italic mb-4">👤 Ingresar Trabajador</h3>
            <form onSubmit={registrarTrabajador} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase italic">Nombre Completo</label>
                <input type="text" className="w-full border-2 p-2 rounded-xl font-bold text-xs uppercase" value={formTrabajador.nombre_completo} onChange={e => setFormTrabajador({...formTrabajador, nombre_completo: e.target.value})} required placeholder="Ej: Carlos Mario Restrepo" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase italic">Cédula</label>
                  <input type="text" className="w-full border-2 p-2 rounded-xl font-bold text-xs" value={formTrabajador.cedula} onChange={e => setFormTrabajador({...formTrabajador, cedula: e.target.value})} required placeholder="Sin puntos" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase italic">Teléfono</label>
                  <input type="text" className="w-full border-2 p-2 rounded-xl font-bold text-xs" value={formTrabajador.telefono} onChange={e => setFormTrabajador({...formTrabajador, telefono: e.target.value})} placeholder="Opcional" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase italic">Tarifa Base por Jornal Diario</label>
                <input type="number" className="w-full border-2 p-2.5 rounded-xl font-black text-sm text-slate-800" value={formTrabajador.pago_jornal_base} onChange={e => setFormTrabajador({...formTrabajador, pago_jornal_base: e.target.value})} required placeholder="Ej: 60000" />
              </div>
              <button type="submit" className="w-full py-3 bg-slate-800 text-white font-black rounded-xl uppercase text-xs tracking-wider">💾 Guardar Personal</button>
            </form>
          </div>

          {/* LISTADO DE PERSONAL ACTIVO */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            <div className="p-4 bg-slate-800 text-white font-black text-xs uppercase tracking-widest italic">Directorio Interno de Operarios</div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {trabajadores.length === 0 ? (
                <div className="p-6 text-center text-gray-400 italic text-xs">No hay trabajadores activos registrados</div>
              ) : (
                trabajadores.map(t => (
                  <div key={t.id} className="p-3 flex justify-between items-center text-xs font-bold hover:bg-slate-50 transition-colors">
                    <div className="uppercase">
                      <p className="font-black text-slate-900">{t.nombre_completo}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">C.C. {t.cedula || 'N/A'} — Tel: {t.telefono || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500 font-medium text-[10px] uppercase">Jornal Diario</p>
                      <p className="font-black text-slate-900 text-sm">{formatoPesos(t.pago_jornal_base)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}