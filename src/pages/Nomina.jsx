import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Nomina({ mostrarAlerta, listaInvernaderos }) {
  const [trabajadores, setTrabajadores] = useState([]);
  const [jornalesPendientes, setJornalesPendientes] = useState([]);
  const [valesPendientes, setValesPendientes] = useState([]);
  const [pagosHistoricos, setPagosHistoricos] = useState([]); 
  const [tabInterna, setTabInterna] = useState('planilla'); 
  const [cargando, setCargando] = useState(false);
  const [subTabLiquidacion, setSubTabLiquidacion] = useState('Sábado (Jornalero)');

  const [fechasCorteQuincena, setFechasCorteQuincena] = useState({});

  const [formTrabajador, setFormTrabajador] = useState({ id_editando: null, nombre_completo: '', cedula: '', telefono: '', pago_jornal_base: '', tipo_pago: 'Sábado (Jornalero)' });
  const [formJornal, setFormJornal] = useState({ id_editando: null, trabajador_id: '', fecha_labor: new Date().toISOString().split('T')[0], invernadero_id: '', tipo_labor: 'JORNAL', valor_pagar: '', observaciones: '' });
  const [formVale, setFormVale] = useState({ id_editando: null, trabajador_id: '', fecha_vale: new Date().toISOString().split('T')[0], monto_vale: '', motivo_nota: '' });

  const tiposPago = ["Sábado (Jornalero)", "Quincenal (Fijo)"];
  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor || 0);

  useEffect(() => {
    cargarDatosNomina();
  }, []);

  const cargarDatosNomina = async () => {
    setCargando(true);
    try {
      const [resTrab, resJor, resVal, resPagos] = await Promise.all([
        supabase.from('nomina_trabajadores').select('*').eq('activo', true).order('nombre_completo', { ascending: true }),
        supabase.from('nomina_jornales').select('*, nomina_trabajadores(nombre_completo), invernaderos(nombre)').eq('liquidado', false).order('fecha_labor', { ascending: false }),
        supabase.from('nomina_vales').select('*, nomina_trabajadores(nombre_completo)').eq('descontado', false).order('fecha_vale', { ascending: false }),
        supabase.from('nomina_pagos_realizados').select('*').order('fecha_pago', { ascending: false })
      ]);

      setTrabajadores(resTrab.data || []);
      setJornalesPendientes(resJor.data || []);
      setValesPendientes(resVal.data || []);
      setPagosHistoricos(resPagos.data || []);

      const fechasIniciales = {};
      (resTrab.data || []).forEach(t => {
        fechasIniciales[t.id] = new Date().toISOString().split('T')[0];
      });
      setFechasCorteQuincena(fechasIniciales);

    } catch (err) {
      console.error("Error en nómina:", err);
      mostrarAlerta("Error al sincronizar datos de nómina", "error");
    } finally {
      setCargando(false);
    }
  };

  const registrarTrabajador = async (e) => {
    e.preventDefault();
    const payload = {
      nombre_completo: formTrabajador.nombre_completo.toUpperCase().trim(),
      cedula: formTrabajador.cedula.trim(),
      telefono: formTrabajador.telefono.trim(),
      pago_jornal_base: parseFloat(formTrabajador.pago_jornal_base) || 0,
      tipo_pago: formTrabajador.tipo_pago 
    };

    try {
      let error;
      if (formTrabajador.id_editando) {
        error = (await supabase.from('nomina_trabajadores').update(payload).eq('id', formTrabajador.id_editando)).error;
      } else {
        error = (await supabase.from('nomina_trabajadores').insert([payload])).error;
      }
      if (error) throw error;
      mostrarAlerta(formTrabajador.id_editando ? "Trabajador actualizado" : "Trabajador registrado", "exito");
      limpiarFormTrabajador();
      await cargarDatosNomina();
    } catch (err) { mostrarAlerta("Error o cédula duplicada", "error"); }
  };

  const prepararEdicionTrabajador = (item) => {
    setFormTrabajador({ id_editando: item.id, nombre_completo: item.nombre_completo, cedula: item.cedula, telefono: item.telefono || '', pago_jornal_base: item.pago_jornal_base, tipo_pago: item.tipo_pago || 'Sábado (Jornalero)' });
    setTabInterna('personal');
  };

  const eliminarTrabajadorLogico = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de inactivar a ${nombre}?`)) {
      const { error } = await supabase.from('nomina_trabajadores').update({ activo: false }).eq('id', id);
      if (error) mostrarAlerta("No se pudo inactivar", "error");
      else { mostrarAlerta("Trabajador inactivado con éxito"); await cargarDatosNomina(); }
    }
  };

  const limpiarFormTrabajador = () => setFormTrabajador({ id_editando: null, nombre_completo: '', cedula: '', telefono: '', pago_jornal_base: '', tipo_pago: 'Sábado (Jornalero)' });

  const registrarJornalDiario = async (e) => {
    e.preventDefault();
    if (!formJornal.trabajador_id) return;
    let valorFinal = parseFloat(formJornal.valor_pagar) || trabajadores.find(t => t.id === formJornal.trabajador_id)?.pago_jornal_base || 0;

    const payload = {
      trabajador_id: formJornal.trabajador_id,
      fecha_labor: formJornal.fecha_labor,
      invernadero_id: formJornal.invernadero_id || null,
      tipo_labor: formJornal.tipo_labor.toUpperCase().trim(),
      valor_pagar: valorFinal,
      observaciones: formJornal.observaciones ? formJornal.observaciones.toUpperCase().trim() : null
    };

    try {
      const { error } = formJornal.id_editando ? await supabase.from('nomina_jornales').update(payload).eq('id', formJornal.id_editando) : await supabase.from('nomina_jornales').insert([payload]);
      if (error) throw error;
      mostrarAlerta("Asistencia procesada", "exito");
      limpiarFormJornal();
      await cargarDatosNomina();
    } catch (err) { mostrarAlerta("Error al registrar jornal", "error"); }
  };

  const limpiarFormJornal = () => setFormJornal({ id_editando: null, trabajador_id: '', fecha_labor: new Date().toISOString().split('T')[0], invernadero_id: '', tipo_labor: 'JORNAL', valor_pagar: '', observaciones: '' });

  const registrarValeAdelanto = async (e) => {
    e.preventDefault();
    const monto = parseFloat(formVale.monto_vale);
    if (!formVale.trabajador_id || monto <= 0) return;

    try {
      const { error } = formVale.id_editando ? await supabase.from('nomina_vales').update({ trabajador_id: formVale.trabajador_id, fecha_vale: formVale.fecha_vale, monto_vale: monto, motivo_nota: formVale.motivo_nota.toUpperCase().trim() }).eq('id', formVale.id_editando) : await supabase.from('nomina_vales').insert([{ trabajador_id: formVale.trabajador_id, fecha_vale: formVale.fecha_vale, monto_vale: monto, motivo_nota: formVale.motivo_nota.toUpperCase().trim() }]);
      if (error) throw error;
      mostrarAlerta("Vale autorizado", "exito");
      limpiarFormVale();
      await cargarDatosNomina();
    } catch (err) { mostrarAlerta("Error al registrar el vale", "error"); }
  };

  const limpiarFormVale = () => setFormVale({ id_editando: null, trabajador_id: '', fecha_vale: new Date().toISOString().split('T')[0], monto_vale: '', motivo_nota: '' });

  const calcularPreLiquidacion = (filtroPago) => {
    return trabajadores
      .filter(t => (t.tipo_pago || 'Sábado (Jornalero)') === filtroPago)
      .map(t => {
        const jornalesObrero = jornalesPendientes.filter(j => j.trabajador_id === t.id);
        const valesObrero = valesPendientes.filter(v => v.trabajador_id === t.id);

        let totalGanado = filtroPago === 'Quincenal (Fijo)' ? t.pago_jornal_base : jornalesObrero.reduce((acc, j) => acc + parseFloat(j.valor_pagar || 0), 0);
        const totalVales = valesObrero.reduce((acc, v) => acc + parseFloat(v.monto_vale || 0), 0);
        
        return {
          id: t.id,
          nombre: t.nombre_completo,
          cedula: t.cedula || 'N/R',
          telefono: t.telefono || 'N/R',
          diasTrabajados: jornalesObrero.length,
          totalGanado,
          totalVales,
          netoPagar: (totalGanado - totalVales),
          tipo_pago: t.tipo_pago || 'Sábado (Jornalero)'
        };
      })
      // 🕵️ FILTRO OPTIMIZADO: Si tiene jornales o vales sin liquidar vigentes, se mantiene arriba.
      .filter(l => l.tipo_pago === 'Quincenal (Fijo)' || l.diasTrabajados > 0 || l.totalVales > 0);
  };

  const generarComprobanteNominaPDF = (item, fechaHistorica = null) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [105, 148] });
    doc.setDrawColor(17, 112, 151); doc.setLineWidth(0.8); doc.rect(4, 4, 97, 140);
    const fechaImpresion = fechaHistorica || fechasCorteQuincena[item.id] || new Date().toISOString().split('T')[0];
    
    doc.setFont("helvetica", "bold").setFontSize(8); doc.setTextColor(60, 60, 60);
    doc.text(`Comp. N°: NOM-${String(item.id).substring(0, 4).toUpperCase()}`, 6, 11);
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(17, 112, 151);
    doc.text("COMPROBANTE DE PAGO", 52.5, 29, { align: "center" });

    const yBase = 33;
    doc.setFillColor(242, 242, 242); doc.rect(6, yBase, 93, 5, 'F'); doc.rect(6, yBase + 10, 93, 5, 'F');
    doc.setDrawColor(210, 210, 210).setLineWidth(0.2).rect(6, yBase, 93, 15);
    doc.line(6, yBase + 5, 99, yBase + 5); doc.line(6, yBase + 10, 99, yBase + 10); doc.line(52, yBase, 52, yBase + 5);

    doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(0);
    doc.text("Fecha Periodo:", 7, yBase + 3.5); doc.setFont("helvetica", "normal").text(fechaImpresion, 30, yBase + 3.5);
    doc.setFont("helvetica", "bold").text("Colaborador:", 7, yBase + 8.5); doc.setFont("helvetica", "normal").text(item.nombre, 23, yBase + 8.5);
    doc.setFont("helvetica", "bold").text("Cédula:", 7, yBase + 13.5); doc.setFont("helvetica", "normal").text(item.cedula, 19, yBase + 13.5);

    const esQuincenal = item.tipo_pago === 'Quincenal (Fijo)';
    const filasTabla = [[
      `${esQuincenal ? '1' : item.diasTrabajados || item.dias_respaldo || '---'}`,
      `${esQuincenal ? 'Quincena' : 'Días'}`,
      `${esQuincenal ? 'PAGO SALARIO FIJO QUINCENAL' : 'JORNALES LABORADOS ACUMULADOS'}`,
      "",
      `+${formatoPesos(item.totalGanado || item.monto_devengado)}`
    ]];

    if (item.totalVales > 0) {
      filasTabla.push(["1", "Global", "DESCUENTO DE VALES / ADELANTOS", "", `-${formatoPesos(item.totalVales)}`]);
    }

    autoTable(doc, {
      startY: yBase + 18, margin: { left: 6, right: 6 },
      head: [["Cant.", "Unidad", "Detalle", "Precio", "Monto"]], body: filasTabla, theme: 'grid',
      styles: { font: 'helvetica', fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [17, 112, 151] }
    });

    const yTotal = doc.lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "bold").setFontSize(8.5);
    doc.text("VALOR PAGADO:", 45, yTotal); doc.text(formatoPesos(item.netoPagar || item.monto_pagado), 99, yTotal, { align: 'right' });
    doc.save(`RECIBO_NOMINA_${item.nombre.replace(/ /g, "_")}.pdf`);
  };

  const pagarNominaTrabajador = async (item) => {
    const fechaSeleccionada = fechasCorteQuincena[item.id] || new Date().toISOString().split('T')[0];
    if (!window.confirm(`¿Confirmas el pago definitivo con fecha de corte de periodo (${fechaSeleccionada}) para ${item.nombre}?`)) return;

    try {
      // 1. Guardar en el historial físico acumulable de Supabase
      await supabase.from('nomina_pagos_realizados').insert([{
        trabajador_id: item.id,
        fecha_pago: fechaSeleccionada,
        monto_pagado: item.netoPagar, 
        monto_devengado: item.totalGanado, 
        monto_vales: item.totalVales, 
        periodo: fechaSeleccionada,
        dias_liquidados: item.diasTrabajados || 15
      }]);

      // 2. Inyectamos consolidado a la bitácora de jornales cerrados para visualización global
      await supabase.from('nomina_jornales').insert([{
        trabajador_id: item.id,
        fecha_labor: fechaSeleccionada,
        tipo_labor: item.tipo_pago === 'Quincenal (Fijo)' ? 'QUINCENA FIJA' : 'JORNAL SEMANAL TOTAL',
        valor_pagar: item.totalGanado,
        liquidado: true, 
        observaciones: `CIERRE CONSOLIDADO PERIODO ${fechaSeleccionada}`
      }]);

      // 3. Descargar/Cerrar los vales y asistencias diarias acumuladas individuales de la semana
      await supabase.from('nomina_vales').update({ descontado: true }).eq('trabajador_id', item.id).eq('descontado', false);
      await supabase.from('nomina_jornales').update({ liquidado: true }).eq('trabajador_id', item.id).eq('liquidado', false);

      mostrarAlerta(`Pago asentado exitosamente con fecha ${fechaSeleccionada}`, "exito");
      await cargarDatosNomina();
    } catch (err) {
      mostrarAlerta("Error al cerrar cuentas en el servidor", "error");
    }
  };

  const resetearCicloCompleto = async () => {
    if (window.confirm("¿Está seguro de limpiar la planilla?")) {
      mostrarAlerta("Planilla diaria lista para el nuevo ciclo", "exito");
      await cargarDatosNomina();
    }
  };

  const listaLiquidacionSabado = calcularPreLiquidacion('Sábado (Jornalero)');
  const listaLiquidacionQuincena = calcularPreLiquidacion('Quincenal (Fijo)');

  return (
    <div className="space-y-6 pb-20 text-slate-800">
      <div className="flex gap-2 border-b-2 border-gray-200 pb-2 overflow-x-auto">
        <button onClick={() => setTabInterna('planilla')} className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${tabInterna === 'planilla' ? 'bg-[#117097] text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>📅 Planilla Diaria / Vales</button>
        <button onClick={() => setTabInterna('liquidacion')} className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${tabInterna === 'liquidacion' ? 'bg-[#117097] text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>💰 Liquidación Central</button>
        <button onClick={() => setTabInterna('personal')} className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${tabInterna === 'personal' ? 'bg-[#117097] text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>👥 Registro de Trabajadores</button>
      </div>

      {tabInterna === 'planilla' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-[#117097]">
              <h3 className="font-black text-slate-800 uppercase text-xs italic mb-4">📝 Asistencia y Labores por Invernadero</h3>
              <form onSubmit={registrarJornalDiario} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Fecha de Labor</label>
                    <input type="date" className="w-full border-2 p-2.5 rounded-xl font-bold text-sm outline-none focus:border-[#117097]" value={formJornal.fecha_labor} onChange={e => setFormJornal({...formJornal, fecha_labor: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Invernadero</label>
                    <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs outline-none focus:border-[#117097]" value={formJornal.invernadero_id} onChange={e => setFormJornal({...formJornal, invernadero_id: e.target.value})}>
                      <option value="">GENERAL / TODA EL INVERNADERO</option>
                      {listaInvernaderos?.filter(inv => inv.activo !== false).map(inv => <option key={inv.id} value={inv.id}>{inv.nombre?.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Seleccione Trabajador (Solo Jornaleros)</label>
                  <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs uppercase outline-none focus:border-[#117097]" value={formJornal.trabajador_id} onChange={e => setFormJornal({...formJornal, trabajador_id: e.target.value})} required>
                    <option value="">Seleccione operario...</option>
                    {trabajadores.filter(t => t.tipo_pago !== 'Quincenal (Fijo)').map(t => <option key={t.id} value={t.id}>{t.nombre_completo} (Tarifa Base: {formatoPesos(t.pago_jornal_base)})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Tipo de Labor</label>
                    <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase outline-none focus:border-[#117097]" value={formJornal.tipo_labor} onChange={e => setFormJornal({...formJornal, tipo_labor: e.target.value})} placeholder="JORNAL / CONTRATO" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Tarifa Especial (COP)</label>
                    <input type="number" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-[#117097]" value={formJornal.valor_pagar} onChange={e => setFormJornal({...formJornal, valor_pagar: e.target.value})} placeholder="Vacío = Usa tarifa base" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Detalle / Notas de Actividad</label>
                  <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase outline-none focus:border-[#117097]" value={formJornal.observaciones} onChange={e => setFormJornal({...formJornal, observaciones: e.target.value})} placeholder="Ej: Amarre de plantas" />
                </div>
                <button type="submit" className="w-full py-3.5 text-white font-black rounded-xl uppercase text-xs tracking-wider shadow-md bg-[#117097] hover:bg-[#0a4c68]">✓ Cargar Jornal en Planilla</button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-[#117097] p-2.5 text-white font-black text-[10px] uppercase tracking-wider pl-4">Planilla Acumulada de la Semana (Jornaleros)</div>
              <div className="max-h-56 overflow-y-auto text-[10px]">
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y font-bold text-slate-600">
                    {jornalesPendientes.length === 0 ? <tr><td className="p-4 text-center text-gray-400 italic">No hay jornales cargados esta semana</td></tr> : jornalesPendientes.map(j => (
                      <tr key={j.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-900 uppercase truncate">{j.nomina_trabajadores?.nombre_completo}</td>
                        <td className="p-3 uppercase text-slate-400">{j.invernaderos?.nombre || 'General'}</td>
                        <td className="p-3 text-right text-emerald-700 font-black pr-4">{formatoPesos(j.valor_pagar)}</td>
                        <td className="p-3 text-center"><button onClick={() => eliminarJornal(j.id)} className="p-1 text-red-600 font-black">🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-[#117097]">
              <h3 className="font-black text-slate-800 uppercase text-xs italic mb-4">🎟️ Registrar Vales, Adelantos y Descuentos</h3>
              <form onSubmit={registrarValeAdelanto} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Fecha Vale</label>
                    <input type="date" className="w-full border-2 p-2.5 rounded-xl font-bold text-sm outline-none focus:border-[#117097]" value={formVale.fecha_vale} onChange={e => setFormVale({...formVale, fecha_vale: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Monto Adelantado (COP)</label>
                    <input type="number" className="w-full border-2 p-2.5 rounded-xl font-black text-emerald-700 text-sm outline-none focus:border-[#117097]" value={formVale.monto_vale} onChange={e => setFormVale({...formVale, monto_vale: e.target.value})} required />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Trabajador Beneficiario</label>
                  <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs uppercase outline-none focus:border-[#117097]" value={formVale.trabajador_id} onChange={e => setFormVale({...formVale, trabajador_id: e.target.value})} required>
                    <option value="">Seleccione operario...</option>
                    {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre_completo} ({t.tipo_pago || 'Jornalero'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Motivo del Adelanto</label>
                  <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase outline-none focus:border-[#117097]" value={formVale.motivo_nota} onChange={e => setFormVale({...formVale, motivo_nota: e.target.value})} required />
                </div>
                <button type="submit" className="w-full py-3.5 text-white font-black rounded-xl uppercase text-xs tracking-wider shadow-md bg-[#117097] hover:bg-[#0a4c68]">💸 Registrar Adelanto / Descuento</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {tabInterna === 'liquidacion' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            <div className="p-4 bg-[#117097] text-white font-black text-xs uppercase tracking-widest italic flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex gap-2">
                <button onClick={() => setSubTabLiquidacion('Sábado (Jornalero)')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${subTabLiquidacion === 'Sábado (Jornalero)' ? 'bg-[#0a4c68] text-white border border-white/20' : 'bg-[#117097] text-sky-100'}`}>🚜 Jornaleros (Sábado) ({listaLiquidacionSabado.length})</button>
                <button onClick={() => setSubTabLiquidacion('Quincenal (Fijo)')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${subTabLiquidacion === 'Quincenal (Fijo)' ? 'bg-[#0a4c68] text-white border border-white/20' : 'bg-[#117097] text-sky-100'}`}>📅 Fijos (Quincenal) ({listaLiquidacionQuincena.length})</button>
              </div>
              <button onClick={resetearCicloCompleto} className="px-3 py-1.5 bg-[#0a4c68] hover:bg-black text-white text-[10px] font-black uppercase rounded-lg transition-colors border border-black/10">🧹 Limpiar Asistencia de Ciclo</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-300 text-slate-800 uppercase font-black border-b-2 border-gray-400">
                    <th className="p-4">Trabajador / Colaborador</th>
                    <th className="p-4 text-center">Definir Fecha Corte Periodo</th>
                    <th className="p-4 text-right">Monto Devengado (+)</th>
                    <th className="p-4 text-right">Vales / Adelantos (-)</th>
                    <th className="p-4 text-right">Neto Efectivo a Pagar (=)</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-400 font-bold text-slate-700">
                  {(subTabLiquidacion === 'Sábado (Jornalero)' ? listaLiquidacionSabado : listaLiquidacionQuincena).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-400 italic font-bold">No hay pagos pendientes de procesar en este periodo.</td>
                    </tr>
                  ) : (
                    (subTabLiquidacion === 'Sábado (Jornalero)' ? listaLiquidacionSabado : listaLiquidacionQuincena).map((item) => (
                      <tr key={item.id} className="bg-white hover:bg-sky-50 transition-colors">
                        <td className="p-4 font-black uppercase border-l-8 border-[#117097] text-slate-900">{item.nombre}</td>
                        <td className="p-4 text-center">
                          <input 
                            type="date" 
                            className="border-2 p-1.5 rounded-xl text-center font-black text-xs text-[#117097] bg-amber-50/30 border-amber-100 outline-none focus:border-[#117097]"
                            value={fechasCorteQuincena[item.id] || new Date().toISOString().split('T')[0]}
                            onChange={e => setFechasCorteQuincena({ ...fechasCorteQuincena, [item.id]: e.target.value })}
                          />
                        </td>
                        <td className="p-4 text-right font-black text-xs text-emerald-700">{formatoPesos(item.totalGanado)}</td>
                        <td className="p-4 text-right font-black text-xs text-red-600">{formatoPesos(item.totalVales)}</td>
                        <td className="p-4 text-right font-black text-sm bg-slate-50/50">{formatoPesos(item.netoPagar)}</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button type="button" onClick={() => generarComprobanteNominaPDF(item)} className="px-3 py-1.5 bg-[#0a4c68] text-white text-[10px] font-black uppercase rounded-lg hover:bg-black">🖨️ PDF</button>
                            <button type="button" onClick={() => pagarNominaTrabajador(item)} className="px-3 py-1.5 bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg hover:bg-emerald-800 shadow">💵 PAGAR</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            <div className="p-3 bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider pl-4">📚 Historial de Quincenas y Periodos Liquidados Anteriormente</div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase font-black border-b">
                    <th className="p-3">Trabajador / Colaborador</th>
                    <th className="p-3 text-center">Fecha Periodo Cierre</th>
                    <th className="p-3 text-right">Jornales Devengados (+)</th>
                    <th className="p-3 text-right">Vales Descontados (-)</th>
                    <th className="p-3 text-right">Neto Total Entregado (=)</th>
                    <th className="p-3 text-center">Estado Bitácora</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-bold text-slate-600">
                  {pagosHistoricos.filter(p => {
                    const t = trabajadores.find(trab => trab.id === p.trabajador_id);
                    return t && (t.tipo_pago || 'Sábado (Jornalero)') === subTabLiquidacion;
                  }).length === 0 ? (
                    <tr><td colSpan="7" className="p-4 text-center text-gray-400 italic">No se registran pagos archivados en esta modalidad.</td></tr>
                  ) : (
                    pagosHistoricos.filter(p => {
                      const t = trabajadores.find(trab => trab.id === p.trabajador_id);
                      return t && (t.tipo_pago || 'Sábado (Jornalero)') === subTabLiquidacion;
                    }).map(p => {
                      const t = trabajadores.find(trab => trab.id === p.trabajador_id);
                      return (
                        <tr key={p.id} className="bg-emerald-50/20 hover:bg-emerald-50 transition-colors">
                          <td className="p-3 font-black text-slate-800 uppercase border-l-4 border-emerald-600">{t?.nombre_completo}</td>
                          <td className="p-3 text-center font-black text-[#117097]">{p.fecha_pago}</td>
                          <td className="p-3 text-right text-slate-700 font-bold">{formatoPesos(p.monto_devengado || p.monto_pagado)}</td>
                          <td className="p-3 text-right text-red-500 font-bold">-{formatoPesos(p.monto_vales || 0)}</td>
                          <td className="p-3 text-right text-emerald-700 font-black text-xs bg-slate-50/20">{formatoPesos(p.monto_pagado)}</td>
                          <td className="p-3 text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[8px] font-black tracking-widest uppercase">PAGADO ✓</span></td>
                          <td className="p-3 text-center">
                            <button type="button" onClick={() => generarComprobanteNominaPDF({ id: p.trabajador_id, nombre: t?.nombre_completo, cedula: t?.cedula, tipo_pago: subTabLiquidacion, netoPagar: p.monto_pagado, totalGanado: p.monto_devengado || p.monto_pagado, totalVales: p.monto_vales || 0, dias_respaldo: p.dias_liquidados }, p.fecha_pago)} className="px-2 py-1 bg-slate-700 text-white rounded hover:bg-black text-[9px] font-black">🖨️ COPIA PDF</button>
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
      )}

      {tabInterna === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-[#117097]">
            <h3 className="font-black text-slate-800 uppercase text-xs italic mb-5">👤 Ingresar Nuevo Trabajador</h3>
            <form onSubmit={registrarTrabajador} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Nombre Completo</label>
                <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-sm uppercase outline-none focus:border-[#117097]" value={formTrabajador.nombre_completo} onChange={e => setFormTrabajador({...formTrabajador, nombre_completo: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Cédula</label>
                  <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-[#117097]" value={formTrabajador.cedula} onChange={e => setFormTrabajador({...formTrabajador, cedula: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Teléfono</label>
                  <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-[#117097]" value={formTrabajador.telefono} onChange={e => setFormTrabajador({...formTrabajador, telefono: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Frecuencia de Pago</label>
                  <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs outline-none focus:border-[#117097]" value={formTrabajador.tipo_pago} onChange={e => setFormTrabajador({...formTrabajador, tipo_pago: e.target.value})}>
                    {tiposPago.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">{formTrabajador.tipo_pago === 'Quincenal (Fijo)' ? 'Sueldo Quincenal' : 'Tarifa Jornal Diario'}</label>
                  <input type="number" className="w-full border-2 p-2.5 rounded-xl font-black text-sm text-slate-800 outline-none focus:border-[#117097]" value={formTrabajador.pago_jornal_base} onChange={e => setFormTrabajador({...formTrabajador, pago_jornal_base: e.target.value})} required />
                </div>
              </div>
              <button type="submit" className="w-full py-3.5 text-white font-black rounded-xl uppercase text-xs tracking-wider shadow-md bg-[#117097] hover:bg-[#0a4c68]">💾 Guardar Colaborador</button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            <div className="p-4 bg-slate-800 text-white font-black text-xs flex justify-between items-center">
              <span>Directorio Interno de Operarios</span>
            </div>
            <div className="divide-y-2 divide-gray-200 max-h-[480px] overflow-y-auto">
              {trabajadores.map((t) => (
                <div key={t.id} className="p-4 flex justify-between items-center text-xs font-bold bg-white">
                  <div>
                    <p className="font-black text-slate-900 text-sm uppercase">{t.nombre_completo}</p>
                    <span className="inline-block mt-1 bg-sky-100 text-[#117097] text-[8px] px-2 py-0.5 rounded font-black uppercase">{t.tipo_pago || 'Sábado (Jornalero)'}</span>
                  </div>
                  <div className="text-right bg-slate-100 px-3 py-1.5 rounded-xl border">
                    <p className="text-slate-400 font-black text-[8px] uppercase">{t.tipo_pago === 'Quincenal (Fijo)' ? 'Sueldo Fijo' : 'Jornal'}</p>
                    <p className="font-black text-slate-800 text-xs mt-0.5">{formatoPesos(t.pago_jornal_base)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}