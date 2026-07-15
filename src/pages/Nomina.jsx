import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Nomina({ mostrarAlerta, listaInvernaderos }) {
  // Estados de control de datos
  const [trabajadores, setTrabajadores] = useState([]);
  const [jornalesPendientes, setJornalesPendientes] = useState([]);
  const [valesPendientes, setValesPendientes] = useState([]);
  const [tabInterna, setTabInterna] = useState('planilla'); 
  const [cargando, setCargando] = useState(false);

  // MEMORIA LOCAL: Almacena los IDs de los operarios pagados en la sesión del sábado
  const [idsLiquidadosHoy, setIdsLiquidadosHoy] = useState([]);

  // Estados para formularios
  const [formTrabajador, setFormTrabajador] = useState({ id_editando: null, nombre_completo: '', cedula: '', telefono: '', pago_jornal_base: '' });
  const [formJornal, setFormJornal] = useState({ id_editando: null, trabajador_id: '', fecha_labor: new Date().toISOString().split('T')[0], invernadero_id: '', tipo_labor: 'JORNAL', valor_pagar: '', observaciones: '' });
  const [formVale, setFormVale] = useState({ id_editando: null, trabajador_id: '', fecha_vale: new Date().toISOString().split('T')[0], monto_vale: '', motivo_nota: '' });

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

  // --- 2. OPERACIONES: TRABAJADORES ---
  const registrarTrabajador = async (e) => {
    e.preventDefault();
    const payload = {
      nombre_completo: formTrabajador.nombre_completo.toUpperCase().trim(),
      cedula: formTrabajador.cedula.trim(),
      telefono: formTrabajador.telefono.trim(),
      pago_jornal_base: parseFloat(formTrabajador.pago_jornal_base) || 0
    };

    try {
      let error;
      if (formTrabajador.id_editando) {
        const res = await supabase.from('nomina_trabajadores').update(payload).eq('id', formTrabajador.id_editando);
        error = res.error;
      } else {
        const res = await supabase.from('nomina_trabajadores').insert([payload]);
        error = res.error;
      }

      if (error) throw error;
      mostrarAlerta(formTrabajador.id_editando ? "Trabajador actualizado" : "Trabajador registrado", "exito");
      limpiarFormTrabajador();
      await cargarDatosNomina();
    } catch (err) { mostrarAlerta("Error o cédula duplicada", "error"); }
  };

  const prepararEdicionTrabajador = (item) => {
    setFormTrabajador({
      id_editando: item.id,
      nombre_completo: item.nombre_completo,
      cedula: item.cedula,
      telefono: item.telefono || '',
      pago_jornal_base: item.pago_jornal_base
    });
    setTabInterna('personal');
  };

  const eliminarTrabajadorLogico = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de inactivar a ${nombre}? No aparecerá en las planillas diarias.`)) {
      const { error } = await supabase.from('nomina_trabajadores').update({ activo: false }).eq('id', id);
      if (error) mostrarAlerta("No se pudo inactivar", "error");
      else {
        mostrarAlerta("Trabajador inactivado con éxito");
        await cargarDatosNomina();
      }
    }
  };

  const limpiarFormTrabajador = () => setFormTrabajador({ id_editando: null, nombre_completo: '', cedula: '', telefono: '', pago_jornal_base: '' });

  // --- 3. OPERACIONES: JORNALES ---
  const registrarJornalDiario = async (e) => {
    e.preventDefault();
    if (!formJornal.trabajador_id) return;
    
    let valorFinal = parseFloat(formJornal.valor_pagar);
    if (!valorFinal) {
      const operario = trabajadores.find(t => t.id === formJornal.trabajador_id);
      valorFinal = operario ? operario.pago_jornal_base : 0;
    }

    const payload = {
      trabajador_id: formJornal.trabajador_id,
      fecha_labor: formJornal.fecha_labor,
      invernadero_id: formJornal.invernadero_id || null,
      tipo_labor: formJornal.tipo_labor.toUpperCase().trim(),
      valor_pagar: valorFinal,
      observaciones: formJornal.observaciones ? formJornal.observaciones.toUpperCase().trim() : null
    };

    try {
      let error;
      if (formJornal.id_editando) {
        const res = await supabase.from('nomina_jornales').update(payload).eq('id', formJornal.id_editando);
        error = res.error;
      } else {
        const res = await supabase.from('nomina_jornales').insert([payload]);
        error = res.error;
      }

      if (error) throw error;
      mostrarAlerta(formJornal.id_editando ? "Jornal actualizado" : "Asistencia cargada", "exito");
      limpiarFormJornal();
      await cargarDatosNomina();
    } catch (err) { mostrarAlerta("Error al registrar jornal", "error"); }
  };

  const ArrayPreLiquidacionEstatica = [];

  const prepararEdicionJornal = (item) => {
    setFormJornal({
      id_editando: item.id,
      trabajador_id: item.trabajador_id,
      fecha_labor: item.fecha_labor,
      invernadero_id: item.invernadero_id || '',
      tipo_labor: item.tipo_labor,
      valor_pagar: item.valor_pagar,
      observaciones: item.observaciones || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarJornal = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este registro de asistencia?")) {
      const { error } = await supabase.from('nomina_jornales').delete().eq('id', id);
      if (error) mostrarAlerta("Error al borrar registro", "error");
      else {
        mostrarAlerta("Asistencia eliminada de la planilla");
        await cargarDatosNomina();
      }
    }
  };

  const limpiarFormJornal = () => setFormJornal({ id_editando: null, trabajador_id: '', fecha_labor: new Date().toISOString().split('T')[0], invernadero_id: '', tipo_labor: 'JORNAL', valor_pagar: '', observaciones: '' });

  // --- 4. OPERACIONES: VALES ---
  const registrarValeAdelanto = async (e) => {
    e.preventDefault();
    const monto = parseFloat(formVale.monto_vale);
    if (!formVale.trabajador_id || monto <= 0) return;

    const payload = {
      trabajador_id: formVale.trabajador_id,
      fecha_vale: formVale.fecha_vale,
      monto_vale: monto,
      motivo_nota: formVale.motivo_nota.toUpperCase().trim()
    };

    try {
      let error;
      if (formVale.id_editando) {
        const res = await supabase.from('nomina_vales').update(payload).eq('id', formVale.id_editando);
        error = res.error;
      } else {
        const res = await supabase.from('nomina_vales').insert([payload]);
        error = res.error;
      }

      if (error) throw error;
      mostrarAlerta(formVale.id_editando ? "Vale modificado" : "Vale de adelanto autorizado", "exito");
      limpiarFormVale();
      await cargarDatosNomina();
    } catch (err) { mostrarAlerta("Error al registrar el vale", "error"); }
  };

  const prepararEdicionVale = (item) => {
    setFormVale({
      id_editando: item.id,
      trabajador_id: item.trabajador_id,
      fecha_vale: item.fecha_vale,
      monto_vale: item.monto_vale,
      motivo_nota: item.motivo_nota
    });
  };

  const eliminarVale = async (id) => {
    if (window.confirm("¿Estás seguro de anular este vale de adelanto?")) {
      const { error } = await supabase.from('nomina_vales').delete().eq('id', id);
      if (error) mostrarAlerta("Error al anular vale", "error");
      else {
        mostrarAlerta("Vale de adelanto eliminado");
        await cargarDatosNomina();
      }
    }
  };

  const limpiarFormVale = () => setFormVale({ id_editando: null, trabajador_id: '', fecha_vale: new Date().toISOString().split('T')[0], monto_vale: '', motivo_nota: '' });

  // --- 5. ALGORITMO INTEGRAL DE LIQUIDACIÓN ---
  const calcularPreLiquidacion = () => {
    const listado = trabajadores.map(t => {
      const jornalesObrero = jornalesPendientes.filter(j => j.trabajador_id === t.id);
      const valesObrero = valesPendientes.filter(v => v.trabajador_id === t.id);

      const totalGanado = jornalesObrero.reduce((acc, j) => acc + parseFloat(j.valor_pagar || 0), 0);
      const totalVales = valesObrero.reduce((acc, v) => acc + parseFloat(v.monto_vale || 0), 0);
      const netoPagar = totalGanado - totalVales;

      // Si ya se le dio click a pagar en esta sesión, forzamos que mantenga sus datos congelados en la fila
      const yaLiquidadoLocal = idsLiquidadosHoy.includes(t.id);

      return {
        id: t.id,
        nombre: t.nombre_completo,
        cedula: t.cedula || 'N/R',
        telefono: t.telefono || 'N/R',
        diasTrabajados: jornalesObrero.length,
        totalGanado,
        totalVales,
        netoPagar,
        pagadoLocal: yaLiquidadoLocal
      };
    });

    // Mantenemos visible la fila si tiene días laborados, vales, O si ya fue pagado localmente hoy
    return listado.filter(l => l.diasTrabajados > 0 || l.totalVales > 0 || l.pagadoLocal === true);
  };

  // --- FUNCIÓN RECIBO PDF NOMINA ---
  const generarComprobanteNominaPDF = (item) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [105, 148] });

    doc.setDrawColor(112, 173, 71); doc.setLineWidth(0.8); doc.rect(4, 4, 97, 140);
    try { doc.addImage('/Logopapel.png', 'PNG', 42.5, 6, 20, 20); } catch (e) {}

    const fechaHoy = new Date().toISOString().split('T')[0];
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
    doc.text(`Comp. N°: NOM-${String(item.id).substring(0, 4).toUpperCase()}`, 6, 11);

    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(40, 80, 40);
    doc.text("COMPROBANTE DE PAGO", 52.5, 29, { align: "center" });

    const yBase = 33;
    doc.setFillColor(242, 242, 242); doc.rect(6, yBase, 93, 5, 'F'); doc.rect(6, yBase + 10, 93, 5, 'F');
    doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.2); doc.rect(6, yBase, 93, 15);
    doc.line(6, yBase + 5, 99, yBase + 5); doc.line(6, yBase + 10, 99, yBase + 10); doc.line(52, yBase, 52, yBase + 5);

    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(0);
    doc.text("Fecha Liquidación:", 7, yBase + 3.5);
    doc.setFont("helvetica", "normal"); doc.text(fechaHoy, 30, yBase + 3.5);
    doc.setFont("helvetica", "bold"); doc.text("Invernadero:", 53, yBase + 3.5);
    doc.setFont("helvetica", "normal"); doc.text("VARIOS / INVERNADERO", 69, yBase + 3.5);
    doc.setFont("helvetica", "bold"); doc.text("Colaborador:", 7, yBase + 8.5);
    doc.setFont("helvetica", "normal"); doc.text(item.nombre, 23, yBase + 8.5);
    doc.setFont("helvetica", "bold"); doc.text("NIT / CC:", 7, yBase + 13.5);
    doc.setFont("helvetica", "normal"); doc.text(item.cedula, 19, yBase + 13.5);
    doc.setFont("helvetica", "bold"); doc.text("TEL:", 53, yBase + 13.5);
    doc.setFont("helvetica", "normal"); doc.text(item.telefono, 60, yBase + 13.5);

    const filasTabla = [[
      `${item.diasTrabajados || '---'}`,
      "Días",
      "JORNALES LABORADOS ACUMULADOS",
      "",
      `+${formatoPesos(item.totalGanado || item.montoRetro)}`
    ]];

    if (item.totalVales > 0) {
      filasTabla.push(["1", "Global", "DESCUENTO DE VALES / ADELANTOS", "", `-${formatoPesos(item.totalVales)}`]);
    }

    autoTable(doc, {
      startY: yBase + 18, margin: { left: 6, right: 6 },
      head: [["Cant.", "Unidad", "Detalle del Pago", "Precio Unit.", "Monto Total"]], body: filasTabla, theme: 'grid',
      styles: { font: 'helvetica', fontSize: 6.5, cellPadding: 1.5, lineWidth: 0.1, lineColor: [210, 210, 210] },
      headStyles: { fillColor: [112, 173, 71], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 12, halign: 'center' }, 2: { cellWidth: 43, halign: 'left' }, 3: { cellWidth: 13, halign: 'right' }, 4: { cellWidth: 15, halign: 'right' } }
    });

    const yTotal = doc.lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(0);
    doc.text("VALOR PAGADO:", 45, yTotal);
    doc.text(formatoPesos(item.netoPagar || item.montoRetro), 99, yTotal, { align: 'right' });

    const yFirmas = yTotal + 16;
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    doc.line(8, yFirmas, 48, yFirmas); doc.line(56, yFirmas, 96, yFirmas);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7);
    doc.text("ENTREGUÉ CONFORME", 28, yFirmas + 4, { align: "center" });
    doc.text("RECIBÍ CONFORME", 76, yFirmas + 4, { align: "center" });

    doc.save(`RECIBO_NOMINA_${item.nombre.replace(/ /g, "_")}.pdf`);
  };

  // --- 6. PROCESAR LIQUIDACIÓN EN BLOQUE (SÓLO ASENTA EL PAGO SIN REPETIR PDF) ---
  const pagarNominaTrabajador = async (item) => {
    if (!window.confirm(`¿Confirmas el asentamiento de pago definitivo en bitácora para ${item.nombre}?`)) return;

    try {
      // 1. Guardamos el ID del operario en la memoria de la sesión local ANTES de refrescar la DB
      setIdsLiquidadosHoy(prev => [...prev, item.id]);

      // 2. Marcamos las relaciones como liquidadas en el backend
      const [resJornales, resVales] = await Promise.all([
        supabase.from('nomina_jornales').update({ liquidado: true }).eq('trabajador_id', item.id).eq('liquidado', false),
        supabase.from('nomina_vales').update({ descontado: true }).eq('trabajador_id', item.id).eq('descontado', false)
      ]);

      if (resJornales.error) throw resJornales.error;
      if (resVales.error) throw resVales.error;

      mostrarAlerta(`Pago de ${item.nombre} asentado correctamente`, "exito");
      
      // 3. Sincronizamos los totales con Supabase
      await cargarDatosNomina();

    } catch (err) {
      console.error("Error en liquidación:", err);
      mostrarAlerta("Hubo un error al cerrar cuentas en el servidor", "error");
    }
  };

  const listaLiquidacion = calcularPreLiquidacion();
  const invernaderosActivos = listaInvernaderos?.filter(inv => inv.activo !== false) || [];

  return (
    <div className="space-y-6 pb-20">
      {/* MENÚ DE ACCESO INTERNO */}
      <div className="flex gap-2 border-b-2 border-gray-200 pb-2 overflow-x-auto">
        <button onClick={() => setTabInterna('planilla')} className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${tabInterna === 'planilla' ? 'bg-green-800 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>📅 Planilla Diaria / Vales</button>
        <button onClick={() => setTabInterna('liquidacion')} className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${tabInterna === 'liquidacion' ? 'bg-amber-700 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>💰 Liquidar Sábado ({listaLiquidacion.length})</button>
        <button onClick={() => setTabInterna('personal')} className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${tabInterna === 'personal' ? 'bg-slate-800 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>👥 Registro de Trabajadores</button>
      </div>

      {/* PESTAÑA 1: PLANILLA Y REGISTRO DIARIO */}
      {tabInterna === 'planilla' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ASISTENCIA */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-green-800">
              <h3 className="font-black text-slate-800 uppercase text-xs italic mb-4">
                {formJornal.id_editando ? '📝 Editar Asistencia Semanal' : '📝 Asistencia y Labores por Invernadero'}
              </h3>
              <form onSubmit={registrarJornalDiario} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Fecha de Labor</label>
                    <input type="date" className="w-full border-2 p-2.5 rounded-xl font-bold text-sm outline-none focus:border-green-800" value={formJornal.fecha_labor} onChange={e => setFormJornal({...formJornal, fecha_labor: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Invernadero</label>
                    <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs outline-none focus:border-green-800" value={formJornal.invernadero_id} onChange={e => setFormJornal({...formJornal, invernadero_id: e.target.value})}>
                      <option value="">GENERAL / TODA EL INVERNADERO</option>
                      {invernaderosActivos.map(inv => <option key={inv.id} value={inv.id}>{inv.nombre?.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Seleccione Trabajador</label>
                  <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs uppercase outline-none focus:border-green-800" value={formJornal.trabajador_id} onChange={e => setFormJornal({...formJornal, trabajador_id: e.target.value})} required>
                    <option value="">Seleccione operario...</option>
                    {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre_completo} (Tarifa Base: {formatoPesos(t.pago_jornal_base)})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Tipo de Labor</label>
                    <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase outline-none focus:border-green-800" value={formJornal.tipo_labor} onChange={e => setFormJornal({...formJornal, tipo_labor: e.target.value})} placeholder="JORNAL / CONTRATO" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Tarifa Especial (COP)</label>
                    <input type="number" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-green-800" value={formJornal.valor_pagar} onChange={e => setFormJornal({...formJornal, valor_pagar: e.target.value})} placeholder="Vacío = Usa tarifa base" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Detalle / Notas de Actividad</label>
                  <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase outline-none focus:border-green-800" value={formJornal.observaciones} onChange={e => setFormJornal({...formJornal, observaciones: e.target.value})} placeholder="Ej: Amarre de plantas o deshierbe" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className={`flex-1 py-3.5 text-white font-black rounded-xl uppercase text-xs tracking-wider shadow-md transition-colors ${formJornal.id_editando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-800 hover:bg-green-900'}`}>
                    {formJornal.id_editando ? '💾 Actualizar Jornal' : '✓ Cargar Jornal en Planilla'}
                  </button>
                  {formJornal.id_editando && <button type="button" onClick={limpiarFormJornal} className="px-4 bg-gray-200 rounded-xl font-black text-xs text-gray-600">X</button>}
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-slate-700 p-2.5 text-white font-black text-[10px] uppercase tracking-wider pl-4">Planilla Acumulada de la Semana</div>
              <div className="max-h-56 overflow-y-auto text-[10px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 font-black uppercase text-slate-500 sticky top-0 border-b border-gray-300">
                      <th className="p-3 w-5/12">Operario</th>
                      <th className="p-3 w-3/12">Invernadero</th>
                      <th className="p-3 w-2/12 text-right pr-4">Valor</th>
                      <th className="p-3 w-2/12 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-bold text-slate-600">
                    {jornalesPendientes.length === 0 ? (
                      <tr><td colSpan="4" className="p-4 text-center text-gray-400 italic">No hay jornales cargados esta semana</td></tr>
                    ) : (
                      jornalesPendientes.map(j => (
                        <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-slate-900 uppercase truncate max-w-[150px]">{j.nomina_trabajadores?.nombre_completo}</td>
                          <td className="p-3 uppercase text-slate-400 truncate max-w-[100px]">{j.invernaderos?.nombre || 'General'}</td>
                          <td className="p-3 text-right text-green-700 font-black text-xs pr-4">{formatoPesos(j.valor_pagar)}</td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => prepararEdicionJornal(j)} className="p-1.5 bg-amber-100 text-amber-700 rounded-md border border-amber-200 hover:bg-amber-600 hover:text-white transition-colors"><span className="text-xs">✏️</span></button>
                              <button onClick={() => eliminarJornal(j.id)} className="p-1.5 bg-red-100 text-red-700 rounded-md border border-red-200 hover:bg-red-700 hover:text-white transition-colors"><span className="text-xs">🗑️</span></button>
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

          {/* VALES */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-amber-600 h-fit">
              <h3 className="font-black text-slate-800 uppercase text-xs italic mb-4">
                {formVale.id_editando ? '📝 Modificar Vale / Adelanto' : '🎟️ Registrar Vales, Adelantos y Descuentos'}
              </h3>
              <form onSubmit={registrarValeAdelanto} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Fecha Vale</label>
                    <input type="date" className="w-full border-2 p-2.5 rounded-xl font-bold text-sm outline-none focus:border-amber-600" value={formVale.fecha_vale} onChange={e => setFormVale({...formVale, fecha_vale: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Monto Adelantado (COP)</label>
                    <input type="number" className="w-full border-2 p-2.5 rounded-xl font-black text-green-700 text-sm outline-none focus:border-amber-600" value={formVale.monto_vale} onChange={e => setFormVale({...formVale, monto_vale: e.target.value})} placeholder="Ej: 50000" required />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Trabajador Beneficiario</label>
                  <select className="w-full border-2 p-2.5 rounded-xl font-bold bg-white text-xs uppercase outline-none focus:border-amber-600" value={formVale.trabajador_id} onChange={e => setFormVale({...formVale, trabajador_id: e.target.value})} required>
                    <option value="">Seleccione operario...</option>
                    {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Motivo del Adelanto</label>
                  <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase outline-none focus:border-amber-600" value={formVale.motivo_nota} onChange={e => setFormVale({...formVale, motivo_nota: e.target.value})} placeholder="Ej: Avance o abono a quincena" required />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-3.5 text-white font-black rounded-xl uppercase text-xs tracking-wider shadow-md transition-colors bg-amber-600 hover:bg-amber-700">
                    {formVale.id_editando ? '💾 Guardar Modificación' : '💸 Registrar Adelanto / Descuento'}
                  </button>
                  {formVale.id_editando && <button type="button" onClick={limpiarFormVale} className="px-4 bg-gray-200 rounded-xl font-black text-xs text-gray-600">X</button>}
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-slate-700 p-2.5 text-white font-black text-[10px] uppercase tracking-wider pl-4">Vales y Descuentos Cruzados de la Semana</div>
              <div className="max-h-56 overflow-y-auto text-[10px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 font-black uppercase text-slate-500 sticky top-0 border-b border-gray-300">
                      <th className="p-3 w-5/12">Operario</th>
                      <th className="p-3 w-3/12">Concepto</th>
                      <th className="p-3 w-2/12 text-right pr-4">Monto</th>
                      <th className="p-3 w-2/12 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-bold text-slate-600">
                    {valesPendientes.length === 0 ? (
                      <tr><td colSpan="4" className="p-4 text-center text-gray-400 italic">Sin vales emitidos en la semana</td></tr>
                    ) : (
                      valesPendientes.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-slate-900 uppercase truncate max-w-[150px]">{v.nomina_trabajadores?.nombre_completo}</td>
                          <td className="p-3 uppercase text-slate-400 truncate max-w-[100px]">{v.motivo_nota}</td>
                          <td className="p-3 text-right text-red-600 font-black text-xs pr-4">-{formatoPesos(v.monto_vale)}</td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => prepararEdicionVale(v)} className="p-1.5 bg-amber-100 text-amber-700 rounded-md border border-amber-200 hover:bg-amber-600 hover:text-white transition-colors"><span className="text-xs">✏️</span></button>
                              <button onClick={() => eliminarVale(v.id)} className="p-1.5 bg-red-100 text-red-700 rounded-md border border-red-200 hover:bg-red-700 hover:text-white transition-colors"><span className="text-xs">🗑️</span></button>
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
      )}

      {/* PESTAÑA 2: ASISTENTE DE LIQUIDACIÓN DE SÁBADO (CON MEMORIA DE CONCHULITO VERDE) */}
      {tabInterna === 'liquidacion' && (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-4 bg-amber-700 text-white font-black text-xs uppercase tracking-widest italic flex justify-between items-center">
            <span>Asistente Central de Cierre de Cuentas (Sábado)</span>
            <button
              onClick={() => {
                if (window.confirm("¿Está seguro de iniciar una nueva semana? Esto borrará el registro visual de los ya liquidados para comenzar de cero.")) {
                  setIdsLiquidadosHoy([]);
                  cargarDatosNomina();
                  mostrarAlerta("Mesa lista para capturar asistencia de la nueva semana", "exito");
                }
              }}
              className="px-3 py-1.5 bg-amber-950 hover:bg-black text-white text-[10px] font-black uppercase rounded-lg transition-colors border border-amber-900/50"
            >
              🧹 Iniciar Nueva Semana
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-gray-300 text-slate-800 uppercase font-black border-b-2 border-gray-400">
                  <th className="p-4">Trabajador / Colaborador</th>
                  <th className="p-4 text-center">Días Laborados</th>
                  <th className="p-4 text-right">Total Ganado (+)</th>
                  <th className="p-4 text-right">Vales / Adelantos (-)</th>
                  <th className="p-4 text-right">Neto Efectivo a Pagar (=)</th>
                  <th className="p-4 text-center">Acción Sábado</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-400 font-bold text-slate-700">
                {listaLiquidacion.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-400 italic font-bold">No hay labores registradas ni adelantos pendientes esta semana.</td></tr>
                ) : (
                  listaLiquidacion.map((item, idx) => {
                    const yaFuePagadoLocal = item.pagadoLocal;

                    return (
                      <tr 
                        key={item.id} 
                        className={`${
                          yaFuePagadoLocal 
                            ? 'bg-green-50/80 text-slate-400' 
                            : idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'
                        } hover:bg-yellow-50 transition-colors`}
                      >
                        <td className={`p-4 font-black uppercase border-l-8 ${yaFuePagadoLocal ? 'border-green-600 text-slate-500' : 'border-amber-700 text-slate-900'}`}>
                          {item.nombre} 
                          {yaFuePagadoLocal && <span className="text-[9px] text-green-600 font-black tracking-widest block mt-0.5 animate-pulse">✓ CUENTA LIQUIDADA EN BITÁCORA</span>}
                        </td>
                        <td className="p-4 text-center text-xs font-black">
                          <span className={`px-2 py-0.5 rounded-md ${yaFuePagadoLocal ? 'bg-gray-200 text-gray-400' : 'bg-slate-200 text-slate-800'}`}>
                            {yaFuePagadoLocal ? '0' : item.diasTrabajados} días
                          </span>
                        </td>
                        <td className={`p-4 text-right font-black text-xs ${yaFuePagadoLocal ? 'text-slate-400 line-through' : 'text-green-700'}`}>
                          {formatoPesos(item.totalGanado)}
                        </td>
                        <td className={`p-4 text-right font-black text-xs ${yaFuePagadoLocal ? 'text-slate-400 line-through' : 'text-red-600'}`}>
                          {formatoPesos(item.totalVales)}
                        </td>
                        <td className={`p-4 text-right font-black text-sm bg-gray-50/50 ${yaFuePagadoLocal ? 'text-green-700' : 'text-slate-900'}`}>
                          {yaFuePagadoLocal ? formatoPesos(0) : formatoPesos(item.netoPagar)}
                        </td>
                        
                        {/* ACCIONES DE BOTONES CONFIGURADOS */}
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            {/* BOTÓN IMPRIMIR PDF: Siempre lee la memoria de lo que acumuló */}
                            <button
                              type="button"
                              onClick={() => generarComprobanteNominaPDF(item)}
                              className="px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black uppercase rounded-lg hover:bg-black transition-colors flex items-center gap-1 shadow-md"
                              title="Imprimir Recibo con Firmas"
                            >
                              <span>🖨️ PDF</span>
                            </button>

                            {/* BOTÓN INTERACTIVO DE PAGO CON CONCHULITO VERDE */}
                            {yaFuePagadoLocal ? (
                              <span className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-black uppercase rounded-lg tracking-wider shadow-sm flex items-center gap-1 border border-green-700">
                                <span>PAGADO ✓</span>
                              </span>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => pagarNominaTrabajador(item)} 
                                className="px-3 py-1.5 bg-green-700 text-white text-[10px] font-black uppercase rounded-lg hover:bg-green-800 shadow transition-colors active:scale-95 font-black"
                              >
                                💵 PAGAR
                              </button>
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
      )}

      {/* PESTAÑA 3: DIRECTORIO DE OPERARIOS */}
      {tabInterna === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* REGISTRAR OPERARIO */}
          <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-slate-800 h-fit">
            <h3 className="font-black text-slate-800 uppercase text-xs italic mb-5">
              {formTrabajador.id_editando ? '📝 Editar Datos del Trabajador' : '👤 Ingresar Nuevo Trabajador'}
            </h3>
            <form onSubmit={registrarTrabajador} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Nombre Completo</label>
                <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-sm uppercase outline-none focus:border-slate-800" value={formTrabajador.nombre_completo} onChange={e => setFormTrabajador({...formTrabajador, nombre_completo: e.target.value})} required placeholder="Ej: CARLOS MARIO RESTREPO" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Cédula</label>
                  <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-slate-800" value={formTrabajador.cedula} onChange={e => setFormTrabajador({...formTrabajador, cedula: e.target.value})} required placeholder="Sin puntos" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Teléfono</label>
                  <input type="text" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-slate-800" value={formTrabajador.telefono} onChange={e => setFormTrabajador({...formTrabajador, telefono: e.target.value})} placeholder="Opcional" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Tarifa Base por Jornal Diario</label>
                <input type="number" className="w-full border-2 p-2.5 rounded-xl font-black text-sm text-slate-800 outline-none focus:border-slate-800" value={formTrabajador.pago_jornal_base} onChange={e => setFormTrabajador({...formTrabajador, pago_jornal_base: e.target.value})} required placeholder="Ej: 65000" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className={`flex-1 py-3.5 text-white font-black rounded-xl uppercase text-xs tracking-wider shadow-md transition-colors ${formTrabajador.id_editando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                  {formTrabajador.id_editando ? '💾 Actualizar Datos' : '💾 Guardar Colaborador'}
                </button>
                {formTrabajador.id_editando && <button type="button" onClick={limpiarFormTrabajador} className="px-4 bg-gray-200 rounded-xl font-black text-xs text-gray-600">X</button>}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            <div className="p-4 bg-slate-800 text-white font-black text-xs uppercase tracking-widest italic flex justify-between items-center">
              <span>Directorio Interno de Operarios</span>
              <span className="text-[10px] bg-slate-600 px-2 py-0.5 rounded-md">Activos</span>
            </div>
            <div className="divide-y-2 divide-gray-200 max-h-[480px] overflow-y-auto">
              {trabajadores.length === 0 ? (
                <div className="p-6 text-center text-gray-400 italic text-xs">No hay trabajadores activos registrados</div>
              ) : (
                trabajadores.map((t, idx) => (
                  <div key={t.id} className={`p-4 flex justify-between items-center text-xs font-bold hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <div className="uppercase">
                      <p className="font-black text-slate-900 text-sm">{t.nombre_completo}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">C.C. {t.cedula || 'N/A'} — Tel: {t.telefono || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        <p className="text-slate-400 font-black text-[8px] uppercase tracking-tighter">Jornal Diario</p>
                        <p className="font-black text-slate-800 text-xs mt-0.5">{formatoPesos(t.pago_jornal_base)}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => prepararEdicionTrabajador(t)} className="p-2 bg-amber-100 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-600 hover:text-white transition-colors">✏️</button>
                        <button onClick={() => eliminarTrabajadorLogico(t.id, t.nombre_completo)} className="p-2 bg-red-100 text-red-700 rounded-lg border border-red-200 hover:bg-red-600 hover:text-white transition-colors">🗑️</button>
                      </div>
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