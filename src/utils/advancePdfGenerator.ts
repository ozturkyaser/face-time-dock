import jsPDF from "jspdf";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface AdvancePDFData {
  employeeName: string;
  employeeNumber: string;
  amount: number;
  requestDate: string;
  notes?: string;
  employeeSignature?: string;
  approvedAt?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyLogoUrl?: string;
}

export const generateAdvancePDF = async (data: AdvancePDFData): Promise<Blob> => {
  const doc = new jsPDF();
  
  let startY = 20;

  // Company Logo and Info
  if (data.companyLogoUrl || data.companyName) {
    if (data.companyLogoUrl) {
      try {
        doc.addImage(data.companyLogoUrl, "PNG", 20, startY, 40, 20);
      } catch (error) {
        console.error("Error adding company logo:", error);
      }
    }

    if (data.companyName) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(data.companyName, data.companyLogoUrl ? 70 : 20, startY + 5);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      let infoY = startY + 10;
      
      if (data.companyAddress) {
        const addressLines = doc.splitTextToSize(data.companyAddress, 80);
        doc.text(addressLines, data.companyLogoUrl ? 70 : 20, infoY);
        infoY += addressLines.length * 3;
      }
      if (data.companyPhone) {
        doc.text(`Tel: ${data.companyPhone}`, data.companyLogoUrl ? 70 : 20, infoY);
        infoY += 3;
      }
      if (data.companyEmail) {
        doc.text(`E-Mail: ${data.companyEmail}`, data.companyLogoUrl ? 70 : 20, infoY);
        infoY += 3;
      }
      if (data.companyWebsite) {
        doc.text(`Web: ${data.companyWebsite}`, data.companyLogoUrl ? 70 : 20, infoY);
      }
    }

    startY += 35;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, startY, 190, startY);
    startY += 10;
  }
  
  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Gehaltsvorschuss - Quittung", 105, startY, { align: "center" });
  startY += 10;
  
  // Employee Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Mitarbeiter: ${data.employeeName}`, 20, startY + 10);
  doc.text(`Personalnummer: ${data.employeeNumber}`, 20, startY + 20);
  
  // Amount
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Betrag:", 20, startY + 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text(`€ ${data.amount.toFixed(2)}`, 20, startY + 45);
  
  // Request Date
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Antragsdatum:", 20, startY + 60);
  doc.setFont("helvetica", "normal");
  doc.text(
    format(new Date(data.requestDate), "dd.MM.yyyy", { locale: de }),
    20,
    startY + 70
  );
  
  // Notes
  let notesEndY = startY + 70;
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Notizen:", 20, startY + 85);
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(data.notes, 170);
    doc.text(splitNotes, 20, startY + 95);
    notesEndY = startY + 95 + (splitNotes.length * 5);
  }
  
  // Signature section
  const sigStartY = data.notes ? notesEndY + 20 : startY + 85;
  
  doc.setFont("helvetica", "bold");
  doc.text("Empfangsbestätigung:", 20, sigStartY);
  
  // Employee Signature
  if (data.employeeSignature) {
    doc.text("Mitarbeiter:", 20, sigStartY + 15);
    try {
      doc.addImage(data.employeeSignature, "PNG", 20, sigStartY + 20, 60, 20);
    } catch (error) {
      console.error("Error adding employee signature image:", error);
      doc.setFontSize(10);
      doc.text("(Signatur nicht verfügbar)", 20, sigStartY + 30);
    }
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Ich bestätige den Erhalt des Gehaltsvorschusses.", 20, sigStartY + 45);
  }
  
  // Approval Date
  if (data.approvedAt) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Genehmigt am: ${format(new Date(data.approvedAt), "dd.MM.yyyy HH:mm", { locale: de })}`,
      20,
      sigStartY + 60
    );
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generiert am: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`,
    105,
    280,
    { align: "center" }
  );
  
  return doc.output("blob");
};