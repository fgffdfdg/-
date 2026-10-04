'use client';

import type { ExportLicenseMainData, ExportLicenseItem } from './types';

interface Props {
  data: ExportLicenseMainData;
  id?: string;
}

function fmtNum(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function totals(items: ExportLicenseItem[]) {
  const quantity = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const amountInUsd = items.reduce(
    (s, i) => s + (Number(i.amountInUsd) || 0),
    0,
  );
  // 原币合计：所有明细币种一致时展示；否则显示 "—"
  const currencies = new Set(items.map((i) => i.currency || 'CNY'));
  const singleCurrency = currencies.size === 1 ? [...currencies][0] : '';
  const amount = singleCurrency
    ? items.reduce((s, i) => s + (Number(i.amountUsd) || 0), 0)
    : 0;
  return { quantity, amount, amountInUsd, singleCurrency };
}

/**
 * 中华人民共和国出口许可证（主证）— A4 纵向，严格单页
 *
 * 关键设计：
 * 1. 序号（1. 2. 3. …）内联在标签单元格内，不再单独占列，
 *    标签列有足够宽度放下 "Country/Region of purchase" 这类长英文。
 * 2. 页面由上下两张表组成：
 *    - 上表 4 列（标签 | 值 | 标签 | 值）承载 1–11 栏；
 *    - 下表 6 列承载 12–21 栏（明细 + 总计 + 备注/签章/发证日期）。
 *    上下表之间用 -1px margin 消除双边框，视觉上是一张完整表格。
 * 3. 列宽独立，互不干扰；明细"规格"列可以占更大比例。
 */
export default function ExportLicenseMainPreview({
  data,
  id = 'export-license-main-preview',
}: Props) {
  const t = totals(data.items);
  const blankRows = Math.max(0, 4 - data.items.length);
  const items: ExportLicenseItem[] = [
    ...data.items,
    ...Array.from({ length: blankRows }, (_, i) => ({
      id: `__blank_${i}`,
      specification: '',
      unit: '',
      quantity: 0,
      currency: 'CNY',
      unitPriceUsd: 0,
      amountUsd: 0,
      amountInUsd: 0,
    })),
  ];

  return (
    <div
      id={id}
      className="license-page bg-white text-black"
      style={{
        width: '210mm',
        height: '297mm',
        maxHeight: '297mm',
        overflow: 'hidden',
        padding: '8mm 10mm 16mm',
        fontFamily: '"SimSun", "Songti SC", "Microsoft YaHei", serif',
        fontSize: '10pt',
        lineHeight: 1.4,
        color: '#000',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        pageBreakAfter: 'always',
        breakAfter: 'page',
      }}
    >
      <header style={{ textAlign: 'center', marginBottom: '2mm', flexShrink: 0 }}>
        <h1
          style={{
            fontSize: '20pt',
            fontWeight: 700,
            margin: 0,
            letterSpacing: '4px',
            lineHeight: 1.2,
          }}
        >
          中华人民共和国出口许可证
        </h1>
        <p
          style={{
            fontSize: '11pt',
            margin: '2mm 0 0 0',
            fontFamily: '"Times New Roman", serif',
            fontWeight: 700,
            letterSpacing: '0.3px',
            lineHeight: 1.2,
          }}
        >
          EXPORT LICENCE OF THE PEOPLE&apos;S REPUBLIC OF CHINA
        </p>
      </header>

      {/* ── 上部：1–11 栏，4 列表 ── */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          flexShrink: 0,
          marginBottom: '-1px',
        }}
      >
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '26%' }} />
        </colgroup>
        <tbody>
          {/* 1 / 3 */}
          <tr>
            <td rowSpan={2} style={topStyles.labelCell}>
              <span style={topStyles.noText}>1.</span>
              <span style={{ marginLeft: '4px' }}>出口商：</span>
              <div style={topStyles.en}>Exporter</div>
            </td>
            <td style={topStyles.codeCell}>
              <div>{data.exporterKeyNo || '\u00A0'}</div>
              <div style={{ height: '0.7em' }}>{'\u00A0'}</div>
              <div>{data.exporterCode || '\u00A0'}</div>
            </td>
            <td rowSpan={2} style={topStyles.labelCell}>
              <span style={topStyles.noText}>3.</span>
              <span style={{ marginLeft: '4px' }}>出口许可证号：</span>
              <div style={topStyles.en}>Export licence No.</div>
            </td>
            <td
              rowSpan={2}
              style={{ ...topStyles.valueCell, textAlign: 'center', fontWeight: 700 }}
            >
              {data.exportLicenseNo || '\u00A0'}
            </td>
          </tr>
          <tr>
            <td style={topStyles.nameCell}>{data.exporterName || '\u00A0'}</td>
          </tr>

          {/* 2 / 4 */}
          <tr>
            <td rowSpan={2} style={topStyles.labelCell}>
              <span style={topStyles.noText}>2.</span>
              <span style={{ marginLeft: '4px' }}>发货人：</span>
              <div style={topStyles.en}>Consignor</div>
            </td>
            <td style={topStyles.codeCell}>
              <div>{data.consignorKeyNo || '\u00A0'}</div>
              <div style={{ height: '0.7em' }}>{'\u00A0'}</div>
              <div>{data.consignorCode || '\u00A0'}</div>
            </td>
            <td rowSpan={2} style={topStyles.labelCell}>
              <span style={topStyles.noText}>4.</span>
              <span style={{ marginLeft: '4px' }}>出口许可证有效截止日期：</span>
              <div style={topStyles.en}>Export licence expiry date</div>
            </td>
            <td rowSpan={2} style={{ ...topStyles.valueCell, textAlign: 'center' }}>
              {data.expiryDate || '\u00A0'}
            </td>
          </tr>
          <tr>
            <td style={topStyles.nameCell}>{data.consignorName || '\u00A0'}</td>
          </tr>

          {/* 5 / 8 */}
          <tr style={{ height: '10mm' }}>
            <td style={topStyles.labelCell}>
              <span style={topStyles.noText}>5.</span>
              <span style={{ marginLeft: '4px' }}>贸易方式：</span>
              <div style={topStyles.en}>Terms of trade</div>
            </td>
            <td style={topStyles.valueCell}>{data.termsOfTrade || '\u00A0'}</td>
            <td style={topStyles.labelCell}>
              <span style={topStyles.noText}>8.</span>
              <span style={{ marginLeft: '4px' }}>进口国（地区）：</span>
              <div style={topStyles.en}>Country/Region of purchase</div>
            </td>
            <td style={topStyles.valueCell}>
              {data.countryOfPurchase || '\u00A0'}
            </td>
          </tr>

          {/* 6 / 9 */}
          <tr style={{ height: '10mm' }}>
            <td style={topStyles.labelCell}>
              <span style={topStyles.noText}>6.</span>
              <span style={{ marginLeft: '4px' }}>合同号：</span>
              <div style={topStyles.en}>Contract No.</div>
            </td>
            <td
              style={{
                ...topStyles.valueCell,
                fontFamily: '"Courier New", monospace',
              }}
            >
              {data.contractNo || '\u00A0'}
            </td>
            <td style={topStyles.labelCell}>
              <span style={topStyles.noText}>9.</span>
              <span style={{ marginLeft: '4px' }}>付款方式：</span>
              <div style={topStyles.en}>Payment</div>
            </td>
            <td style={topStyles.valueCell}>{data.payment || '\u00A0'}</td>
          </tr>

          {/* 7 / 10 */}
          <tr style={{ height: '10mm' }}>
            <td style={topStyles.labelCell}>
              <span style={topStyles.noText}>7.</span>
              <span style={{ marginLeft: '4px' }}>报关口岸：</span>
              <div style={topStyles.en}>Place of clearance</div>
            </td>
            <td style={topStyles.valueCell}>
              {data.placeOfClearance || '\u00A0'}
            </td>
            <td style={topStyles.labelCell}>
              <span style={topStyles.noText}>10.</span>
              <span style={{ marginLeft: '4px' }}>运输方式：</span>
              <div style={topStyles.en}>Mode of transport</div>
            </td>
            <td style={topStyles.valueCell}>
              {data.modeOfTransport || '\u00A0'}
            </td>
          </tr>

          {/* 11 */}
          <tr style={{ height: '17mm' }}>
            <td style={topStyles.labelCell}>
              <span style={topStyles.noText}>11.</span>
              <span style={{ marginLeft: '4px' }}>商品名称：</span>
              <div style={topStyles.en}>Description of goods</div>
            </td>
            <td
              style={{
                ...topStyles.valueCell,
                textAlign: 'left',
                lineHeight: 1.45,
              }}
            >
              {data.descriptionOfGoods || '\u00A0'}
            </td>
            <td style={topStyles.labelCell}>
              <div
                style={{
                  textAlign: 'right',
                  fontWeight: 600,
                  marginBottom: '3px',
                }}
              >
                设备状态：{data.equipmentStatus || '旧'}
              </div>
              <div>商品编码：</div>
              <div style={topStyles.en}>Code of goods</div>
            </td>
            <td
              style={{
                ...topStyles.valueCell,
                fontFamily: '"Courier New", monospace',
                verticalAlign: 'bottom',
              }}
            >
              {data.codeOfGoods || '\u00A0'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── 下部：12–21 栏，6 列明细表 ── */}
      <table
        style={{
          width: '100%',
          flex: '1 1 auto',
          minHeight: 0,
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        <colgroup>
          <col style={{ width: '28%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '17%' }} />
        </colgroup>
        <tbody>
          {/* 表头：12–17，中英文上下排列；第 6 列与其他列等高 */}
          <tr style={{ height: '11mm' }}>
            <td style={bottomStyles.headCell}>
              <div>12. 规格、等级</div>
              <div style={bottomStyles.en}>Specification</div>
            </td>
            <td style={bottomStyles.headCell}>
              <div>13. 单位</div>
              <div style={bottomStyles.en}>Unit</div>
            </td>
            <td style={bottomStyles.headCell}>
              <div>14. 数量</div>
              <div style={bottomStyles.en}>Quantity</div>
            </td>
            <td style={bottomStyles.headCell}>
              <div>15. 单价</div>
              <div style={bottomStyles.en}>Unit price</div>
            </td>
            <td style={bottomStyles.headCell}>
              <div>16. 总值</div>
              <div style={bottomStyles.en}>Amount</div>
            </td>
            <td style={bottomStyles.headCell}>
              <div>17. 总值折美元</div>
              <div style={bottomStyles.en}>Amount in USD</div>
            </td>
          </tr>

          {items.map((it) => (
            <tr key={it.id} style={{ height: '9mm' }}>
              <td style={bottomStyles.specCell}>
                {it.specification || '\u00A0'}
              </td>
              <td style={bottomStyles.itemCell}>{it.unit || '\u00A0'}</td>
              <td style={bottomStyles.itemCell}>
                {it.quantity ? fmtNum(it.quantity) : '\u00A0'}
              </td>
              <td style={{ ...bottomStyles.itemCell, fontSize: '9pt' }}>
                {it.unitPriceUsd
                  ? `${it.currency || 'CNY'} ${fmtNum(it.unitPriceUsd)}`
                  : '\u00A0'}
              </td>
              <td style={{ ...bottomStyles.itemCell, fontSize: '9pt' }}>
                {it.amountUsd
                  ? `${it.currency || 'CNY'} ${fmtNum(it.amountUsd)}`
                  : '\u00A0'}
              </td>
              <td style={bottomStyles.itemCell}>
                {it.amountInUsd ? fmtNum(it.amountInUsd) : '\u00A0'}
              </td>
            </tr>
          ))}

          {/* 18 总计 */}
          <tr style={{ height: '10mm' }}>
            <td style={bottomStyles.totalLabelCell}>
              <strong>18. 总计</strong>
              <div style={bottomStyles.en}>Total</div>
            </td>
            <td style={bottomStyles.itemCell}>辆</td>
            <td style={{ ...bottomStyles.itemCell, fontWeight: 700 }}>
              {fmtNum(t.quantity)}
            </td>
            <td style={bottomStyles.itemCell}>&nbsp;</td>
            <td
              style={{ ...bottomStyles.itemCell, fontWeight: 700, fontSize: '9pt' }}
            >
              {t.singleCurrency && t.amount
                ? `${t.singleCurrency} ${fmtNum(t.amount)}`
                : '\u00A0'}
            </td>
            <td style={{ ...bottomStyles.itemCell, fontWeight: 700 }}>
              {fmtNum(t.amountInUsd)}
            </td>
          </tr>

          {/* 19 备注 + 20 签章（吸收剩余高度） */}
          <tr>
            <td colSpan={3} rowSpan={2} style={bottomStyles.remarksCell}>
              <div style={{ fontWeight: 500 }}>
                19. 备注：
                <span style={bottomStyles.en}>Supplementary details</span>
              </div>
              <div
                style={{
                  marginTop: '4px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                }}
              >
                {data.supplementaryDetails || '\u00A0'}
              </div>
            </td>
            <td colSpan={3} style={bottomStyles.stampCell}>
              <div style={{ fontWeight: 500 }}>
                20. 发证机关签章：
                <span style={bottomStyles.en}>
                  Issuing authority&apos;s stamp &amp; signature
                </span>
              </div>
            </td>
          </tr>
          <tr style={{ height: '11mm' }}>
            <td colSpan={3} style={bottomStyles.dateCell}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '6mm',
                  paddingRight: '4mm',
                }}
              >
                <span>
                  21. 发证日期：
                  <span style={bottomStyles.en}>Licence date</span>
                </span>
                <span style={{ fontWeight: 600 }}>
                  {data.licenceDate || '\u00A0'}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #${id}, #${id} * {
            visibility: visible;
          }
          #${id} {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/* 上部字段表样式 */
const topStyles: Record<string, React.CSSProperties> = {
  labelCell: {
    border: '1px solid #000',
    padding: '5px 8px',
    verticalAlign: 'middle',
    textAlign: 'left',
    fontWeight: 500,
    fontSize: '10pt',
    lineHeight: 1.35,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  },
  noText: {
    fontWeight: 700,
    fontSize: '10pt',
  } as React.CSSProperties,
  valueCell: {
    border: '1px solid #000',
    padding: '5px 9px',
    verticalAlign: 'middle',
    textAlign: 'center',
    fontWeight: 500,
    fontSize: '10pt',
    lineHeight: 1.35,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  },
  codeCell: {
    border: '1px solid #000',
    padding: '6px 10px 6px',
    fontFamily: '"Courier New", monospace',
    fontSize: '9.5pt',
    letterSpacing: '0.4px',
    verticalAlign: 'middle',
    textAlign: 'center',
    lineHeight: 1.35,
  },
  nameCell: {
    border: '1px solid #000',
    padding: '4px 10px 6px',
    fontWeight: 500,
    fontSize: '10.5pt',
    verticalAlign: 'top',
    textAlign: 'left',
    lineHeight: 1.35,
    wordBreak: 'break-word',
  },
  en: {
    fontFamily: '"Times New Roman", serif',
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: '8.5pt',
    display: 'inline-block',
    marginTop: '1px',
  } as React.CSSProperties,
};

/* 下部明细表样式 */
const bottomStyles: Record<string, React.CSSProperties> = {
  headCell: {
    border: '1px solid #000',
    padding: '3px 4px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontWeight: 700,
    fontSize: '9pt',
    lineHeight: 1.25,
    backgroundColor: '#FAFAFA',
  },
  headCellBlank: {
    border: '1px solid #000',
    backgroundColor: '#FAFAFA',
    padding: 0,
    lineHeight: 0,
    fontSize: '1pt',
  },
  itemCell: {
    border: '1px solid #000',
    padding: '4px 5px',
    verticalAlign: 'middle',
    textAlign: 'center',
    fontSize: '9.5pt',
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },
  specCell: {
    border: '1px solid #000',
    padding: '4px 8px',
    verticalAlign: 'middle',
    textAlign: 'left',
    fontSize: '9.5pt',
    lineHeight: 1.3,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  },
  totalLabelCell: {
    border: '1px solid #000',
    padding: '4px 8px',
    verticalAlign: 'middle',
    textAlign: 'left',
    fontWeight: 500,
    fontSize: '10pt',
    lineHeight: 1.35,
  },
  remarksCell: {
    border: '1px solid #000',
    padding: '7px 10px',
    verticalAlign: 'top',
    lineHeight: 1.5,
    fontSize: '10pt',
  },
  stampCell: {
    border: '1px solid #000',
    padding: '7px 10px',
    verticalAlign: 'top',
    lineHeight: 1.4,
    fontSize: '10pt',
  },
  dateCell: {
    border: '1px solid #000',
    padding: '5px 8px',
    verticalAlign: 'middle',
    lineHeight: 1.4,
    fontSize: '10pt',
  },
  en: {
    fontFamily: '"Times New Roman", serif',
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: '8.5pt',
    display: 'inline-block',
    marginTop: '1px',
  } as React.CSSProperties,
};
