'use client';

import type { PackingListData } from './types';
import { energyTypeCnMap, bodyTypeCnMap } from './types';

interface Props {
  data: PackingListData;
  id?: string;
}

function vehicleDesc(v: PackingListData['vehicles'][0]): string {
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

export default function PackingListPreview({ data, id = 'packing-list-preview' }: Props) {
  const totalNet = data.vehicles.reduce((s, v) => s + (v.netWeight || 0), 0);
  const totalGross = data.vehicles.reduce((s, v) => s + (v.grossWeight || 0), 0);
  const totalPkgs = data.vehicles.reduce((s, v) => s + (v.packages || 1), 0);

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
        <h2 style={{ fontSize: '18pt', margin: '7mm 0 1mm' }}>装箱单</h2>
        <div>PACKING LIST</div>
      </div>

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm 12mm', marginBottom: '8mm', fontSize: '9.5pt' }}>
        <div><b>收货人 TO:</b> {data.buyer.name || '—'}</div>
        <div><b>日期 DATE:</b> {data.plDate || '—'}</div>
        <div><b>目的国 DESTINATION:</b> {data.buyer.country || '—'}</div>
        <div><b>发票号 INVOICE NO.:</b> {data.plNo || '—'}</div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', margin: '4mm 0' }}>
        <thead>
          <tr>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              唛头<br />MARKS
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6', width: '29%' }}>
              货物描述<br />DESCRIPTION OF GOODS
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              车架号<br />VIN
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              能源类型<br />ENERGY TYPE
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              净重(千克)<br />NET WEIGHT (KG)
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              毛重(千克)<br />GROSS WEIGHT (KG)
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              件数<br />PKGS
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
            data.vehicles.map((v) => (
              <tr key={v.id}>
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
                  {v.netWeight || '—'}
                </td>
                <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
                  {v.grossWeight || '—'}
                </td>
                <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
                  {v.packages || 1}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={4} style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
              合计 TOTAL
            </td>
            <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
              {totalNet}
            </td>
            <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
              {totalGross}
            </td>
            <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
              {totalPkgs}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}