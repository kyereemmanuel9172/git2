export const PDF_FONT = 'Helvetica';
export const PDF_FONT_BOLD = 'Helvetica-Bold';

export const SEGOE_FONT = 'Helvetica';
export const SEGOE_FONT_BOLD = 'Helvetica-Bold';

export const registerUiFonts = (doc: PDFKit.PDFDocument) => {
  doc.font(PDF_FONT);
};