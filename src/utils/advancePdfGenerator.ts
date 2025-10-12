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
}

export const generateAdvancePDF = async (data: AdvancePDFData): Promise<Blob> => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Gehaltsvorschuss - Quittung", 105, 20, { align: "center" });
  
  // Employee Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Mitarbeiter: ${data.employeeName}`, 20, 40);
  doc.text(`Personalnummer: ${data.employeeNumber}`, 20, 50);
  
  // Amount
  doc.setFont("helvetica", "bold");
  doc.text("Betrag:", 20, 65);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text(`€ ${data.amount.toFixed(2)}`, 20, 75);
  
  // Request Date
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Antragsdatum:", 20, 90);
  doc.setFont("helvetica", "normal");
  doc.text(
    format(new Date(data.requestDate), "dd.MM.yyyy", { locale: de }),
    20,
    100
  );
  
  // Notes
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Notizen:", 20, 115);
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(data.notes, 170);
    doc.text(splitNotes, 20, 125);
  }
  
  // Signature section
  const sigStartY = data.notes ? 155 : 125;
  
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