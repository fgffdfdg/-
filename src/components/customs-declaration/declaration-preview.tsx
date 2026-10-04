'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import type { CustomsDeclarationFull, DeclarationGoodsItem } from '@/lib/customs-declaration/types';
import {
  CUSTOMS_OFFICES,
  COUNTRIES,
  PORTS,
  CURRENCIES,
  UNITS,
  DUTY_EXEMPTIONS,
  HS_CODES,
  TRANSPORT_MODES,
  SUPERVISION_MODES,
  DUTY_NATURES,
  findByCode,
} from '@/lib/customs-codes';
import { StampOverlay } from './stamp-overlay';
import type { StampConfig } from './stamp-overlay';
import './declaration-sheet.css';

function safeText(value: string | number | undefined | null, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  const s = String(value).trim();
  return s || fallback;
}

function codeName(list: { code: string; name: string }[], code?: string) {
  if (!code) return '';
  return findByCode(list, code)?.name ?? '';
}

function unitName(code?: string) {
  if (!code) return '';
  return findByCode(UNITS, code)?.name ?? '';
}

function TextCell({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`sheet-cell ${className}`}>
      <span className="cell-label">{label}</span>
      <span className="cell-value">{value || '\u3000'}</span>
    </div>
  );
}

export default function CustomsDeclarationPreview({
  data,
  stampConfig,
  onStampChange,
}: {
  data: CustomsDeclarationFull;
  stampConfig: StampConfig | null;
  onStampChange: (config: StampConfig | null) => void;
}) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // 条形码
  useEffect(() => {
    if (barcodeRef.current && data.customsNo) {
      try {
        JsBarcode(barcodeRef.current, data.customsNo, {
          format: 'CODE39',
          width: 1.2,
          height: 43,
          displayValue: false,
          margin: 0,
          background: '#FFFFFF',
          lineColor: '#000000',
        });
      } catch {
        /* noop */
      }
    }
  }, [data.customsNo]);

  // ---- 字段映射 ----
  const customsOfficeLabel = data.exitCustomsName || codeName(CUSTOMS_OFFICES, data.exitCustomsCode);
  const tradeCountryLabel = data.tradeCountryName || codeName(COUNTRIES, data.tradeCountryCode);
  const arrivalCountryLabel = data.arrivalCountryName || codeName(COUNTRIES, data.arrivalCountryCode);
  const destinationPortLabel = data.destinationPortName || codeName(PORTS, data.destinationPortCode);
  const supervisionLabel = data.supervisionName || codeName(SUPERVISION_MODES, data.supervisionCode);
  const dutyNatureLabel = data.dutyNatureName || codeName(DUTY_NATURES, data.dutyNatureCode);
  const transportLabel = data.transportModeName || codeName(TRANSPORT_MODES, data.transportModeCode);
  const manufacturerLabel = data.manufacturerSameAsConsignor
    ? data.consignor?.name
    : data.manufacturer?.name;
  const manufacturerCode = data.manufacturerSameAsConsignor
    ? data.consignor?.code
    : data.manufacturer?.code;

  // 备注：marks + 集装箱号 + VIN
  const remarksParts: string[] = [];
  if (data.marks && data.marks !== 'N/M') remarksParts.push(data.marks);
  if (data.containerNo) {
    let cs = `集装箱号：${data.containerNo}`;
    if (data.sealNo) cs += `　封条号：${data.sealNo}`;
    remarksParts.push(cs);
  }
  const vins = data.goods
    .filter((g) => g.vin?.trim())
    .map((g) => `VIN: ${g.vin!.trim()}`);
  if (vins.length > 0) remarksParts.push(vins.join('\n'));
  const remarksText = remarksParts.join('\n');

  // 页码
  const pageInfo = data.pageInfo || '1/1';
  const [pageNo, totalPages] = pageInfo.includes('/') ? pageInfo.split('/') : [pageInfo, '1'];

  return (
    <div className="sheet-scale">
      <div className="declaration-sheet">
        {/* 标题行 */}
        <div className="sheet-title-row">
          <h2>中华人民共和国海关出口货物报关单</h2>
          <div className="codes">
            <svg ref={barcodeRef} className="barcode" />
            {data.customsNo ? (
              <div className="qr-code">
                <QRCodeSVG
                  value={data.customsNo}
                  size={58}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  includeMargin={false}
                />
              </div>
            ) : (
              <div className="qr-code" />
            )}
          </div>
        </div>

        {/* 元信息 */}
        <div className="sheet-meta">
          <span>预录入编号：{safeText(data.entryNo)}</span>
          <span>海关编号：{safeText(data.customsNo)}　　（{customsOfficeLabel}）</span>
          <span>页码/页数：{pageNo}/{totalPages}</span>
        </div>

        {/* 顶部网格 */}
        <div className="sheet-grid top-grid">
          <TextCell
            label="境内发货人"
            value={`(${safeText(data.consignor?.code)})\n${safeText(data.consignor?.name)}`}
          />
          <TextCell
            label={`出境关别${data.exitCustomsCode ? ` (${data.exitCustomsCode})` : ''}`}
            value={customsOfficeLabel}
          />
          <TextCell label="出口日期" value={safeText(data.exportDate)} />
          <TextCell label="申报日期" value={safeText(data.declareDate)} />
          <TextCell label="备案号" value={safeText(data.recordNo)} />

          <TextCell label="境外收货人" value={safeText(data.consignee?.name)} />
          <TextCell label="运输方式" value={transportLabel} />
          <TextCell
            label="运输工具名称及航次号"
            value={safeText(data.transportInfo)}
          />
          <TextCell label="提运单号" value={safeText(data.blNo)} className="span2" />

          <TextCell
            label="生产销售单位"
            value={`(${safeText(manufacturerCode)})\n${safeText(manufacturerLabel)}`}
          />
          <TextCell label="监管方式" value={supervisionLabel} />
          <TextCell label="征免性质" value={dutyNatureLabel} />
          <TextCell label="许可证号" value={safeText(data.licenseNo)} className="span2" />

          <TextCell label="合同协议号" value={safeText(data.contractNo)} />
          <TextCell
            label={`贸易国（地区）${data.tradeCountryCode ? ` (${data.tradeCountryCode})` : ''}`}
            value={tradeCountryLabel}
          />
          <TextCell
            label={`运抵国（地区）${data.arrivalCountryCode ? ` (${data.arrivalCountryCode})` : ''}`}
            value={arrivalCountryLabel}
          />
          <TextCell
            label={`指运港${data.destinationPortCode ? ` (${data.destinationPortCode})` : ''}`}
            value={destinationPortLabel}
          />
          <TextCell label="离境口岸" value={safeText(data.departurePort)} />
        </div>

        {/* 重量/包装网格 */}
        <div className="sheet-grid weights-grid">
          <TextCell label="包装种类" value={safeText(data.packageName)} />
          <TextCell label="件数" value={safeText(data.packageCount)} />
          <TextCell label="毛重（千克）" value={safeText(data.grossWeight)} />
          <TextCell label="净重（千克）" value={safeText(data.netWeight)} />
          <TextCell label="成交方式" value={safeText(data.incotermName)} />
          <TextCell label="运费" value={safeText(data.freight)} />
          <TextCell label="保费" value={safeText(data.insurance)} />
          <TextCell label="杂费" value={safeText(data.otherFees)} />
        </div>

        {/* 随附单证 */}
        <div className="wide-row">
          <span>随附单证及编号</span>
          <b>{data.attachedDocs || '\u3000'}</b>
        </div>

        {/* 标记唛码及备注 */}
        <div className="wide-row notes-row">
          <span>标记唛码及备注</span>
          <b>{remarksText || '\u3000'}</b>
        </div>

        {/* 商品明细 */}
        <div className="goods-table">
          <div className="goods-header">
            <span>项号</span>
            <span>商品编号</span>
            <span>商品名称及规格型号</span>
            <span>数量及单位</span>
            <span>单价/总价/币制</span>
            <span>原产国(地区)</span>
            <span>最终目的国(地区)</span>
            <span>境内货源地</span>
            <span>征免</span>
          </div>
          <div className="goods-body">
            {data.goods.length === 0 ? (
              <div className="goods-row">
                <span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span><span></span>
              </div>
            ) : (
              data.goods.map((g, i) => <GoodsRow key={g.id} item={g} itemNo={i + 1} />)
            )}
            {Array.from({ length: Math.max(0, 4 - data.goods.length) }).map((_, i) => (
              <div className="blank-line" key={`blank-${i}`} />
            ))}
          </div>
        </div>

        {/* 确认行 */}
        <div className="confirm-row">
          <span>特殊关系确认：{data.specialRelation ? '是' : '否'}</span>
          <span>价格影响确认：{data.priceInfluence ? '是' : '否'}</span>
          <span>支付特许权使用费确认：{data.royaltyPayment ? '是' : '否'}</span>
          <span>公式定价确认：</span>
          <span>暂定价格确认：</span>
          <span>自报自缴：<b>{data.selfDeclare ? '是' : '否'}</b></span>
        </div>

        {/* 页脚 */}
        <div className="sheet-footer">
          <div className="declarant-box">
            <div>
              <span>报关人员　{safeText(data.declarantName)}</span>
              <span>报关人员证号　{safeText(data.declarantCertNo)}</span>
              <span>电话　{safeText(data.declarantPhone)}</span>
            </div>
            <p>
              申报单位{' '}
              {safeText(data.declaringEntity || data.consignor?.name)}
            </p>
          </div>
          <div className="responsibility">
            <strong>兹申明对以上内容承担如实申报、依法纳税之法律责任</strong>
            <span>申报单位（签章）</span>
          </div>
          <div className="customs-box">
            <strong>海关批注及签章</strong>
          </div>
          <StampOverlay config={stampConfig} onChange={onStampChange} sheetRef={sheetRef} />
        </div>
      </div>
    </div>
  );
}

function GoodsRow({ item, itemNo }: { item: DeclarationGoodsItem; itemNo: number }) {
  const hsName = codeName(HS_CODES, item.hsCode);
  const unitText = unitName(item.unitCode);
  const originText = item.originCountryCode || '';
  const destinationText = item.finalDestinationCode || '';
  const domesticSourceText = item.domesticSourceCode || '';
  const dutyNameText = findByCode(DUTY_EXEMPTIONS, item.dutyExemptionCode)?.name ?? '';
  const currencyText = codeName(CURRENCIES, item.currencyCode);
  const totalComputed =
    Number(item.totalPrice) ||
    (Number(item.unitPrice) && Number(item.quantity)
      ? Number(item.unitPrice) * Number(item.quantity)
      : 0);

  const lines = (item.goodsDescription || '').split('\n').filter((l) => l.trim());
  const nameLine = lines[0] || hsName;
  const specLine = lines.slice(1).join(' / ');

  const nameSpec = specLine ? `${nameLine}\n${specLine}` : nameLine;

  const quantityUnit = item.quantity
    ? `${Number(item.quantity).toLocaleString()} ${safeText(unitText)}`
    : '';

  const priceCurrency = [
    item.unitPrice ? Number(item.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '',
    totalComputed ? totalComputed.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '',
    safeText(currencyText),
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="goods-row">
      <span>{itemNo}</span>
      <span>{safeText(item.hsCode)}</span>
      <span>{nameSpec}</span>
      <span>{quantityUnit}</span>
      <span>{priceCurrency}</span>
      <span>{safeText(originText)}</span>
      <span>{safeText(destinationText)}</span>
      <span>{safeText(domesticSourceText)}</span>
      <span>{safeText(dutyNameText)}</span>
    </div>
  );
}