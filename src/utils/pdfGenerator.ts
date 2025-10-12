import jsPDF from "jspdf";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface VacationPDFData {
  employeeName: string;
  employeeNumber: string;
  requestType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  notes?: string;
  employeeSignature?: string;
  adminSignature?: string;
  approvedAt?: string;
}

export const generateVacationPDF = async (data: VacationPDFData): Promise<Blob> => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Urlaubsantrag", 105, 20, { align: "center" });
  
  // Employee Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Mitarbeiter: ${data.employeeName}`, 20, 40);
  doc.text(`Personalnummer: ${data.employeeNumber}`, 20, 50);
  
  // Request Type
  let typeText = "Urlaub";
  switch (data.requestType) {
    case "sick":
      typeText = "Krankmeldung";
      break;
    case "unpaid":
      typeText = "Unbezahlter Urlaub";
      break;
    case "other":
      typeText = "Sonstiges";
      break;
  }
  doc.text(`Art: ${typeText}`, 20, 60);
  
  // Dates
  doc.setFont("helvetica", "bold");
  doc.text("Zeitraum:", 20, 75);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Von: ${format(new Date(data.startDate), "dd.MM.yyyy", { locale: de })}`,
    20,
    85
  );
  doc.text(
    `Bis: ${format(new Date(data.endDate), "dd.MM.yyyy", { locale: de })}`,
    20,
    95
  );
  doc.text(`Anzahl Tage: ${data.totalDays}`, 20, 105);
  
  // Notes
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Notizen:", 20, 120);
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(data.notes, 170);
    doc.text(splitNotes, 20, 130);
  }
  
  // Signatures
  const sigStartY = data.notes ? 160 : 130;
  
  doc.setFont("helvetica", "bold");
  doc.text("Unterschriften:", 20, sigStartY);
  
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
  }
  
  // Admin Signature
  if (data.adminSignature) {
    doc.text("Administrator:", 110, sigStartY + 15);
    try {
      doc.addImage(data.adminSignature, "PNG", 110, sigStartY + 20, 60, 20);
    } catch (error) {
      console.error("Error adding admin signature image:", error);
      doc.setFontSize(10);
      doc.text("(Signatur nicht verfügbar)", 110, sigStartY + 30);
    }
  }
  
  // Approval Date
  if (data.approvedAt) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Genehmigt am: ${format(new Date(data.approvedAt), "dd.MM.yyyy HH:mm", { locale: de })}`,
      20,
      sigStartY + 50
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
