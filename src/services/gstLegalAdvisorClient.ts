import {
  GstLegalQueryType,
  GstLegalAdviceResponse,
  GstNoticeAttachment,
} from '../types';

export interface SendGstQueryOptions {
  queryType: GstLegalQueryType;
  userPrompt: string;
  attachment?: GstNoticeAttachment;
  chatHistory?: Array<{ role: 'user' | 'model'; text: string }>;
  companyGstin?: string;
  companyName?: string;
}

/**
 * Call server-side GST Legal AI endpoint
 */
export async function queryGstLegalAdvisor(
  options: SendGstQueryOptions
): Promise<GstLegalAdviceResponse> {
  const response = await fetch('/api/ai/gst-legal-advisor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GST Legal Advisor API request failed (${response.status}): ${errorText || response.statusText}`
    );
  }

  const json = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Invalid response from GST Legal Advisor');
  }

  return json.data as GstLegalAdviceResponse;
}

/**
 * Helper to convert uploaded File into GstNoticeAttachment with base64 data
 */
export async function fileToNoticeAttachment(file: File): Promise<GstNoticeAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;

      resolve({
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        base64,
        extractedText: undefined,
      });
    };

    reader.onerror = (err) => {
      reject(err);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Export Draft Pleading / Notice Reply as formatted Text file (.doc compatible)
 */
export function downloadNoticeReplyDoc(
  title: string,
  content: string,
  filename = 'GST_Notice_Written_Submission.doc'
) {
  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Print Legal Advisory Report / Notice Reply with professional styling
 */
export function printLegalDocument(title: string, htmlContent: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.6;
            margin: 40px;
            color: #111;
          }
          h1, h2, h3 {
            font-family: 'Arial', sans-serif;
            color: #0b3d2c;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0b3d2c;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .preliminary, .grounds {
            background-color: #f8faf9;
            border-left: 4px solid #0b3d2c;
            padding: 10px 15px;
            margin: 15px 0;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .table th, .table td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
          }
          .table th {
            background-color: #eaf1ed;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #ccc;
            padding-top: 10px;
            font-size: 11px;
            color: #666;
          }
          @media print {
            body { margin: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>OFFICE OF TAX ADVOCATE & LEGAL COUNSEL</h2>
          <h4>STATUTORY GST LEGAL ADVISORY & RECONCILIATION PORTAL</h4>
          <p><strong>DOCUMENT:</strong> ${title} | <strong>DATE:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
        </div>
        ${htmlContent}
        <div class="footer">
          <p>Generated via GST Legal AI Portal | Governed under the Central Goods and Services Tax Act, 2017 & relevant CBIC Circulars.</p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
