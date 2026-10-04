'use client';

import { Fragment } from 'react';
import type { ContractData } from './types';
import { energyTypeCnMap, bodyTypeCnMap } from './types';

interface Props {
  data: ContractData;
  id?: string;
}

function vehicleDesc(v: ContractData['vehicles'][0]): string {
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

export default function ContractPreview({ data, id = 'contract-preview' }: Props) {
  const subtotal = data.vehicles.reduce((sum, v) => sum + v.totalPrice, 0);
  const total = data.totalAmount || subtotal;
  const tolerance = data.tolerance || '5';

  const sellerAddr = data.seller.addressEn || data.seller.address;

  return (
    <div
      id={id}
      className="bg-white text-black font-sans"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm',
        fontSize: '10pt',
        lineHeight: 1.6,
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '12mm' }}>
        <div style={{ fontSize: '16pt', fontWeight: 700 }}>{data.seller.name || '—'}</div>
        {data.seller.nameEn && (
          <div style={{ fontSize: '11pt', marginTop: '2mm' }}>{data.seller.nameEn}</div>
        )}
        <h2 style={{ fontSize: '18pt', margin: '7mm 0 1mm' }}>销售合同</h2>
        <div>SALES CONTRACT</div>
      </div>

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm 12mm', marginBottom: '8mm', fontSize: '9.5pt' }}>
        <div><b>合同号 CONTRACT NO.:</b> {data.contractNo || '—'}</div>
        <div><b>日期 DATE:</b> {data.signDate || '—'}</div>
        <div><b>卖方 SELLER:</b> {data.seller.nameEn || data.seller.name || '—'}</div>
        <div><b>签约地点 SIGNED AT:</b> {data.signPlace || '—'}</div>
        <div style={{ gridColumn: '1 / -1' }}><b>卖方地址 SELLER ADDRESS:</b> {sellerAddr || '—'}</div>
        <div><b>买方 BUYER:</b> {data.buyer.name || '—'}</div>
        <div><b>电话 TELEPHONE:</b> {data.buyer.phone || '—'}</div>
        <div style={{ gridColumn: '1 / -1' }}><b>买方地址 BUYER ADDRESS:</b> {data.buyer.address || '—'}</div>
      </div>

      {/* Body */}
      <p style={{ margin: '3mm 0', fontSize: '9.5pt' }}>
        兹经买卖双方同意成交下列商品并订立条款如下：<br />
        The undersigned Sellers and Buyers have agreed to close the following transaction according to the terms stipulated below:
      </p>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', margin: '4mm 0' }}>
        <thead>
          <tr>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              唛头<br />MARKS
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              商品名称及规格<br />NAME &amp; SPECIFICATION
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              车架号<br />VIN
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              能源类型<br />ENERGY
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              数量<br />QTY
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              单价<br />UNIT PRICE
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              金额<br />AMOUNT
            </th>
            <th style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', background: '#f6f6f6' }}>
              成交方式<br />DELIVERY
            </th>
          </tr>
        </thead>
        <tbody>
          {data.vehicles.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', color: '#999', fontSize: '8.5pt' }}>
                No vehicles added / 请添加车辆信息
              </td>
            </tr>
          ) : (
            data.vehicles.map((v) => (
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
                  <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt', wordBreak: 'break-word' }}>
                    {data.deliveryTerms || '—'}
                  </td>
                </tr>
                {v.remarks ? (
                  <tr>
                    <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8pt', background: '#fafafa', color: '#555' }}>
                      备注<br />REMARKS
                    </td>
                    <td colSpan={7} style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'left', fontSize: '8pt', lineHeight: 1.45, color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
            <td colSpan={5} style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
              数量及总值均得有 {Number(tolerance) ? `${tolerance}% 增减 / ${tolerance}% more or less allowed` : '固定 / fixed'}
            </td>
            <td style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
              总值 TOTAL
            </td>
            <td colSpan={2} style={{ border: '0.3mm solid #777', padding: '2.3mm 1.7mm', textAlign: 'center', fontSize: '8.5pt' }}>
              {data.currency} {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Contract Clauses */}
      <div style={{ fontSize: '9.5pt' }}>
        <p style={{ margin: '3mm 0' }}>
          <b>(1) 车辆信息、数量及价格：</b>车辆的品牌、型号、车架号（VIN）、能源类型、数量、单价及合同总金额，以本合同车辆清单所列为准。<br />
          <b>Vehicle Details, Quantity and Price:</b> The brand, model, vehicle identification number (VIN), energy type, quantity, unit price and total contract value shall be as set out in the vehicle list of this Contract.
        </p>
        <p style={{ margin: '3mm 0' }}>
          <b>(2) 包装方式：</b>车辆应采用适合长途海运、铁路及公路运输的包装方式，并采取必要的防护措施，例如喷蜡保护。包装应有效防止车辆受到各种损坏和腐蚀。<br />
          <b>Packing:</b> The vehicle shall be packed in a manner suitable for long-distance shipping, railway, and highway transportation, with necessary protective measures such as wax spraying. The packaging should effectively protect the vehicle from all kinds of damages and corrosion.
        </p>
        <p style={{ margin: '3mm 0' }}>
          <b>(3) 付款条件：</b>电汇（T/T），100%预付。<br />
          <b>Terms of payment:</b> T/T，100% in advance .
        </p>
        <p style={{ margin: '3mm 0' }}>
          <b>(4) 装运口岸及目的地：</b>从 {data.loadingPort || 'Nansha Port, China'} 运往 {data.destinationPort || data.buyer.country || '—'}，收货人：{data.consignee?.name || data.buyer.name || '—'}。<br />
          <b>Loading port and destination:</b> From {data.loadingPort || 'Nansha Port, China'} to {data.destinationPort || data.buyer.country || '—'}. Consignee: {data.consignee?.name || data.buyer.name || '—'}.
        </p>
        <p style={{ margin: '3mm 0' }}>
          <b>(5) 发运前检验（PDI）：</b>买方有权在车辆发运前就车辆质量、规格、数量等进行准确和全面的检验。如因买方原因未能完成发运前检验，则卖方的检验结果应被视为有效。<br />
          <b>Pre-delivery Inspection (PDI):</b> The Buyer has the right to take a precise and comprehensive inspection of the vehicles regarding quality, specifications, quantity, etc. before shipment. If the Buyer fails to complete the PDI due to its own reasons, the Seller&apos;s inspection results shall be deemed valid.
        </p>
        <p style={{ margin: '3mm 0' }}>
          <b>(6) 车辆验收：</b>车辆交付后，买方应在十五（15）天内对车辆的数量、规格及表面状况进行检验。买方应提前通知卖方检验时间和地点，卖方有权委派代表参加检验。若买方在上述期限内未通知卖方任何不符情况，则视为所交付车辆符合双方约定。<br />
          <b>Vehicle Acceptance:</b> Within fifteen (15) days after delivery of the vehicles, the Buyer shall inspect the quantity, specifications and apparent condition of the vehicles. The Buyer shall notify the Seller of the inspection time and place in advance, and the Seller has the right to appoint a representative to participate in the inspection. If the Buyer fails to notify the Seller of any discrepancies within such period, the delivered vehicles shall be deemed compliant with this Contract.
        </p>
        <p style={{ margin: '3mm 0' }}>
          <b>(7) 认证：</b>如买方有产品认证需求，应在合同签署前向卖方提供详细、准确的认证标准要求，否则买方应承担因其疏忽造成的风险和损失。<br />
          <b>Certification:</b> If product certification is required, the Buyer shall provide detailed and accurate certification standard requirements to the Seller before signing this Contract. Otherwise, the Buyer shall bear its own risks and losses caused by its negligence.
        </p>
        <p style={{ margin: '3mm 0' }}>
          <b>(8) 知识产权：</b>除非本合同另有明确规定，本合同的签署和履行不构成卖方向买方授予任何知识产权许可。买方不得侵犯卖方或第三方的知识产权。<br />
          <b>Intellectual Property:</b> Unless otherwise stipulated herein, execution and performance of this Contract shall not be construed as granting any intellectual property license from the Seller to the Buyer. The Buyer shall not infringe the intellectual property rights of the Seller or any third party.
        </p>
        <p style={{ margin: '3mm 0' }}>
          <b>(9) 售后服务：</b>买方发现质量问题或需要维修时，应联系卖方售后服务团队并提供故障描述及购买信息。卖方将在收到申请后尽快评估并提供解决方案。联系人：李传豹，联系电话：+8615112502885。<br />
          <b>After-sales Service:</b> When the Buyer finds quality problems or requires repair, the Buyer shall contact the Seller&apos;s after-sales service team and provide fault description and purchase information. The Seller will evaluate and provide solutions as soon as possible. Contact person: Li Chuanbao, Tel: +8615112502885.
        </p>
        <p style={{ margin: '3mm 0' }}>
          <b>(10) 不可抗力：</b>因洪水、火灾、台风、雪灾、地震、传染病、罢工、政府行为和战争等不可抗力导致延期交货或不能交货的，卖方免除责任。卖方应及时通知买方并采取必要措施促进交付。<br />
          <b>Force Majeure:</b> The Seller shall not be liable for delay or non-delivery caused by force majeure events including but not limited to flood, fire, typhoon, snow disaster, earthquake, epidemic, strikes, acts of government and war. The Seller shall notify the Buyer timely and take necessary measures to facilitate delivery.
        </p>
        <p style={{ margin: '3mm 0' }}>
          <b>(11) 争议解决：</b>本合同适用中华人民共和国法律。因执行本合同发生的争议，双方应友好协商解决；协商不成的，提交中国国际经济贸易仲裁委员会仲裁。<br />
          <b>Dispute Resolution:</b> This Contract shall be governed by the laws of the People&apos;s Republic of China. Any dispute arising from or in connection with this Contract shall first be settled through friendly negotiation. Failing settlement, the dispute shall be submitted to CIETAC for arbitration.
        </p>
        <p style={{ margin: '3mm 0' }}>
          <b>(12) 生效时间和有效期：</b>本合同自双方代表签字或盖章之日起生效，有效期一年。<br />
          <b>Effective Date and Period of Validity:</b> This Contract shall come into force upon signature by representatives of both parties and remain valid for one (1) year.
        </p>
      </div>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20mm', marginTop: '18mm' }}>
        <div style={{ borderTop: '0.3mm solid #444', paddingTop: '2mm', fontSize: '9.5pt' }}>
          买方 The Buyers
        </div>
        <div style={{ borderTop: '0.3mm solid #444', paddingTop: '2mm', fontSize: '9.5pt' }}>
          卖方 The Sellers
        </div>
      </div>
    </div>
  );
}