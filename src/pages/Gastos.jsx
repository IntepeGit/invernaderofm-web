import { useEffect } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function Gastos({ 
  gastoForm, 
  setGastoForm, 
  listaInvernaderos, 
  listaProveedores, 
  mostrarAlerta, 
  cargarTodo, 
  supabase, 
  datosEgresos,
  eliminarGasto,   
  imprimirGastoPDF 
}) {
  const categorias = ["Mano de obra", "Insumo Agricola", "Flete", "Mto (Mantenimiento)", "S.Publicos", "Arriendos", "Quincena", "Otros"];
  const unidades = ["Canastilla", "Kilo", "Bulto", "Litro", "Jornal", "Unidad", "Hora", "Otra", "Caja", "Garrafa", "Galon"];

  // Formateador de moneda colombiana estricto para visualización estática
  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0 
  }).format(valor || 0);

  // Función interna para dar formato de pesos dinámico mientras el usuario escribe
  const formatearMascaraMoneda = (valorRaw) => {
    const numeroLimpio = String(valorRaw).replace(/\D/g, "");
    if (!numeroLimpio) return "";
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(numeroLimpio);
  };

  // Cálculo automático del monto total (Cantidad x Precio Unitario)
  useEffect(() => {
    const total = (parseFloat(gastoForm.cantidad) || 0) * (parseFloat(gastoForm.precio_unitario) || 0);
    if (total !== parseFloat(gastoForm.monto)) {
      setGastoForm(prev => ({ ...prev, monto: total }));
    }
  }, [gastoForm.cantidad, gastoForm.precio_unitario, setGastoForm]);

  // --- FUNCIÓN PARA EXPORTAR GASTOS A EXCEL ---
  const exportarAExcel = async () => {
    if (!datosEgresos || datosEgresos.length === 0) {
      mostrarAlerta("No hay datos de gastos para exportar", "error");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Control de Gastos');

      worksheet.columns = [
        { header: 'FECHA GASTO', key: 'fecha', width: 15 },
        { header: 'COMPROBANTE N°', key: 'comprobante', width: 18 },
        { header: 'INVERNADERO', key: 'invernadero', width: 18 },
        { header: 'PROVEEDOR', key: 'proveedor', width: 25 },
        { header: 'NIT / CC', key: 'nit', width: 16 },
        { header: 'CATEGORÍA', key: 'categoria', width: 20 },
        { header: 'DESCRIPCIÓN / DETALLE', key: 'descripcion', width: 35 },
        { header: 'CANTIDAD', key: 'cantidad', width: 12 },
        { header: 'UNIDAD MEDIDA', key: 'unidad', width: 16 },
        { header: 'PRECIO UNITARIO', key: 'precio', width: 18 },
        { header: 'MONTO TOTAL', key: 'monto', width: 18 },
        { header: 'NOTA / OBSERVACIONES', key: 'nota', width: 30 }
      ];

      datosEgresos.forEach((g) => {
        const proveedor = g.nombre_proveedor || g.proveedores?.nombre_completo || g.proveedores?.nombre || 'Particular';
        const nit = g.nit_cc || g.proveedores?.nit_cc || 'N/A';
        const invernadero = g.nombre_invernadero || g.invernaderos?.nombre || 'General';

        worksheet.addRow({
          fecha: g.fecha_gasto || '',
          comprobante: g.numero_comprobante || 'S/N',
          invernadero: invernadero.toUpperCase(),
          proveedor: proveedor.toUpperCase(),
          nit: nit,
          categoria: (g.categoria || 'Sin Categoría').toUpperCase(),
          descripcion: g.descripcion || '',
          cantidad: parseFloat(g.cantidad) || 0,
          unidad: g.unidad_medida || 'Unidad',
          precio: parseFloat(g.precio_unitario) || 0,
          monto: parseFloat(g.monto) || 0,
          nota: g.nota || ''
        });
      });

      const headerRow = worksheet.getRow(1);
      headerRow.height = 24;
      
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.height = 20;
        const esCebra = rowNumber % 2 === 0;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 9 };
          if (esCebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
          if ([1, 2, 5].includes(colNumber)) cell.alignment = { vertical: 'middle', horizontal: 'center' };
          else if ([8, 10, 11].includes(colNumber)) cell.alignment = { vertical: 'middle', horizontal: 'right' };
          else cell.alignment = { vertical: 'middle', horizontal: 'left' };
          if (colNumber === 8) cell.numFmt = '#,##0';
          if (colNumber === 10 || colNumber === 11) cell.numFmt = '"$"#,##0';
        });
      });

      worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: worksheet.rowCount, column: worksheet.columnCount } };
      const buffer = await workbook.xlsx.writeBuffer();
      const fechaHoy = new Date().toISOString().split('T')[0];
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `BITACORA_GASTOS_${fechaHoy}.xlsx`);
      if (typeof mostrarAlerta === "function") mostrarAlerta("Reporte de gastos generado con éxito", "exito");
    } catch (error) {
      console.error("Error al exportar Excel:", error);
    }
  };

  // --- REGISTRO Y VALIDACIÓN ESTRICTA ---
  // --- REGISTRO Y VALIDACIÓN ESTRICTA CORREGIDA ---
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // VALIDACIÓN ABSOLUTA: Todos los campos del flujo principal deben tener datos válidos
    if (!gastoForm.fecha) {
      mostrarAlerta("La fecha de pago es obligatoria", "error");
      return;
    }
    if (!gastoForm.numero_comprobante || !gastoForm.numero_comprobante.trim()) {
      mostrarAlerta("El N° Factura / Comprobante es obligatorio", "error");
      return;
    }
    if (!gastoForm.invernadero_id) {
      mostrarAlerta("Debe asignar un invernadero o bloque al gasto", "error");
      return;
    }
    if (!gastoForm.categoria) {
      mostrarAlerta("Debe seleccionar una categoría de costo", "error");
      return;
    }
    if (!gastoForm.descripcion || !gastoForm.descripcion.trim()) {
      mostrarAlerta("El concepto o detalle del gasto es obligatorio", "error");
      return;
    }
    if (!gastoForm.cantidad || parseFloat(gastoForm.cantidad) <= 0) {
      mostrarAlerta("La cantidad debe ser un número mayor a cero", "error");
      return;
    }
    if (!gastoForm.precio_unitario || parseFloat(gastoForm.precio_unitario) <= 0) {
      mostrarAlerta("El precio unitario debe ser un número mayor a cero", "error");
      return;
    }

    // PAYLOAD CORREGIDO: Mapeo exacto con las columnas de tu tabla 'egresos'
    const payload = {
      invernadero_id: gastoForm.invernadero_id,
      descripcion: gastoForm.descripcion.toUpperCase().trim(),
      monto: parseFloat(gastoForm.monto) || 0,
      categoria: gastoForm.categoria,
      proveedor_id: gastoForm.proveedor_id || null,
      numero_comprobante: gastoForm.numero_comprobante.toUpperCase().trim(),
      nota: gastoForm.nota ? gastoForm.nota.trim() : null,
      fecha_gasto: gastoForm.fecha,
      cantidad: parseFloat(gastoForm.cantidad) || 0,
      unidad_medida: gastoForm.unidad_medida,
      precio_unitario: parseFloat(gastoForm.precio_unitario) || 0
    };

    const { error } = await supabase.from('egresos').insert([payload]);
    if (error) {
      mostrarAlerta("Error al guardar: " + error.message, "error");
    } else {
      mostrarAlerta("Gasto registrado correctamente en bitácora", "exito");
      setGastoForm({ 
        invernadero_id: '', 
        descripcion: '', 
        monto: 0, 
        categoria: 'Insumo Agricola', 
        proveedor_id: '', 
        numero_comprobante: '', 
        nota: '', 
        fecha: new Date().toISOString().split('T')[0], 
        cantidad: '', 
        unidad_medida: 'Unidad', 
        precio_unitario: '' 
      });
      cargarTodo();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO DE REGISTRO REORGANIZADO */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-red-700 h-fit">
          <div className="flex justify-between items-center mb-5 border-b pb-3">
            <h3 className="font-black text-slate-800 uppercase text-xs italic">💸 Nuevo Egreso</h3>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Total Gasto</p>
              <p className="text-lg font-black text-red-700">{formatoPesos(gastoForm.monto)}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* FILA SUPERIOR: FECHA + COMPROBANTE */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Fecha de Pago</label>
                <input type="date" className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-red-500" 
                  value={gastoForm.fecha} onChange={e => setGastoForm({...gastoForm, fecha: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-red-600 uppercase px-1 italic">N° Factura / Comp.</label>
                <input className="w-full border-2 border-red-200 p-2.5 rounded-xl font-black text-xs text-red-700 outline-none focus:border-red-500 uppercase" 
                  value={gastoForm.numero_comprobante} onChange={e => setGastoForm({...gastoForm, numero_comprobante: e.target.value})} placeholder="FAC-123" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Invernadero Asignado</label>
              <select className="w-full border-2 p-2.5 rounded-xl bg-white font-bold text-xs outline-none focus:border-red-500" 
                value={gastoForm.invernadero_id} onChange={e => setGastoForm({...gastoForm, invernadero_id: e.target.value})}>
                <option value="">Seleccionar bloque...</option>
                {listaInvernaderos?.filter(inv => inv.activo !== false).map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Categoría</label>
              <select className="w-full border-2 p-2.5 rounded-xl bg-white font-bold text-xs outline-none focus:border-red-500" 
                value={gastoForm.categoria} onChange={e => setGastoForm({...gastoForm, categoria: e.target.value})}>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Concepto / Detalle del Gasto</label>
              <input placeholder="Ej: Compra de abono" className="w-full border-2 p-2.5 rounded-xl font-bold text-sm outline-none focus:border-red-500" 
                value={gastoForm.descripcion} onChange={e => setGastoForm({...gastoForm, descripcion: e.target.value})} />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Proveedor / Beneficiario</label>
              <select className="w-full border-2 p-2.5 rounded-xl bg-white font-bold text-xs outline-none focus:border-red-500" 
                value={gastoForm.proveedor_id} onChange={e => setGastoForm({...gastoForm, proveedor_id: e.target.value})}>
                <option value="">Particular / Otros</option>
                {listaProveedores?.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            {/* CUADRO TÉCNICO INTERNO CON TOTALIZADOR EN TIEMPO REAL */}
            <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-100 space-y-3 shadow-inner">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase px-1">Cantidad</label>
                  <input type="number" className="w-full p-2 border-2 bg-white rounded-xl outline-none text-xs font-black text-slate-700 focus:border-red-500" 
                    value={gastoForm.cantidad} onChange={e => setGastoForm({...gastoForm, cantidad: e.target.value})} placeholder="0" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase px-1">U. Medida</label>
                  <select className="w-full p-2 border-2 bg-white rounded-xl outline-none text-xs font-bold focus:border-red-500" 
                    value={gastoForm.unidad_medida} onChange={e => setGastoForm({...gastoForm, unidad_medida: e.target.value})}>
                    {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              
              {/* CAMPO CORREGIDO: MÁSCARA EN TIEMPO REAL PARA EL PRECIO UNITARIO */}
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase px-1">Precio Unitario (COP)</label>
                <input 
                  type="text" 
                  className="w-full p-2 border-2 bg-white rounded-xl outline-none text-xs font-black text-red-600 focus:border-red-500" 
                  value={formatearMascaraMoneda(gastoForm.precio_unitario)} 
                  onChange={e => setGastoForm({...gastoForm, precio_unitario: e.target.value.replace(/\D/g, "")})} 
                  placeholder="$ 0" 
                />
              </div>

              {/* MONTO CALCULADO OPERACIÓN */}
              <div className="pt-2 border-t border-slate-200">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1 italic">Monto Calculado Operación</label>
                <div className="w-full p-2.5 bg-white border rounded-xl font-black text-sm text-slate-800 tracking-wider text-center shadow-sm">
                  {formatoPesos(gastoForm.monto)}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Notas Adicionales</label>
              <input className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-red-500" 
                value={gastoForm.nota} onChange={e => setGastoForm({...gastoForm, nota: e.target.value})} placeholder="Observaciones..." />
            </div>

            <button type="submit" className="w-full bg-red-700 text-white font-black py-3.5 rounded-xl shadow-md hover:bg-red-800 transition-colors uppercase tracking-wider text-xs">
              🚀 Registrar Egreso
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: TABLA HISTÓRICA */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-4 bg-slate-800 text-white font-black text-xs uppercase tracking-widest italic flex justify-between items-center">
            <span>Historial Detallado de Gastos</span>
            <button
              onClick={exportarAExcel}
              className="px-3 py-1 bg-emerald-600 text-white font-black rounded-lg shadow-md hover:bg-emerald-700 transition-colors flex items-center gap-1 text-[10px] uppercase tracking-wider"
            >
              📊 Excel
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-300 text-slate-800 uppercase font-black">
                  <th className="p-4 border-b-2 border-gray-400">Fecha / Factura</th>
                  <th className="p-4 border-b-2 border-gray-400">Invernadero</th>
                  <th className="p-4 border-b-2 border-gray-400">Concepto / Categoría</th>
                  <th className="p-4 border-b-2 border-gray-400 text-center">Detalle</th>
                  <th className="p-4 border-b-2 border-gray-400 text-right">Monto</th>
                  <th className="p-4 border-b-2 border-gray-400 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-400">
                {datosEgresos?.sort((a, b) => b.id - a.id).map((g, index) => (
                  <tr key={g.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'} hover:bg-yellow-100 transition-colors border-l-8 border-red-700`}>
                    <td className="p-4">
                      <div className="font-black text-slate-900">{g.fecha_gasto}</div>
                      <div className="text-[10px] text-red-700 font-black mt-0.5">{g.numero_comprobante ? `DOC: ${g.numero_comprobante.toUpperCase()}` : 'S/N'}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-700 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase shadow-sm">
                        {g.invernaderos?.nombre || 'Gral'}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      <p className="uppercase">{g.descripcion}</p>
                      <p className="text-[9px] text-slate-400 uppercase italic mt-0.5">📌 {g.categoria || 'Varios'}</p>
                    </td>
                    <td className="p-4 text-center">
                      <div className="font-black text-slate-800">{g.cantidad} {g.unidad_medida}</div>
                      <div className="text-[9px] text-slate-400 font-bold">{formatoPesos(g.precio_unitario)} c/u</div>
                    </td>
                    <td className="p-4 text-right font-black text-red-700 text-[12px]">
                      {formatoPesos(g.monto)}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1.5 justify-center">
                        <button onClick={() => imprimirGastoPDF(g)} className="px-2 py-1 bg-slate-800 text-white rounded-lg hover:bg-black transition-colors flex items-center gap-1 border border-slate-900 shadow-md">
                          <span className="text-[11px]">🖨️</span><span className="text-[9px] font-black tracking-wider">PDF</span>
                        </button>
                        <button onClick={() => eliminarGasto(g.id)} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-700 hover:text-white transition-colors border border-red-200">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}