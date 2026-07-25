import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function ConfigProv({ provForm, setProvForm, mostrarAlerta, cargarTodo, supabase, lista }) {
  
  // Estado para capturar el texto manual cuando selecciona "Otro"
  const [bancoOtroTexto, setBancoOtroTexto] = useState('');

  // 🇨🇴 Se añade "Bre-B" y entidades comunes a las opciones de pago
  const bancosSoportados = ["Efectivo", "Bre-B (Pago Inmediato)", "Bancolombia Ahorros", "Bancolombia Corriente", "Nequi", "Daviplata", "Banco de Bogotá", "Colpatria", "Davivienda", "Otro"];

  const handleSave = async () => {
    if (!provForm.nombre || !provForm.nit) {
      mostrarAlerta("Nombre y NIT/CC son obligatorios", "error");
      return;
    }

    // Definir nombre final del banco (si eligió 'Otro' toma el campo escrito manualmente)
    let bancoFinal = provForm.banco || "Efectivo";
    if (provForm.banco === 'Otro') {
      bancoFinal = bancoOtroTexto.trim() !== '' ? bancoOtroTexto.toUpperCase().trim() : 'Otro';
    }

    // Armamos el payload con el mapeo exacto incluyendo email y campos bancarios
    const payload = {
      nombre: provForm.nombre.toUpperCase().trim(),
      nit_cc: provForm.nit.toString().trim(),
      telefono: provForm.tel ? provForm.tel.toString().trim() : null,
      email: provForm.email ? provForm.email.toLowerCase().trim() : null,
      direccion: provForm.dir ? provForm.dir.toUpperCase().trim() : null,
      ciudad: provForm.ciudad ? provForm.ciudad.toUpperCase().trim() : null,
      nota: provForm.nota ? provForm.nota.trim() : null,
      banco: bancoFinal, 
      numero_cuenta: provForm.numero_cuenta ? provForm.numero_cuenta.trim() : null 
    };

    try {
      if (provForm.id_editando) {
        // === MODO EDICIÓN ===
        const { error: updateError } = await supabase
          .from('proveedores')
          .update(payload)
          .eq('id', provForm.id_editando);

        if (updateError) throw updateError;
        mostrarAlerta("Proveedor actualizado con éxito", "exito");
      } else {
        // === MODO CREACIÓN ===
        const { error: insertError } = await supabase
          .from('proveedores')
          .insert([payload]);

        if (insertError) throw insertError;
        mostrarAlerta("Proveedor guardado correctamente", "exito");
      }

      limpiarFormulario();
      await cargarTodo();
    } catch (error) {
      console.error("Error en la operación de proveedores:", error);
      mostrarAlerta("Error en base de datos: " + (error.message || error), "error");
    }
  };

  const prepararEdicion = (item) => {
    const esOpPredefinida = bancosSoportados.includes(item.banco);
    
    setProvForm({
      id_editando: item.id,
      nombre: item.nombre || '',
      nit: item.nit_cc || '',
      tel: item.telefono || '',
      email: item.email || '',
      dir: item.direccion || '',
      ciudad: item.ciudad || '',
      nota: item.nota || '',
      banco: esOpPredefinida ? (item.banco || 'Efectivo') : 'Otro', 
      numero_cuenta: item.numero_cuenta || '' 
    });

    if (!esOpPredefinida) {
      setBancoOtroTexto(item.banco || '');
    } else {
      setBancoOtroTexto('');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarProveedor = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de eliminar al proveedor "${nombre}"? Esta acción no se puede deshacer.`)) {
      try {
        const { error } = await supabase.from('proveedores').delete().eq('id', id);
        if (error) throw error;
        
        mostrarAlerta("Proveedor eliminado definitivamente", "exito");
        await cargarTodo();
      } catch (err) {
        console.error("Error al eliminar:", err);
        mostrarAlerta("No se puede eliminar: El proveedor tiene egresos o registros asociados en el historial.", "error");
      }
    }
  };

  const limpiarFormulario = () => {
    setProvForm({ 
      id_editando: null, 
      nombre: '', 
      nit: '', 
      tel: '', 
      email: '',
      dir: '', 
      ciudad: '', 
      nota: '',
      banco: 'Efectivo',
      numero_cuenta: '' 
    });
    setBancoOtroTexto('');
  };

  // 📊 EXPORTAR BASE DE DATOS DE PROVEEDORES A EXCEL (CON EMAIL)
  const exportarProveedoresAExcel = async () => {
    if (!lista || lista.length === 0) {
      mostrarAlerta("No hay proveedores para exportar", "error");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Directorio Proveedores');

      sheet.columns = [
        { header: 'RAZÓN SOCIAL / NOMBRE', key: 'nombre', width: 32 },
        { header: 'NIT / CÉDULA', key: 'nit', width: 18 },
        { header: 'FORMA / BANCO PAGO', key: 'banco', width: 22 },
        { header: 'N° CUENTA / LLAVE', key: 'cuenta', width: 22 },
        { header: 'TELÉFONO', key: 'telefono', width: 18 },
        { header: 'CORREO ELECTRÓNICO', key: 'email', width: 28 },
        { header: 'CIUDAD', key: 'ciudad', width: 18 },
        { header: 'DIRECCIÓN FÍSICA', key: 'direccion', width: 28 },
        { header: 'OBSERVACIONES / NOTAS', key: 'nota', width: 35 }
      ];

      lista.forEach(p => {
        sheet.addRow({
          nombre: (p.nombre || '').toUpperCase(),
          nit: p.nit_cc || '',
          banco: (p.banco || 'Efectivo').toUpperCase(),
          cuenta: p.numero_cuenta || '---',
          telefono: p.telefono || 'N/R',
          email: p.email ? p.email.toLowerCase() : 'N/R',
          ciudad: (p.ciudad || 'N/R').toUpperCase(),
          direccion: (p.direccion || 'N/R').toUpperCase(),
          nota: p.nota || ''
        });
      });

      // Cabecera Estilizada Azul Océano
      const headerRow = sheet.getRow(1);
      headerRow.height = 24;
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF117097' } };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Filas y Cebra
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.height = 20;
        const esCebra = rowNumber % 2 === 0;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 9 };
          if (esCebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FB' } };

          if ([2, 3, 4, 5, 7].includes(colNumber)) cell.alignment = { vertical: 'middle', horizontal: 'center' };
          else cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });
      });

      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: sheet.columnCount } };

      const buffer = await workbook.xlsx.writeBuffer();
      const fechaHoy = new Date().toISOString().split('T')[0];
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `BASE_DATOS_PROVEEDORES_${fechaHoy}.xlsx`);

      mostrarAlerta("Base de datos de proveedores exportada a Excel", "exito");
    } catch (err) {
      console.error("Error al exportar Excel:", err);
      mostrarAlerta("Error al generar el archivo Excel", "error");
    }
  };

  return (
    <div className="space-y-6 pb-20 text-slate-800">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO (1/3) */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-[#117097] h-fit">
          <h3 className="font-black text-slate-800 uppercase text-xs italic mb-5">
            {provForm.id_editando ? '📝 Editar Proveedor' : '🚛 Nuevo Proveedor'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Razon Social / Nombre</label>
              <input className="w-full border-2 p-2.5 rounded-xl font-bold text-sm uppercase outline-none focus:border-[#117097]" value={provForm.nombre || ''} onChange={e=>setProvForm({...provForm, nombre: e.target.value})} placeholder="Ej: AGROINSUMOS SAS" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">NIT / Cédula</label>
              <input className="w-full border-2 p-2.5 rounded-xl font-bold text-sm outline-none focus:border-[#117097]" value={provForm.nit || ''} onChange={e=>setProvForm({...provForm, nit: e.target.value})} placeholder="800.000.000-1" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Teléfono / Celular</label>
                <input className="w-full border-2 p-2.5 rounded-xl font-bold text-xs outline-none focus:border-[#117097]" value={provForm.tel || ''} onChange={e=>setProvForm({...provForm, tel: e.target.value})} placeholder="315..." />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Ciudad</label>
                <input className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase outline-none focus:border-[#117097]" value={provForm.ciudad || ''} onChange={e=>setProvForm({...provForm, ciudad: e.target.value})} placeholder="Chía" />
              </div>
            </div>

            {/* ✉️ CAMPO DE CORREO ELECTRÓNICO */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Correo Electrónico (E-Mail)</label>
              <input 
                type="email" 
                className="w-full border-2 p-2.5 rounded-xl font-bold text-xs lowercase outline-none focus:border-[#117097]" 
                value={provForm.email || ''} 
                onChange={e => setProvForm({...provForm, email: e.target.value})} 
                placeholder="contacto@proveedor.com" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Dirección Física</label>
              <input className="w-full border-2 p-2.5 rounded-xl font-bold text-xs uppercase outline-none focus:border-[#117097]" value={provForm.dir || ''} onChange={e=>setProvForm({...provForm, dir: e.target.value})} placeholder="Zona Industrial..." />
            </div>

            {/* 💳 SECCIÓN: MEDIOS DE PAGO CON ENTRADA MANUAL DINÁMICA */}
            <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-100 space-y-3 shadow-inner">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider border-b pb-1">Información de Pago / Transferencia</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase px-1">Forma / Banco</label>
                  <select 
                    className="w-full p-2 border-2 bg-white rounded-xl outline-none text-xs font-bold focus:border-[#117097]" 
                    value={provForm.banco || 'Efectivo'} 
                    onChange={e => setProvForm({...provForm, banco: e.target.value})}
                  >
                    {bancosSoportados.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase px-1">N° Cuenta / Llave Bre-B</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border-2 bg-white rounded-xl outline-none text-xs font-black text-slate-700 focus:border-[#117097]" 
                    value={provForm.numero_cuenta || ''} 
                    onChange={e => setProvForm({...provForm, numero_cuenta: e.target.value})} 
                    placeholder="Celular, cédula o cuenta..." 
                  />
                </div>
              </div>

              {/* Campo para digitar Banco personalizado cuando escoge "Otro" */}
              {provForm.banco === 'Otro' && (
                <div className="pt-1 animate-in fade-in duration-300">
                  <label className="text-[8px] font-black text-[#117097] uppercase px-1">Nombre Entidad / Banco Personalizado</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border-2 border-dashed border-[#117097] bg-sky-50 rounded-xl outline-none text-xs font-black uppercase text-[#117097]" 
                    value={bancoOtroTexto} 
                    onChange={e => setBancoOtroTexto(e.target.value)} 
                    placeholder="Ej: BANCO BBVA / ITAÚ / BANCO AGRARIO..." 
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Observaciones / Notas</label>
              <textarea className="w-full border-2 p-2.5 rounded-xl font-bold h-20 text-xs outline-none focus:border-[#117097]" value={provForm.nota || ''} onChange={e=>setProvForm({...provForm, nota: e.target.value})} placeholder="Detalles de entrega, horarios..." />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className={`flex-1 py-3.5 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-md transition-all cursor-pointer ${provForm.id_editando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#117097] hover:bg-[#0a4c68]'}`}>
                {provForm.id_editando ? '💾 Actualizar' : '💾 Guardar'}
              </button>
              {provForm.id_editando && (
                <button onClick={limpiarFormulario} className="px-4 py-3.5 bg-gray-200 text-gray-700 font-black rounded-xl uppercase text-xs hover:bg-gray-300 cursor-pointer">X</button>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: TABLA DE REGISTROS CON BOTÓN EXPORTAR EXCEL */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-4 bg-slate-800 text-white font-black text-xs uppercase tracking-widest italic flex justify-between items-center flex-wrap gap-2">
            <span>Base de Datos Proveedores</span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={exportarProveedoresAExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg shadow transition-colors flex items-center gap-1 cursor-pointer"
              >
                📊 EXPORTAR A EXCEL
              </button>
              <span className="text-[10px] bg-[#117097] px-2 py-1 rounded-md font-bold uppercase">Logística</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-300 text-slate-800 uppercase font-black">
                  <th className="p-4 border-b-2 border-gray-400">Nombre / Razón Social</th>
                  <th className="p-4 border-b-2 border-gray-400">NIT / CC</th>
                  <th className="p-4 border-b-2 border-gray-400">Datos de Pago</th>
                  <th className="p-4 border-b-2 border-gray-400">Contacto / Ubicación</th>
                  <th className="p-4 border-b-2 border-gray-400 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-400">
                {lista?.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-400 italic font-bold">No hay proveedores registrados.</td>
                  </tr>
                ) : (
                  lista?.map((item, index) => (
                    <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-100'} hover:bg-sky-50 transition-colors`}>
                      <td className="p-4 font-black text-slate-900 border-l-8 border-[#117097]">
                        <p className="uppercase">{item.nombre}</p>
                        {item.nota && <p className="text-[9px] text-gray-400 font-medium normal-case mt-0.5 line-clamp-1">📝 {item.nota}</p>}
                      </td>
                      <td className="p-4 font-bold text-slate-700">{item.nit_cc}</td>
                      
                      {/* DATOS DE PAGO */}
                      <td className="p-4 font-bold">
                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black ${
                          item.banco === 'Efectivo' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : item.banco?.toLowerCase().includes('bre-b')
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' 
                            : item.banco?.toLowerCase().includes('nequi') 
                            ? 'bg-purple-100 text-purple-800' 
                            : item.banco?.toLowerCase().includes('daviplata')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.banco?.toLowerCase().includes('bre-b') ? '⚡ Bre-B' : `🏦 ${item.banco || 'Efectivo'}`}
                        </span>
                        {item.numero_cuenta && (
                          <p className="text-[10px] text-slate-600 mt-1 font-black">
                            {item.banco?.toLowerCase().includes('bre-b') ? `Llave: ${item.numero_cuenta}` : `#${item.numero_cuenta}`}
                          </p>
                        )}
                      </td>

                      {/* CONTACTO, CORREO Y UBICACIÓN */}
                      <td className="p-4 font-bold text-slate-600 space-y-0.5">
                        <p>📞 {item.telefono || 'N/R'}</p>
                        {item.email && <p className="text-[10px] text-[#117097] font-semibold lowercase">✉️ {item.email}</p>}
                        <p className="uppercase text-slate-400 text-[9px]">📍 {item.ciudad || 'N/R'}</p>
                      </td>

                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => prepararEdicion(item)} className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-700 hover:text-white transition-colors border border-amber-200 cursor-pointer">
                            ✏️
                          </button>
                          <button onClick={() => eliminarProveedor(item.id, item.nombre)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-700 hover:text-white transition-colors border border-red-200 cursor-pointer">
                            🗑️
                          </button>
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
  );
}