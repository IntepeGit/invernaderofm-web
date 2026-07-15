import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function ReporteVentas({ listaInvernaderos, datosDespachos, datosEgresos, datosPagos }) {
  const [invSeleccionado, setInvSeleccionado] = useState('');
  const [historicoNomina, setHistoricoNomina] = useState([]);

  // Carga automática y dinámica de la tabla de nóminas de Supabase
  useEffect(() => {
    async function cargarNominaParaReporte() {
      try {
        const { data, error } = await supabase
          .from('nomina_jornales')
          .select('*, nomina_trabajadores(nombre_completo), invernaderos(nombre)');
        if (!error && data) {
          setHistoricoNomina(data);
        }
      } catch (err) {
        console.error("Error consultando nomina_jornales desde Reporte:", err);
      }
    }
    cargarNominaParaReporte();
  }, [datosEgresos]);

  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', currency: 'COP', minimumFractionDigits: 0 
  }).format(valor || 0);

  // 1. IDENTIFICACIÓN DE BLOQUES ACTIVOS
  const invernaderosActivos = listaInvernaderos?.filter(inv => inv.activo !== false) || [];
  const idsInvernaderosActivos = invernaderosActivos.map(inv => inv.id?.toString());

  // 2. FILTRADO DE MOVIMIENTOS POR SELECCIÓN DE INTERFAZ
  const despachosInv = datosDespachos?.filter(d => d.invernadero_id?.toString() === invSeleccionado) || [];
  const gastosInsumosInv = datosEgresos?.filter(g => g.invernadero_id?.toString() === invSeleccionado) || [];
  const nominaInv = historicoNomina?.filter(n => n.invernadero_id?.toString() === invSeleccionado) || [];
  
  const idsDespachos = despachosInv.map(d => d.id?.toString());
  const pagosInv = datosPagos?.filter(p => idsDespachos.includes(p.despacho_id?.toString())) || [];

  // 3. MATEMÁTICA PURA Y DINÁMICA ASOCIADA AL DASHBOARD
  const totalVentas = invSeleccionado 
    ? despachosInv.reduce((acc, d) => acc + parseFloat(d.total_venta || 0), 0)
    : (datosDespachos || []).filter(d => idsInvernaderosActivos.includes(d.invernadero_id?.toString())).reduce((acc, d) => acc + parseFloat(d.total_venta || 0), 0);

  const totalGastos = invSeleccionado
    ? gastosInsumosInv.reduce((acc, g) => acc + parseFloat(g.monto || 0), 0) + nominaInv.reduce((acc, n) => acc + parseFloat(n.valor_pagar || 0), 0)
    : (datosEgresos || []).reduce((acc, g) => acc + parseFloat(g.monto || 0), 0) + (historicoNomina || []).reduce((acc, n) => acc + parseFloat(n.valor_pagar || 0), 0);

  const pagosRecibidos = invSeleccionado
    ? pagosInv.reduce((acc, p) => acc + parseFloat(p.monto || 0), 0)
    : (datosPagos || []).reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);

  const utilidadNeta = totalVentas - totalGastos;
  const margen = totalVentas > 0 ? ((utilidadNeta / totalVentas) * 100).toFixed(1) : 0;
  const cuentasPorCobrar = totalVentas - pagosRecibidos;

  const dataGrafica = [
    { name: 'Gastos', valor: totalGastos, color: '#ef4444' },
    { name: 'Ventas', valor: totalVentas, color: '#22c55e' },
    { name: 'Utilidad', valor: utilidadNeta, color: '#3b82f6' }
  ];

  // --- 📊 FUNCIÓN EXPORTAR A EXCEL ---
  const exportarReporteAExcel = async () => {
    const despachosAExportar = invSeleccionado ? despachosInv : (datosDespachos || []).filter(d => idsInvernaderosActivos.includes(d.invernadero_id?.toString()));
    const gastosInsumosAExportar = invSeleccionado ? gastosInsumosInv : (datosEgresos || []);
    const nominaAExportar = invSeleccionado ? nominaInv : (historicoNomina || []);

    const nombreBloque = invSeleccionado 
      ? listaInvernaderos.find(inv => inv.id?.toString() === invSeleccionado)?.nombre || 'BLOQUE'
      : 'CONSOLIDADO_GENERAL';

    try {
      const workbook = new ExcelJS.Workbook();
      
      // =======================================================
      // HOJA 1: RESUMEN FINANCIERO
      // =======================================================
      const wsResumen = workbook.addWorksheet('Resumen Financiero');
      wsResumen.columns = [
        { header: 'CONCEPTO FINANCIERO', key: 'concepto', width: 38 },
        { header: 'VALOR TOTAL (COP)', key: 'valor', width: 25 }
      ];

      wsResumen.addRows([
        { concepto: 'VENTAS TOTALES (INGRESOS)', valor: totalVentas },
        { concepto: 'GASTOS TOTALES (CON MANO DE OBRA)', valor: totalGastos }, 
        { concepto: 'UTILIDAD NETA OPERACIONAL', valor: utilidadNeta },
        { concepto: 'MARGEN DE RENDIMIENTO', valor: totalVentas > 0 ? (utilidadNeta / totalVentas) : 0 },
        { concepto: 'TOTAL RECAUDADO (CAJA DE COBRO)', valor: pagosRecibidos },
        { concepto: 'CUENTAS POR COBRAR (CARTERA PENDIENTE)', valor: cuentasPorCobrar }
      ]);

      // Estilos Hoja Resumen
      const headerRow1 = wsResumen.getRow(1);
      headerRow1.height = 24;
      headerRow1.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      wsResumen.eachRow((row, idx) => {
        if (idx === 1) return;
        row.height = 22;
        row.getCell(1).font = { name: 'Arial', size: 10, bold: true };
        row.getCell(2).font = { name: 'Arial', size: 11, bold: true };
        if (idx === 2) row.getCell(2).font.color = { argb: 'FF15803D' };
        if (idx === 3) row.getCell(2).font.color = { argb: 'FFB91C1C' };
        if (idx === 4) row.getCell(2).font.color = { argb: 'FF1D4ED8' };

        if (idx === 5) {
          row.getCell(2).numFmt = '0.0%';
          row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          row.getCell(2).numFmt = '"$"#,##0';
          row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });

      // =======================================================
      // HOJA 2: DETALLE DE VENTAS
      // =======================================================
      const wsVentas = workbook.addWorksheet('Detalle Ventas');
      wsVentas.columns = [
        { header: 'FECHA VENTA', key: 'fecha', width: 15 },
        { header: 'REMISIÓN N°', key: 'remision', width: 15 },
        { header: 'INVERNADERO', key: 'inv', width: 18 },
        { header: 'CLIENTE', key: 'cliente', width: 25 },
        { header: 'VALOR DESPACHO', key: 'total', width: 20 }
      ];
      despachosAExportar.forEach(d => {
        wsVentas.addRow({
          fecha: d.fecha_venta || '',
          remision: d.numero_remision || 'S/N',
          inv: (d.invernaderos?.nombre || 'General').toUpperCase(),
          cliente: (d.clientes?.nombre_completo || 'Particular').toUpperCase(),
          total: parseFloat(d.total_venta || 0)
        });
      });

      // 🌟 FILA DE CIERRE TOTALIZADORA (HOJA 2)
      const ultimaFilaVentas = wsVentas.rowCount;
      const filaTotalVentas = wsVentas.addRow({
        fecha: '', remision: '', inv: '',
        cliente: 'TOTAL GENERAL VENTAS:',
        total: { formula: `SUM(E2:E${ultimaFilaVentas})` }
      });
      filaTotalVentas.getCell('cliente').font = { name: 'Arial', size: 10, bold: true };
      filaTotalVentas.getCell('total').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF15803D' } };

      // =======================================================
      // HOJA 3: DETALLE GASTOS INSUMOS
      // =======================================================
      const wsGastos = workbook.addWorksheet('Detalle Gastos Insumos');
      wsGastos.columns = [
        { header: 'FECHA GASTO', key: 'fecha', width: 15 },
        { header: 'COMPROBANTE', key: 'doc', width: 18 },
        { header: 'INVERNADERO', key: 'inv', width: 18 },
        { header: 'CATEGORÍA', key: 'cat', width: 20 },
        { header: 'CONCEPTO / DETALLE', key: 'desc', width: 35 },
        { header: 'MONTO GASTO', key: 'monto', width: 20 }
      ];
      
      const esManoObra = (g) => g.categoria === 'Mano de obra' || g.categoria === 'Quincena';
      const soloInsumos = gastosInsumosAExportar.filter(g => !esManoObra(g));

      soloInsumos.forEach(g => {
        wsGastos.addRow({
          fecha: g.fecha_gasto || '',
          doc: g.numero_comprobante || 'S/N',
          inv: (g.invernaderos?.nombre || 'General').toUpperCase(),
          cat: (g.categoria || 'Varios').toUpperCase(),
          desc: (g.descripcion || '').toUpperCase(),
          monto: parseFloat(g.monto || 0)
        });
      });

      // 🌟 FILA DE CIERRE TOTALIZADORA (HOJA 3)
      const ultimaFilaGastos = wsGastos.rowCount;
      const filaTotalGastos = wsGastos.addRow({
        fecha: '', doc: '', inv: '', cat: '',
        desc: 'TOTAL GENERAL INSUMOS:',
        monto: { formula: `SUM(F2:F${ultimaFilaGastos})` }
      });
      filaTotalGastos.getCell('desc').font = { name: 'Arial', size: 10, bold: true };
      filaTotalGastos.getCell('monto').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFB91C1C' } };

      // =======================================================
      // HOJA 4: DETALLE MANO DE OBRA
      // =======================================================
      const wsManoObra = workbook.addWorksheet('Detalle Mano de Obra');
      wsManoObra.columns = [
        { header: 'FECHA REGISTRO', key: 'fechaMO', width: 15 },
        { header: 'INVERNADERO / BLOQUE', key: 'invNombre', width: 25 },
        { header: 'CONCEPTO / TRABAJADOR', key: 'tipo', width: 35 },
        { header: 'VALOR PROCESADO (COP)', key: 'montoMO', width: 22 }
      ];

      nominaAExportar.forEach(n => {
        const operario = n.nomina_trabajadores?.nombre_completo || n.tipo_labor || 'OPERARIO INVERNADERO';
        wsManoObra.addRow({
          fechaMO: n.fecha_pago || n.fecha || '',
          invNombre: (n.invernaderos?.nombre || 'General / Administrativo').toUpperCase(),
          tipo: String(operario).toUpperCase(),
          montoMO: parseFloat(n.valor_pagar || 0)
        });
      });

      // 🌟 FILA DE CIERRE TOTALIZADORA (HOJA 4)
      const ultimaFilaMO = wsManoObra.rowCount;
      const filaTotalMO = wsManoObra.addRow({
        fechaMO: '', invNombre: '',
        tipo: 'TOTAL GENERAL MANO DE OBRA:',
        montoMO: { formula: `SUM(D2:D${ultimaFilaMO})` }
      });
      filaTotalMO.getCell('tipo').font = { name: 'Arial', size: 10, bold: true };
      filaTotalMO.getCell('montoMO').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF6B21A8' } };


      // Formateo y estilos masivos de las grillas de datos (Hojas 2, 3 y 4)
      [wsVentas, wsGastos, wsManoObra].forEach(ws => {
        ws.getRow(1).height = 24;
        ws.getRow(1).eachCell(c => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
          c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          c.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        const totalRowsCount = ws.rowCount;

        ws.eachRow((row, idx) => {
          if (idx === 1) return;
          row.height = 20;
          
          // Estilo especial de Contabilidad para la fila final de Totales
          if (idx === totalRowsCount) {
            row.eachCell((cell) => {
              cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'double', color: { argb: 'FF000000' } } // 🌟 Doble línea clásica contable abajo
              };
            });
            row.getCell(ws.columnCount).numFmt = '"$"#,##0';
            row.getCell(ws.columnCount).alignment = { horizontal: 'right', vertical: 'middle' };
            return;
          }

          const esCebra = idx % 2 === 0;
          row.eachCell((cell, colNum) => {
            cell.font = { name: 'Arial', size: 9 };
            if (esCebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
            if (colNum === ws.columnCount) {
              cell.numFmt = '"$"#,##0';
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
            } else {
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
          });
        });
        
        // El auto-filtro ignora la última fila de totales para no dañar las búsquedas
        ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: totalRowsCount - 1, column: ws.columnCount } };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fechaHoy = new Date().toISOString().split('T')[0];
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `REPORTE_FINANCIERO_${nombreBloque}_${fechaHoy}.xlsx`);

    } catch (err) {
      console.error("Error al exportar reporte de ventas:", err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* SELECTOR UNIFICADO */}
      <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-green-700 space-y-4">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic px-1">Análisis de Invernadero / Bloque</label>
          <select 
            className="w-full border-2 p-3.5 rounded-2xl font-black text-slate-800 bg-white mt-2 outline-none focus:border-green-700 text-sm shadow-sm"
            value={invSeleccionado}
            onChange={(e) => setInvSeleccionado(e.target.value)}
          >
            <option value="">-- SELECCIONE UN INVERNADERO --</option>
            {listaInvernaderos.map(inv => <option key={inv.id} value={inv.id}>{inv.nombre}</option>)}
          </select>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={exportarReporteAExcel}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider border border-emerald-500 cursor-pointer"
          >
            📊 EXPORTAR A EXCEL TOTAL REPORTE DE VENTAS
          </button>
        </div>
      </div>

      {/* CARDS DINÁMICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-xl border-b-4 border-red-500 text-center flex flex-col justify-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider italic">Gastos Totales (Con Mano de Obra)</p>
          <p className="text-xl font-black text-red-600 mt-1">{formatoPesos(totalGastos)}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-xl border-b-4 border-green-600 text-center flex flex-col justify-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider italic">Ventas Totales</p>
          <p className="text-xl font-black text-green-700 mt-1">{formatoPesos(totalVentas)}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-xl border-b-4 border-blue-500 text-center flex flex-col justify-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider italic">Utilidad Neta</p>
          <p className="text-xl font-black text-blue-700 mt-1">{formatoPesos(utilidadNeta)}</p>
        </div>
        <div className="bg-slate-800 p-5 rounded-3xl shadow-xl text-center flex flex-col justify-center border-b-4 border-slate-900">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider italic">Margen de Rendimiento</p>
          <p className="text-2xl font-black text-white mt-1">{margen}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-xl h-64 border border-gray-100">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-4 italic tracking-wider">Comparativa de Rendimiento</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataGrafica}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontStyle: 'bold', fill: '#475569'}} />
              <YAxis hide />
              <Tooltip formatter={(value) => formatoPesos(value)} contentStyle={{borderRadius: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                {dataGrafica.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col justify-center h-64 border border-gray-100">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-5 italic tracking-wider">Estado General de Cartera</p>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-green-50 p-4 rounded-2xl border border-green-100 shadow-sm">
              <span className="text-[10px] font-black text-green-800 uppercase tracking-wider">Total Cobrado (Recaudos)</span>
              <span className="font-black text-green-700 text-sm">{formatoPesos(pagosRecibidos)}</span>
            </div>
            <div className="flex justify-between items-center bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-sm">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Por Cobrar (Cartera Pendiente)</span>
              <span className="font-black text-amber-700 text-sm">{formatoPesos(cuentasPorCobrar)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}