import * as path from 'path';
import { existsSync } from 'fs';

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');

export const PDF_FONT = existsSync(path.join(FONT_DIR, 'plus-jakarta-sans-regular.ttf'))
  ? 'PlusJakarta'
  : 'Helvetica';
export const PDF_FONT_BOLD = existsSync(path.join(FONT_DIR, 'plus-jakarta-sans-700.ttf'))
  ? 'PlusJakarta-Bold'
  : 'Helvetica-Bold';

export const SEGOE_FONT = existsSync(path.join(FONT_DIR, 'segoeui.ttf')) ? 'SegoeUI' : 'Helvetica';
export const SEGOE_FONT_BOLD = existsSync(path.join(FONT_DIR, 'segoeuib.ttf')) ? 'SegoeUI-Bold' : 'Helvetica-Bold';

export const registerUiFonts = (doc: PDFKit.PDFDocument) => {
  const regular = path.join(FONT_DIR, 'plus-jakarta-sans-regular.ttf');
  const bold = path.join(FONT_DIR, 'plus-jakarta-sans-700.ttf');
  if (existsSync(regular)) doc.registerFont('PlusJakarta', regular);
  if (existsSync(bold)) doc.registerFont('PlusJakarta-Bold', bold);
  const sregular = path.join(FONT_DIR, 'segoeui.ttf');
  const sbold = path.join(FONT_DIR, 'segoeuib.ttf');
  if (existsSync(sregular)) doc.registerFont('SegoeUI', sregular);
  if (existsSync(sbold)) doc.registerFont('SegoeUI-Bold', sbold);
};
