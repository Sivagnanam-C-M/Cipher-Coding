import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

export interface ScoreSheetRow {
  rank: number;
  name: string;
  college: string;
  score: number;
  completionTime: string;
}

function escapeXml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function generateExcelScoreSheet(rows: ScoreSheetRow[]): Promise<Buffer> {
  const templatePath = path.join(
    process.cwd(),
    'src',
    'templates',
    'Cybersentinel_2K26_Score_Sheet_Template.xlsx'
  );

  const templateBuffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);

  const totalDataRows = Math.max(10, rows.length);
  const startRow = 6;
  const lastDataRow = startRow + totalDataRows - 1;
  const sigRow = lastDataRow + 2;

  let rowsXml = '';
  // Top header rows (1-5) preserving exact styling and logos
  rowsXml += '<row r="1" spans="1:5" ht="42" customHeight="1" x14ac:dyDescent="0.25"><c r="B1" s="6" t="s"><v>0</v></c><c r="C1" s="7"/><c r="D1" s="7"/></row>';
  rowsXml += '<row r="2" spans="1:5" ht="30" customHeight="1" x14ac:dyDescent="0.25"><c r="B2" s="8" t="s"><v>1</v></c><c r="C2" s="7"/><c r="D2" s="7"/></row>';
  rowsXml += '<row r="3" spans="1:5" ht="24" customHeight="1" x14ac:dyDescent="0.25"><c r="B3" s="10" t="s"><v>2</v></c><c r="C3" s="7"/><c r="D3" s="7"/></row>';
  rowsXml += '<row r="4" spans="1:5" ht="12" customHeight="1" x14ac:dyDescent="0.25"/>';
  rowsXml += '<row r="5" spans="1:5" ht="27.95" customHeight="1" x14ac:dyDescent="0.25"><c r="A5" s="1" t="s"><v>3</v></c><c r="B5" s="1" t="s"><v>4</v></c><c r="C5" s="1" t="s"><v>5</v></c><c r="D5" s="1" t="s"><v>6</v></c><c r="E5" s="1" t="s"><v>7</v></c></row>';

  // Populate participant rows with alternating styles
  for (let i = 0; i < totalDataRows; i++) {
    const rowNum = startRow + i;
    const isOdd = i % 2 === 1;
    const styleNum = isOdd ? 4 : 2;
    const styleText = isOdd ? 5 : 3;

    if (i < rows.length) {
      const r = rows[i];
      rowsXml += `<row r="${rowNum}" spans="1:5" ht="30.95" customHeight="1" x14ac:dyDescent="0.25">`;
      rowsXml += `<c r="A${rowNum}" s="${styleNum}"><v>${r.rank}</v></c>`;
      rowsXml += `<c r="B${rowNum}" s="${styleText}" t="inlineStr"><is><t>${escapeXml(r.name)}</t></is></c>`;
      rowsXml += `<c r="C${rowNum}" s="${styleText}" t="inlineStr"><is><t>${escapeXml(r.college)}</t></is></c>`;
      rowsXml += `<c r="D${rowNum}" s="${styleNum}"><v>${r.score}</v></c>`;
      rowsXml += `<c r="E${rowNum}" s="${styleNum}" t="inlineStr"><is><t>${escapeXml(r.completionTime)}</t></is></c>`;
      rowsXml += `</row>`;
    } else {
      // Empty placeholder styled row to maintain grid aesthetics
      rowsXml += `<row r="${rowNum}" spans="1:5" ht="30.95" customHeight="1" x14ac:dyDescent="0.25">`;
      rowsXml += `<c r="A${rowNum}" s="${styleNum}"/>`;
      rowsXml += `<c r="B${rowNum}" s="${styleText}"/>`;
      rowsXml += `<c r="C${rowNum}" s="${styleText}"/>`;
      rowsXml += `<c r="D${rowNum}" s="${styleNum}"/>`;
      rowsXml += `<c r="E${rowNum}" s="${styleNum}"/>`;
      rowsXml += `</row>`;
    }
  }

  // Evaluator's Signature row at the bottom
  rowsXml += `<row r="${sigRow}" spans="1:5" ht="27.95" customHeight="1" x14ac:dyDescent="0.25">`;
  rowsXml += `<c r="A${sigRow}" s="9" t="s"><v>8</v></c>`;
  rowsXml += `<c r="B${sigRow}" s="7"/><c r="C${sigRow}" s="7"/><c r="D${sigRow}" s="7"/><c r="E${sigRow}" s="7"/>`;
  rowsXml += `</row>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac xr xr2 xr3" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" xmlns:xr2="http://schemas.microsoft.com/office/spreadsheetml/2015/revision2" xmlns:xr3="http://schemas.microsoft.com/office/spreadsheetml/2016/revision3" xr:uid="{00000000-0001-0000-0000-000000000000}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:E${sigRow}"/><sheetViews><sheetView showGridLines="0" tabSelected="1" workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A6" sqref="A6"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15" x14ac:dyDescent="0.25"/><cols><col min="1" max="1" width="13" customWidth="1"/><col min="2" max="2" width="27" customWidth="1"/><col min="3" max="3" width="34" customWidth="1"/><col min="4" max="5" width="14" customWidth="1"/></cols><sheetData>${rowsXml}</sheetData><autoFilter ref="A5:E${lastDataRow}" xr:uid="{00000000-0009-0000-0000-000000000000}"/><mergeCells count="4"><mergeCell ref="B1:D1"/><mergeCell ref="B2:D2"/><mergeCell ref="B3:D3"/><mergeCell ref="A${sigRow}:E${sigRow}"/></mergeCells><pageMargins left="0.25" right="0.25" top="0.35" bottom="0.35" header="0.5" footer="0.5"/><pageSetup paperSize="9" orientation="landscape"/><headerFooter><oddHeader>&amp;C&amp;BCypher Coding Evaluation Sheet</oddHeader><oddFooter>&amp;CPage &amp;P of &amp;N</oddFooter></headerFooter><drawing r:id="rId1"/></worksheet>`;

  zip.file('xl/worksheets/sheet1.xml', sheetXml);

  const generatedBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return generatedBuffer;
}
