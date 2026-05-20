import React from 'react';
import { supabase } from '../lib/supabase';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // <-- ¡Esta es la línea clave que faltaba!

export default function Pagos({ 
  pagoForm, setPagoForm, listaClientes, datosDespachos, 
  datosPagos, mostrarAlerta, cargarTodo, 
  guardarPago, prepararEdicionPago, eliminarPago 
}) {

  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0 
  }).format(valor || 0);
  
// --- FUNCIÓN CONFIRMADA: EXPORTAR PAGOS EXCEL CON ESTILOS VISUALES ---
// --- FUNCIÓN CONFIRMADA Y SINCRONIZADA: EXPORTAR PAGOS EXCEL CON RELACIONES REALES ---
  const exportarPagosAExcel = async () => {
    if (!datosPagos || datosPagos.length === 0) {
      if (typeof mostrarAlerta === "function") {
        mostrarAlerta("No hay datos de pagos para exportar", "error");
      }
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Control de Pagos');

      // 1. Columnas en el orden estricto solicitado por William
      worksheet.columns = [
        { header: 'FECHA', key: 'fecha_despacho', width: 14 },
        { header: 'INVERNADERO', key: 'invernadero', width: 16 },
        { header: 'CLIENTE', key: 'cliente', width: 25 },
        { header: 'NIT / CC', key: 'nit', width: 16 },
        { header: 'N° DE REMISIÓN', key: 'remision', width: 18 },
        { header: 'VALOR INICIAL', key: 'valor_inicial', width: 18 },
        { header: 'FECHA ABONO', key: 'fecha_abono', width: 15 },
        { header: 'VALOR ABONO', key: 'valor_abono', width: 18 },
        { header: 'SALDO', key: 'saldo', width: 18 },
        { header: 'REFERENCIA / NOTA', key: 'nota', width: 35 }
      ];

      // 2. Mapear los datos extrayendo la información cruzada en tiempo real
      datosPagos.forEach((p) => {
        if (!p) return;

        // CRUCE INTELIGENTE: Buscamos la remisión original en datosDespachos usando despacho_id
        const despachoCoincidente = datosDespachos?.find(
          d => d.id?.toString() === p.despacho_id?.toString()
        );

        // --- FECHA DE LA REMISIÓN ORIGINAL (No la del abono) ---
        const fechaRemisionReal = despachoCoincidente?.fecha_venta || despachoCoincidente?.fecha || p.fecha_despacho || 'S/F';

        // --- INVERNADERO ---
        const invernaderoNom = despachoCoincidente?.invernaderos?.nombre || despachoCoincidente?.nombre_invernadero || 'GENERAL';

        // --- CLIENTE Y NIT_CC ---
        const clienteNom = despachoCoincidente?.clientes?.nombre_completo || p.clientes?.nombre_completo || p.nombre_cliente || 'PARTICULAR';
        const clienteNit = despachoCoincidente?.clientes?.nit_cc || p.clientes?.nit_cc || p.nit_cc || 'N/A';

        // --- N° DE REMISIÓN ---
        const numeroRemision = despachoCoincidente?.numero_remision || p.numero_remision || 'S/N';

        // --- VALORES MONETARIOS ---
        const valorInicial = parseFloat(despachoCoincidente?.total_venta || p.valor_inicial || 0);
        const valorAbono = parseFloat(p.monto || p.valor_abono || 0);
        
        // Cálculo exacto del saldo restante de la cartera para esa fila
        const saldoCalculado = valorInicial > 0 ? (valorInicial - valorAbono) : 0;

        worksheet.addRow({
          fecha_despacho: fechaRemisionReal ? String(fechaRemisionReal).split('T')[0] : '',
          invernadero: String(invernaderoNom).toUpperCase(),
          cliente: String(clienteNom).toUpperCase(),
          nit: clienteNit,
          remision: numeroRemision,
          valor_inicial: valorInicial,
          fecha_abono: p.fecha_pago ? String(p.fecha_pago).split('T')[0] : '', // Fecha del abono
          valor_abono: valorAbono,
          saldo: saldoCalculado,
          nota: String(p.referencia || p.nota || '').toUpperCase()
        });
      });

      // 3. Diseño de la Cabecera (Verde oliva corporativo)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        };
      });

      // 4. Diseño del Cuerpo (Formato Cebra e Inteligencia Numérica)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.height = 20;
        const esCebra = rowNumber % 2 === 0;

        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 9 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          };

          if (esCebra) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
          }

          if ([1, 4, 5, 7].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if ([6, 8, 9].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }

          if ([6, 8, 9].includes(colNumber)) {
            cell.numFmt = '"$"#,##0';
          }
        });
      });

      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: worksheet.rowCount, column: worksheet.columnCount }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const fechaHoy = new Date().toISOString().split('T')[0];
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(blob, `REPORTE_PAGOS_CARTERA_${fechaHoy}.xlsx`);
      
      if (typeof mostrarAlerta === "function") {
        mostrarAlerta("Reporte de cartera sincronizado y generado", "exito");
      }
    } catch (error) {
      console.error("Error al exportar Excel de Pagos:", error);
    }
  };  
// --- FIN FUNCIÓN EXPORTAR PAGOS FIN EXCEL ---

//--INICIO FUNCION IMPRIMIRRE RECIBO CARTERA
// --- REPORTE DE CARTERA ULTRA-SEGURO CON ESTRUCTURA REAL DE SUPABASE ---
  const imprimirReciboCarteraPDF = async (remisionData) => {
    try {
      // Capturamos el objeto activo seleccionado en la interfaz
      const remisionActiva = remisionData || remisionSeleccionada || {};
      
      if (!remisionActiva || Object.keys(remisionActiva).length === 0) {
        if (typeof mostrarAlerta === "function") {
          mostrarAlerta("Por favor, seleccione una remisión en la pantalla antes de imprimir", "error");
        }
        return;
      }

      // 1. EXTRAER IDENTIFICADORES BÁSICOS DE LA REMISIÓN
      const idVenta = remisionActiva.id; // ID primario (UUID) de la remisión/venta
      const nRemision = remisionActiva.numero_remision || 'S/N';
      
      // Datos de cabecera generales
      const clienteNom = remisionActiva.clientes?.nombre_completo || remisionActiva.nombre_cliente || 'ABASTOSJM';
      const clienteNit = remisionActiva.clientes?.nit_cc || remisionActiva.nit_cc || 'N/A';
      const invernaderoNom = remisionActiva.invernaderos?.nombre || remisionActiva.nombre_invernadero || 'GENERAL';
      const fechaDespacho = remisionActiva.fecha_venta || remisionActiva.fecha || '';
      const notaRef = remisionActiva.referencia || remisionActiva.nota || 'SIN OBSERVACIONES';
      
      // Valor total inicial de lo que se le cargó al cliente
      const valorTotalVenta = parseFloat(remisionActiva.total_venta || remisionActiva.total || 0);

      // ==========================================
      // 2. CONSULTA REAL A SUPABASE: PRODUCTOS DESPACHADOS
      // ==========================================
      let bodyProductos = [];
      
      const { data: productosDB, error: errorProd } = await supabase
        .from('detalles_ventas')
        .select('*')
        .eq('venta_id', idVenta); // venta_id es correcto según tu esquema

      if (!errorProd && productosDB && productosDB.length > 0) {
        bodyProductos = productosDB.map(item => {
          // Ajustado a tu columna real: 'descripcion'
          const nombreFormateado = String(item.descripcion || 'PRODUCTO').toUpperCase();
          const cantidadTexto = `${item.cantidad || 0} ${item.escala || item.unidad_medida || 'Unidad'}`;
          
          return [
            nombreFormateado,
            cantidadTexto,
            `$${parseFloat(item.subtotal || 0).toLocaleString('es-CO')}`
          ];
        });
      } else {
        // Fallback por si la relación directa en el objeto local ya tiene datos cargados
        const fallbackItems = remisionActiva.detalles_ventas || remisionActiva.items || [];
        if (fallbackItems.length > 0) {
          bodyProductos = fallbackItems.map(item => [
            String(item.descripcion || 'PRODUCTO').toUpperCase(),
            `${item.cantidad || 0} ${item.escala || 'Unidad'}`,
            `$${parseFloat(item.subtotal || 0).toLocaleString('es-CO')}`
          ]);
        } else {
          bodyProductos = [
            [`PRODUCTOS DE LA REMISIÓN N° ${nRemision}`, "1 Global", `$${valorTotalVenta.toLocaleString('es-CO')}`]
          ];
        }
      }

      // ==========================================
      // 3. CONSULTA REAL A SUPABASE: HISTORIAL DE ABONOS (CORREGIDO CON DESPACHO_ID)
      // ==========================================
      let bodyAbonos = [];
      let totalAbonadoAcumulado = 0;
      
      // ¡AQUÍ ESTABA EL ERROR DE RAÍZ! Consultamos usando tu columna real: 'despacho_id'
      const { data: pagosDB, error: errorPagos } = await supabase
        .from('pagos')
        .select('*')
        .eq('despacho_id', idVenta) 
        .order('fecha_pago', { ascending: true });

      if (!errorPagos && pagosDB && pagosDB.length > 0) {
        pagosDB.forEach((abono, index) => {
          // Ajustado a tus columnas reales: 'monto' y 'referencia'/'nota'
          const monto = parseFloat(abono.monto || 0);
          totalAbonadoAcumulado += monto;
          
          const detalleRaw = abono.referencia || abono.nota || 'ABONO REGISTRADO';
          
          bodyAbonos.push([
            `${index + 1}`,
            abono.fecha_pago || 'S/F',
            String(detalleRaw).toUpperCase(),
            `$${monto.toLocaleString('es-CO')}`
          ]);
        });
      } else {
        // Fallback secundario si la consulta no retorna datos pero el objeto tiene pagos previos
        const pagosFallback = remisionActiva.pagos || remisionActiva.abonos || [];
        if (pagosFallback.length > 0) {
          pagosFallback.forEach((abono, index) => {
            const monto = parseFloat(abono.monto || 0);
            totalAbonadoAcumulado += monto;
            const detalleRaw = abono.referencia || 'ABONO';
            bodyAbonos.push([
              `${index + 1}`,
              abono.fecha_pago || 'S/F',
              String(detalleRaw).toUpperCase(),
              `$${monto.toLocaleString('es-CO')}`
            ]);
          });
        } else {
          // Si es una remisión sin abonos, la tabla se dibuja limpia en $0 de forma correcta
          bodyAbonos = [
            ["-", "-", "SIN ABONOS REGISTRADOS A LA FECHA", "$0"]
          ];
          totalAbonadoAcumulado = 0;
        }
      }

      // Cálculo matemático impecable del saldo restante basado en los abonos reales del cliente
      const saldoNetoPendiente = valorTotalVenta - totalAbonadoAcumulado;

      // ==========================================
      // 4. MAQUETACIÓN GRÁFICA DEL PDF (FORMATO A6)
      // ==========================================
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [105, 148]
      });

      // MARCO VERDE OLIVA CORPORATIVO
      doc.setDrawColor(112, 173, 71); 
      doc.setLineWidth(0.8);
      doc.rect(4, 4, 97, 140);

      // LOGO
      try {
        doc.addImage('/Logopapel.png', 'PNG', 42.5, 6, 20, 20);
      } catch (e) {}

      // ENCABEZADOS
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
      doc.text(`REMISIÓN N°: ${nRemision}`, 6, 11);

      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(40, 80, 40);
      doc.text("ESTADO DE CUENTA DE CARTERA", 52.5, 29, { align: "center" });

      // BLOQUE INFORMATIVO GENERAL CEBRA
      const yBase = 33;
      const altoFila = 5;
      const yOffset = 3.5;

      doc.setFillColor(242, 242, 242);
      doc.rect(6, yBase, 93, altoFila, 'F');
      doc.rect(6, yBase + (altoFila * 2), 93, altoFila, 'F');
      
      doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.2);
      doc.rect(6, yBase, 93, altoFila * 3); 
      doc.line(6, yBase + altoFila, 99, yBase + altoFila);
      doc.line(6, yBase + (altoFila * 2), 99, yBase + (altoFila * 2));
      doc.line(52, yBase, 52, yBase + altoFila);

      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(0);
      doc.text("FECHA DESPACHO:", 8, yBase + yOffset);
      doc.setFont("helvetica", "normal"); doc.text(`${fechaDespacho}`, 34, yBase + yOffset);

      doc.setFont("helvetica", "bold"); doc.text("INVERNADERO:", 54, yBase + yOffset);
      doc.setFont("helvetica", "normal"); doc.text(`${invernaderoNom.toUpperCase()}`, 75, yBase + yOffset);

      doc.setFont("helvetica", "bold"); doc.text("CLIENTE:", 8, yBase + altoFila + yOffset);
      doc.setFont("helvetica", "normal"); doc.text(`${clienteNom.toUpperCase()}`, 22, yBase + altoFila + yOffset);

      doc.setFont("helvetica", "bold"); doc.text("NIT / CC:", 8, yBase + (altoFila * 2) + yOffset);
      doc.setFont("helvetica", "normal"); doc.text(`${clienteNit}`, 22, yBase + (altoFila * 2) + yOffset);

      // --- TABLA 1: PRODUCTOS DESPACHADOS REALES DESDE LA BASE DE DATOS ---
      autoTable(doc, {
        startY: yBase + (altoFila * 3) + 3,
        margin: { left: 6, right: 6 },
        head: [["PRODUCTO DESPACHADO", "CANTIDAD", "SUBTOTAL"]],
        body: bodyProductos,
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, lineWidth: 0.1, lineColor: [210, 210, 210] },
        headStyles: { fillColor: [112, 173, 71], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 45, halign: 'left' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 23, halign: 'right' }
        }
      });

      // Línea de valor original de carga
      const yTotalVenta = doc.lastAutoTable.finalY + 4;
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text("VALOR TOTAL VENTA:", 53, yTotalVenta);
      doc.text(`$${valorTotalVenta.toLocaleString('es-CO')}`, 99, yTotalVenta, { align: 'right' });

      // --- TABLA 2: HISTORIAL DE PAGOS / RECAUDOS REALES ---
      autoTable(doc, {
        startY: yTotalVenta + 2,
        margin: { left: 6, right: 6 },
        head: [["N°", "FECHA PAGO", "DETALLE / REFERENCIA", "VALOR ABONO"]],
        body: bodyAbonos,
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, lineWidth: 0.1, lineColor: [210, 210, 210] },
        headStyles: { fillColor: [40, 80, 40], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 42, halign: 'left' },
          3: { cellWidth: 23, halign: 'right' }
        }
      });

      // --- SECCIÓN 3: TOTALES Y BALANCES CORREGIDOS ---
      const yBalance = doc.lastAutoTable.finalY + 4;
      
      doc.setFillColor(245, 245, 245);
      doc.rect(48, yBalance, 51, 11, 'F');
      doc.setDrawColor(200, 200, 200); doc.rect(48, yBalance, 51, 11);
      doc.line(48, yBalance + 5.5, 99, yBalance + 5.5);

      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(0);
      doc.text("TOTAL ABONADO:", 50, yBalance + 4);
      doc.setFont("helvetica", "bold"); doc.setTextColor(0, 100, 0); 
      doc.text(`$${totalAbonadoAcumulado.toLocaleString('es-CO')}`, 97, yBalance + 4, { align: 'right' });

      doc.setFont("helvetica", "bold"); doc.setTextColor(0);
      doc.text("SALDO PENDIENTE:", 50, yBalance + 9.5);
      doc.setFont("helvetica", "bold"); doc.setTextColor(180, 0, 0); 
      doc.text(`$${saldoNetoPendiente.toLocaleString('es-CO')}`, 97, yBalance + 9.5, { align: 'right' });

      // Notas finales al pie
      const yNotas = yBalance + 14;
      doc.setDrawColor(210, 210, 210); doc.rect(6, yNotas, 93, 7);
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.5);
      doc.text("NOTA:", 7, yNotas + 4.5);
      doc.setFont("helvetica", "normal");
      doc.text(`${String(notaRef).toUpperCase()}`, 15, yNotas + 4.5, { maxWidth: 82 });

      doc.save(`ESTADO_CUENTA_REM_${nRemision}.pdf`);

    } catch (err) {
      console.error("Error crítico en generación de PDF:", err);
    }
  };
// -- FIN FUNCION IMPRIMIRRE RECIBO CARTERA

  // 1. Obtener la remisión seleccionada actualmente
  const remisionSeleccionada = datosDespachos?.find(r => r.id?.toString() === pagoForm.despacho_id?.toString());

  // 2. Obtener abonos asociados a la remisión actual
  const historialAbonos = datosPagos
    ?.filter(p => p.despacho_id?.toString() === pagoForm.despacho_id?.toString())
    .sort((a, b) => new Date(a.fecha_pago) - new Date(b.fecha_pago));

  const totalAbonado = historialAbonos?.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0) || 0;
  const saldoActual = remisionSeleccionada ? (parseFloat(remisionSeleccionada.total_venta) - totalAbonado) : 0;

  const remisionesDelCliente = datosDespachos?.filter(d => 
    d.cliente_id?.toString() === pagoForm.cliente_id?.toString()
  ) || [];

  return (
  <div className="space-y-6 pb-20">
    {/* FORMULARIO DE REGISTRO */}
    <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-blue-700">
      <h3 className="font-black text-blue-900 uppercase text-sm mb-6 italic">💳 Registro de Pagos</h3>
      
      {/* SECCIÓN DEL HISTORIAL MODIFICADA: COLUMNA Y ALINEADO A LA IZQUIERDA */}
      <div className="p-5 bg-gray-200 border-b-2 border-gray-400 flex flex-col gap-3">
        <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">
          Historial Detallado de Pagos
        </h3>

        <div className="flex justify-start">
          <button
            onClick={exportarPagosAExcel}
            className="px-4 py-2 bg-emerald-700 text-white font-black italic rounded-xl shadow-md hover:bg-emerald-800 transition-colors flex items-center gap-2 text-xs uppercase tracking-wider"
          >
            📊 Exportar a Excel
          </button>
        </div>
      </div>

      {/* Aquí continúa el resto de tu tabla o contenido inferior... */}





        <form onSubmit={guardarPago} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Cliente</label>
              <select 
                className="w-full border-2 p-3 rounded-xl font-bold bg-white"
                value={pagoForm.cliente_id}
                onChange={(e) => setPagoForm({...pagoForm, cliente_id: e.target.value, despacho_id: ''})} 
                required
              >
                <option value="">Seleccione Cliente...</option>
                {listaClientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre_completo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">N° Remisión</label>
              <select className="w-full border-2 p-3 rounded-xl font-bold bg-white"
                value={pagoForm.despacho_id}
                onChange={(e) => setPagoForm({...pagoForm, despacho_id: e.target.value, monto: 0})}
                disabled={!pagoForm.cliente_id} required>
                <option value="">Seleccione Remisión...</option>
                {remisionesDelCliente.map(r => (
                  <option key={r.id} value={r.id}>N° {r.numero_remision} - {formatoPesos(r.total_venta)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Fecha Abono</label>
              <input type="date" className="w-full border-2 p-3 rounded-xl font-bold"
                value={pagoForm.fecha_pago}
                onChange={(e) => setPagoForm({...pagoForm, fecha_pago: e.target.value})} required />
            </div>
          </div>

          {remisionSeleccionada && (
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-inner">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-700 uppercase italic px-1">Valor del Nuevo Abono</label>
                  <input 
                  type="text" 
                  className="w-full p-4 bg-white rounded-xl font-black text-2xl text-blue-900 border-2 border-blue-200 outline-none focus:border-blue-500"
                  value={pagoForm.monto} // <--- DEBE SER ASÍ, sin formatoPesos()
                  onChange={(e) => setPagoForm({...pagoForm, monto: e.target.value.replace(/\D/g, "")})} 
                  required 
                />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase italic px-1">Saldo Pendiente Actual</label>
                  <div className="w-full p-4 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center">
                    <p className={`text-2xl font-black ${saldoActual <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatoPesos(saldoActual)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Referencia / Nota de Pago</label>
                  <input className="w-full border-2 p-3 rounded-xl font-bold bg-white outline-none focus:border-blue-500"
                    value={pagoForm.referencia}
                    onChange={(e) => setPagoForm({...pagoForm, referencia: e.target.value})}
                    placeholder="Ej: Transferencia Bancolombia / Efectivo" />
                </div>
                <button 
                  type="submit" 
                  className={`w-full p-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg ${
                    pagoForm.id_editando ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  {pagoForm.id_editando ? '💾 Actualizar Abono' : '💰 Registrar Abono'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* FICHA TÉCNICA Y DETALLE DE PRODUCTOS */}
      {remisionSeleccionada ? (
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-300">
          <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
            <h3 className="font-black uppercase text-xs tracking-widest italic">Ficha de Remisión: {remisionSeleccionada.numero_remision}</h3>
            <span className="bg-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Detalle de Carga</span>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase italic">Cliente</p>
                <p className="font-black text-xl text-slate-800 uppercase leading-tight">{remisionSeleccionada.clientes?.nombre_completo}</p>
                <p className="text-xs font-bold text-slate-500 mt-1">Fecha: {remisionSeleccionada.fecha_venta}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-3 tracking-widest italic">Contenido de la Remisión</p>
                <div className="space-y-2">
                  {remisionSeleccionada.detalle_ventas?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-slate-200 pb-1">
                      <p className="text-xs font-black text-slate-700 uppercase">{item.descripcion}</p>
                      <p className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                        {item.cantidad} {item.escala}
                      </p>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic">Valor Total Venta:</p>
                    <p className="text-sm font-black text-green-700">{formatoPesos(remisionSeleccionada.total_venta)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CRONOLOGÍA DE ABONOS */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Historial de Abonos Recibidos</p>
              {historialAbonos?.length > 0 ? (
                historialAbonos.map((abono, idx) => (
                  <div key={abono.id} className="bg-gray-50 p-4 rounded-xl border-l-4 border-blue-500 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <div className="flex items-center gap-4">
                      <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-700 text-sm">{abono.fecha_pago}</p>
                          {abono.referencia && (
                            <span className="text-[10px] font-bold text-blue-800 italic uppercase bg-blue-100 px-2 rounded-md">
                              {abono.referencia}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <p className="font-black text-blue-700 text-lg">+{formatoPesos(abono.monto)}</p>
                      {/* BOTONES DE ACCIÓN */}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => prepararEdicionPago(abono)}
                          className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-md transition-all active:scale-90"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => eliminarPago(abono.id)}
                          className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md transition-all active:scale-90"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-xs font-bold text-gray-400 uppercase italic">Sin pagos registrados</p>
                </div>
              )}
            </div>

            {/* SALDO FINAL */}
            <div className="bg-slate-900 p-6 rounded-2xl flex justify-between items-center text-white shadow-xl">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Abonado</p>
                <p className="font-black text-xl text-blue-400">{formatoPesos(totalAbonado)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Saldo Neto Pendiente</p>
                <p className={`font-black text-3xl ${saldoActual <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatoPesos(saldoActual)}
                </p>
              </div>
             {/* === BOTÓN DE IMPRESIÓN UBICADO EN EL RECUADRO ROJO === */}
    

            </div>
                   
        <button
  onClick={async () => {
    // Llama de forma asíncrona pasándole la remisión seleccionada en la pantalla
    await imprimirReciboCarteraPDF(remisionSeleccionada || pagoSeleccionado);
  }}
  className="px-5 py-3 bg-red-700 hover:bg-red-800 text-white font-black italic rounded-xl shadow-lg transition-colors flex items-center gap-2 text-xs uppercase tracking-wider border border-red-600"
>
  🖨️ PDF Remisión
</button>
                      
    
    
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 p-12 rounded-3xl text-center">
          <p className="text-blue-400 font-black uppercase text-xs italic">Seleccione una remisión para cargar el detalle de productos</p>
        </div>
      )}
    </div>
  );
}