import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// 假設你的 Transaction 型別長這樣，請替換成你真實的型別
type Transaction = {
  id: number;
  date: string;
  amount: number;
  note: string;
  category: { name: string; type: 'expense' | 'income' };
};

/**
 * 匯出成 PDF
 */
export const exportToPDF = async (transactions: Transaction[], title: string) => {
  try {
    // 1. 動態生成 HTML 內容
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

    // 2. 將 HTML 轉成 PDF
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    // 3. 呼叫系統分享/儲存
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  } catch (error) {
    console.error('匯出 PDF 失敗', error);
  }
};

/**
 * 匯出成 Excel (CSV 格式)
 */
export const exportToCSV = async (transactions: Transaction[], title: string) => {
  try {
    // 1. 組合 CSV 字串，加上 \uFEFF 是為了讓 Excel 正確識別 UTF-8 (避免中文亂碼)
    let csvString = '\uFEFF日期,類別,類型,金額,備註\n';
    
    transactions.forEach(tx => {
      const typeStr = tx.category?.type === 'income' ? '收入' : '支出';
      const categoryName = tx.category?.name || '未分類';
      const note = tx.note ? tx.note.replace(/,/g, '，') : ''; // 避免備註裡的逗號破壞 CSV 格式
      
      csvString += `${tx.date},${categoryName},${typeStr},${tx.amount},${note}\n`;
    });

    // 2. 定義檔案路徑
    const filename = `${title.replace(/\s/g, '_')}_報表.csv`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // 3. 寫入檔案
    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // 4. 呼叫系統分享/儲存
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: '匯出財務報表',
      });
    }
  } catch (error) {
    console.error('匯出 CSV 失敗', error);
  }
};