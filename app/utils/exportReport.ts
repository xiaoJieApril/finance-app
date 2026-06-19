import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Transaction } from '@/type';

export const exportToPDF = async (transactions: Transaction[], title: string) => {
  try {
    const tableRows = transactions.map(tx => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${tx.date}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${tx.category?.name || '未分類'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${tx.category?.type === 'income' ? '+' : '-'} RM ${tx.amount}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${tx.note || ''}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #4f46e5; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f8fafc; padding: 12px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>${title} - 財務報表</h1>
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>類別</th>
                <th>金額</th>
                <th>備註</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  } catch (error) {
    console.error('匯出 PDF 失敗', error);
  }
};

export const exportToCSV = async (transactions: Transaction[], title: string) => {
  try {
    let csvString = '\uFEFF日期,類別,類型,金額,備註\n';
    
    transactions.forEach(tx => {
      const typeStr = tx.category?.type === 'income' ? '收入' : '支出';
      const categoryName = tx.category?.name || '未分類';
      const note = tx.note ? tx.note.replace(/,/g, '，') : '';
      
      csvString += `${tx.date},${categoryName},${typeStr},${tx.amount},${note}\n`;
    });

    const filename = `${title.replace(/\s/g, '_')}_報表.csv`;
    const file = new File(Paths.document, filename);

    file.create({ overwrite: true });
    file.write(csvString);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: '匯出財務報表',
      });
    }
  } catch (error) {
    console.error('匯出 CSV 失敗', error);
  }
};
