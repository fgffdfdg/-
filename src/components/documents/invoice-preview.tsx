'use client';

import { Fragment } from 'react';
import type { InvoiceData } from './types';
import { energyTypeCnMap, bodyTypeCnMap } from './types';

interface Props {
  data: InvoiceData;
  id?: string;
}

function vehicleDesc(v: InvoiceData['vehicles'][0]): string {
  const parts = [
    v.condition === 'New' ? '新' : '旧',
    v.brand,
    v.model,
    energyTypeCnMap[v.energyType || ''] || v.energyType || '',
    bodyTypeCnMap[v.bodyType || ''] || v.bodyType || '',
    v.power ? `${v.power}kW` : '',
  ].filter(Boolean).join(' ');
  const enParts = [
    v.condition || '',
    v.brandEn || v.brand,
    v.model,
    v.energyType || '',
    v.bodyType || '',
    v.power ? `${v.power}kW` : '',
  ].filter(Boolean).join(' ');
  return `${parts} / ${enParts}`;
}

function numberToWords(n: number): string {
  if (!n || !Number.isFinite(n)) return 'ZERO';
  const num = Math.round(n);
  if (num === 0) return 'ZERO';
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  function convert(n: number): string {
    const parts: string[] = [];
    if (n >= 100) { parts.push(ones[Math.floor(n / 100)] + ' HUNDRED'); n %= 100; }
    if (n >= 20) { parts.push(tens[Math.floor(n / 10)]); n %= 10; if (n) parts.push(ones[n]); }
    else if (n > 0) parts.push(ones[n]);
    return parts.join(' ');
  }
  const result: string[] = [];
  let remaining = num;
  if (remaining >= 1e9) { result.push(convert(Math.floor(remaining / 1e9)) + ' BILLION'); remaining %= 1e9; }
  if (remaining >= 1e6) { result.push(convert(Math.floor(remaining / 1e6)) + ' MILLION'); remaining %= 1e6; }
  if (remaining >= 1e3) { result.push(convert(Math.floor(remaining / 1e3)) + ' THOUSAND'); remaining %= 1e3; }
  if (remaining > 0) result.push(convert(remaining));
  return result.join(' ');
}

const CURRENCY_WORDS: Record<string, string> = {
  USD: 'US DOLLARS', EUR: 'EUROS', CNY: 'CHINESE YUAN', GBP: 'POUNDS STERLING',
};

export default function InvoicePreview({ data, id = 'invoice-preview' }: Props) {
  const subtotal = data.vehicles.reduce((sum, v) => sum + v.totalPrice, 0);
  const total = data.totalAmount || subtotal;
  const totalQty = data.vehicles.reduce((s, v) => s + v.quantity, 0);

  return (
    <div
      id={id}
      className="bg-white text-black font-sans"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm',
        fontSize: '10pt',
        lineHeight: 1.5,
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '12mm' }}>
        <div style={{ fontSize: '16pt', fontWeight: 700 }}>{data.seller.name || '—'}</div>
        {data.seller.nameEn && (
          <div style={{ fontSize: '11pt', marginTop: '2mm' }}>{data.seller.nameEn}</div>
        )}
        <h2 style={{ fontSize: '18pt', margin: '7mm 0 1mm' }}>发 票</h2>
        <div>COMMERCIAL INVOICE</div>
      </div>

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm 12mm', marginBottom: '8mm', fontSize: '9.5pt' }}>
        <div><b>收货人 TO:</b> {data.buyer.name || '—'}</div>
        <div><b>日期 DATE:</b> {data.invoiceDate || '—'}</div>
        <div><b>目的国 DESTINATION:</b> {data.buyer.country || '—'}</div>
        <div><b>发票号 INVOICE NO.:</b> {data.invoiceNo || '—'}</div>
        <div style={{ gridColumn: '1 / -1' }}>
          <b>成交方式 TERMS OF DELIVERY:</b> {data.tradeTerms || '—'}{data.tradePlace ? `, ${data.tradePlace}` : ''}
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', margin: '4mm 0' }}>
        <thead>
          <tr>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              唛头<br />MARKS
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6', width: '27%' }}>
              货物描述<br />DESCRIPTION OF GOODS
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              车架号<br />VIN
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              能源类型<br />ENERGY TYPE
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              数量<br />QTY
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              单价<br />UNIT PRICE
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              总价<br />TOTAL AMOUNT
            </th>
          </tr>
        </thead>
        <tbody>
          {data.vehicles.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', color: '#999', fontSize: '8.5pt' }}>
                No vehicles added / 请添加车辆信息
              </td>
            </tr>
          ) : (
            data.vehicles.map((v, i) => (
              <Fragment key={v.id}>
                <tr>
                  <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', wordBreak: 'break-word' }}>
                    {v.marks || 'N/M'}
                  </td>
                  <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'left', fontSize: '8.5pt', wordBreak: 'break-word' }}>
                    {vehicleDesc(v)}
                  </td>
                  <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', wordBreak: 'break-word' }}>
                    {v.vin || '—'}
                  </td>
                  <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', wordBreak: 'break-word' }}>
                    {energyTypeCnMap[v.energyType || ''] || v.energyType || '—'}<br />{v.energyType || ''}
                  </td>
                  <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
                    {v.quantity}
                  </td>
                  <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', wordBreak: 'break-word' }}>
                    {data.currency} {v.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', wordBreak: 'break-word' }}>
                    {data.currency} {v.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {v.remarks ? (
                  <tr>
                    <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8pt', background: '#fafafa', color: '#555' }}>
                      备注<br />REMARKS
                    </td>
                    <td colSpan={6} style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'left', fontSize: '8pt', lineHeight: 1.45, color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {v.remarks}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={4} style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
              合计 TOTAL
            </td>
            <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
              {totalQty}
            </td>
            <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
              总货值<br />TOTAL {data.tradeTerms || ''} VALUE
            </td>
            <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
              {data.currency} {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Words */}
      <div style={{ fontWeight: 700, marginTop: '6mm', fontSize: '9pt' }}>
        SAY {CURRENCY_WORDS[data.currency] || data.currency} {numberToWords(total)} ONLY.
      </div>
    </div>
  );
}