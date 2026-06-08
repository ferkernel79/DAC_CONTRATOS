import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; // Padrão ESM corrigido

// --- AUXILIAR: TRATAMENTO DE DATA DO FIRESTORE ---
const extrairDataTexto = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('pt-BR');
};

// --- MÓDULO 1: EXPORTAÇÃO EXCEL COM ESTILIZAÇÃO COMPLETA (EXCELJS) ---
export const exportarParaExcel = async (contratos) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Contratos DAC', {
      views: [{ showGridLines: true }]
    });

    // 1. TÍTULO DO RELATÓRIO
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'RELATÓRIO GERENCIAL DE CONTRATOS - DAC / SOP-RS';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(1).height = 35;
    worksheet.addRow([]); // Linha em branco

    // 2. CABEÇALHOS DA TABELA
    const headers = [
      "Revisado", "PROA", "Código FPE", "Objeto / Descrição Livre", 
      "Classificação", "Tipo de Serviço", "Fornecedor Contratado", 
      "Valor Total Atualizado", "Vigência Final", "Status / Estágio", "Em Renovação"
    ];
    
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 26;

    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2C3E50' } };
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'CBD5E1' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      };
    });

    worksheet.getCell('D3').alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getCell('G3').alignment = { vertical: 'middle', horizontal: 'left' };

    // 3. INSERÇÃO DOS DADOS
    contratos.forEach((c, index) => {
      const rowNum = index + 4;
      
      const rowData = [
        c.revisado ? 'SIM' : 'NÃO',
        c.proaOriginal || c.id || '-',
        c.fpe || '-',
        c.objeto || c.descricao || '-',
        c.classificacao || (c.importadoDoCsv ? c.objeto : '-'),
        c.tipoServico || '-',
        c.fornecedorNome || '-',
        c.valorTotal ? Number(c.valorTotal) : 0,
        c.vigenciaOficial ? (c.vigenciaOficial.toDate ? c.vigenciaOficial.toDate() : new Date(c.vigenciaOficial)) : null,
        c.statusContrato || c.estagio || '[NÃO ATRIBUÍDO]',
        c.emRenovacao ? 'SIM' : 'NÃO'
      ];

      const dataRow = worksheet.addRow(rowData);
      dataRow.height = 22;

      const isEven = rowNum % 2 === 0;
      const bgStyle = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'F8FAFC' : 'FFFFFF' } };

      dataRow.eachCell((cell, colIndex) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.fill = bgStyle;
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        };
        
        if (colIndex === 1 || colIndex === 2 || colIndex === 3 || colIndex === 5 || colIndex === 6 || colIndex === 11) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colIndex === 9 || colIndex === 10) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        if (colIndex === 8) {
          cell.number_format = 'R$ #,##0.00';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        }

        if (colIndex === 9 && cell.value) {
          cell.number_format = 'dd/mm/yyyy';
        }

        if (colIndex === 10) {
          const statusText = String(cell.value).toUpperCase();
          cell.font = { name: 'Arial', size: 10, bold: true };
          if (statusText.includes('NÃO VIGENTE')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '991B1B' } };
          } else if (statusText.includes('<')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '92400E' } };
          } else if (statusText.includes('VIGENTE')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '065F46' } };
          }
        }
      });
    });

    // 4. AUTO-AJUSTE DAS LARGURAS
    worksheet.columns.forEach((column, i) => {
      if (i === 0) return column.width = 10;
      let maxLength = 0;
      column.eachCell({ includeEmpty: false }, (cell, rowIdx) => {
        if (rowIdx === 1) return;
        const valueStr = cell.value instanceof Date ? '10/10/2026' : String(cell.value);
        if (valueStr.length > maxLength) maxLength = valueStr.length;
      });
      column.width = maxLength < 12 ? 12 : maxLength > 45 ? 45 : maxLength + 4;
    });

    // 5. DOWNLOAD
    const buffer = await workbook.xlsx.writeBuffer();
    const dataBlob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(dataBlob, `DAC_SOP_Relatorio_Contratos_${new Date().toISOString().split('T')[0]}.xlsx`);

  } catch (error) {
    console.error("Erro crítico na exportação do Excel:", error);
    alert("Falha ao gerar arquivo Excel: " + error.message);
  }
};

// --- MÓDULO 2: EXPORTAÇÃO PDF BLINDADO (A4 PAISAGEM) ---
export const exportarParaPDF = (contratos) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); 
    doc.text("SECRETARIA DE OBRAS PÚBLICAS - RS", 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("Helvetica", "normal");
    doc.text(`Divisão de Aquisições e Contratos (DAC) • Extração Gerencial Emitida em ${new Date().toLocaleDateString('pt-BR')}`, 14, 21);

    const colunas = ["PROA", "Fornecedor Contratado", "Objeto Resumido", "Valor Atualizado", "Vigência", "Status"];
    
    const GridDados = contratos.map(c => [
      String(c.proaOriginal || c.id || '-'),
      String(c.fornecedorNome || '-').substring(0, 28),
      String(c.objeto || c.descricao || '-').substring(0, 50) + (String(c.objeto || c.descricao || '').length > 50 ? '...' : ''),
      c.valorTotal ? `R$ ${Number(c.valorTotal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'R$ 0,00',
      extrairDataTexto(c.vigenciaOficial),
      String(c.statusContrato || c.estagio || '[NÃO ATRIBUÍDO]')
    ]);

    // CORREÇÃO CIRÚRGICA NATIVA AQUI: Chamada isolada da função injetando o contexto do documento
    autoTable(doc, {
      head: [colunas],
      body: GridDados,
      startY: 25,
      theme: 'striped',
      headStyles: { fillColor: [44, 62, 80], fontStyle: 'bold', fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 8.5, font: "Helvetica", textColor: [50, 50, 50] },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    });

    doc.save(`DAC_SOP_Relatorio_Impressao_${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (error) {
    console.error("Erro crítico na exportação do PDF:", error);
    alert("Falha ao processar a impressão do PDF: " + error.message);
  }
};