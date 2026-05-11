import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${fileName}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
};

export const exportToPDF = (
    title: string,
    headers: string[],
    data: any[][],
    fileName: string,
    summaryStats: { label: string; value: string | number }[]
) => {
    const doc = new jsPDF() as any;
    
    // Title
    doc.setFontSize(20);
    doc.text(title, 14, 22);
    
    // Date
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 30);

    // Summary Stats
    let currentY = 40;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Panorama Geral:', 14, currentY);
    currentY += 7;
    
    doc.setFont('helvetica', 'normal');
    summaryStats.forEach(stat => {
        doc.text(`${stat.label}: ${stat.value}`, 14, currentY);
        currentY += 6;
    });

    currentY += 10;

    // Table
    doc.autoTable({
        startY: currentY,
        head: [headers],
        body: data,
        theme: 'striped',
        headStyles: { fillStyle: '#4f46e5' },
    });

    doc.save(`${fileName}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
};
