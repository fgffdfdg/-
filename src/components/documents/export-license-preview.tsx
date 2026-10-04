'use client';

import { memo } from 'react';
import type { ExportLicenseData } from './types';

interface Props {
  data: ExportLicenseData;
}

// 单行字段：中文标签在左、英文斜体在右，值独占一整行
function FieldRow({
  cn,
  en,
  value,
  multiline,
}: {
  cn: string;
  en: string;
  value?: string;
  multiline?: boolean;
}) {
  return (
    <div
      style={{
        border: '1.2px solid #000',
        padding: multiline ? '7px 9px 9px' : '6px 9px',
        background: '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '9pt',
          color: '#000',
          marginBottom: multiline ? '5px' : '3px',
        }}
      >
        <span style={{ fontWeight: 500 }}>{cn}</span>
        <span
          style={{
            fontStyle: 'italic',
            fontFamily: '"Times New Roman", "Songti SC", serif',
            fontSize: '8.2pt',
            opacity: 0.85,
          }}
        >
          {en}
        </span>
      </div>
      <div
        style={{
          fontSize: multiline ? '9.5pt' : '10pt',
          minHeight: multiline ? undefined : '14px',
          lineHeight: multiline ? 1.5 : 1.35,
          color: '#000',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        {value || '\u00a0'}
      </div>
    </div>
  );
}

function ExportLicensePreviewComponent({ data }: Props) {
  // 车主名称：未勾选"与出口商不同"时引用出口商；勾选后按"中文 + 英文"组合显示
  const buildOwnerName = (): string => {
    if (!data.ownerDifferent) {
      return data.seller?.name || data.ownerNameCn || data.ownerNameEn || '';
    }
    const cn = data.ownerNameCn?.trim();
    const en = data.ownerNameEn?.trim();
    if (cn && en) return `${cn}\n${en}`;
    return cn || en || '';
  };
  const buildOwnerAddress = (): string => {
    if (!data.ownerDifferent) {
      return data.seller?.address || data.ownerAddressCn || data.ownerAddressEn || '';
    }
    const cn = data.ownerAddressCn?.trim();
    const en = data.ownerAddressEn?.trim();
    if (cn && en) return `${cn}\n${en}`;
    return cn || en || '';
  };
  const ownerName = buildOwnerName();
  const ownerAddress = buildOwnerAddress();

  return (
    <div
      id="export-license-preview"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm 12mm 16mm',
        background: '#fff',
        color: '#000',
        fontFamily:
          '"Songti SC", "SimSun", "Noto Serif SC", "Times New Roman", serif',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        #export-license-preview * { box-sizing: border-box; }
      `}</style>

      {/* 标题 */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div
          style={{
            fontSize: '20pt',
            fontWeight: 700,
            letterSpacing: '4px',
            lineHeight: 1.2,
          }}
        >
          中华人民共和国出口许可证附加信息表
        </div>
        <div
          style={{
            fontSize: '10.5pt',
            fontWeight: 700,
            letterSpacing: '0.5px',
            lineHeight: 1.4,
          }}
        >
          ANNEX TO THE EXPORT LICENCE OF THE PEOPLE&apos;S REPUBLIC OF CHINA
        </div>
        <div
          style={{
            fontSize: '9pt',
            fontWeight: 400,
            letterSpacing: '0.3px',
            fontStyle: 'italic',
            marginTop: '2px',
          }}
        >
          (For Customs Clearance and Enterprise Declaration)
        </div>
      </div>

      {/* 顶部两栏：许可证号 / 发证日期 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderTop: '1.2px solid #000',
          borderLeft: '1.2px solid #000',
        }}
      >
        <div style={{ borderRight: '1.2px solid #000' }}>
          <FieldRow cn="许可证号" en="License No." value={data.licenseNo} />
        </div>
        <FieldRow
          cn="发证日期"
          en="Issue Date (YYYYMMDD)"
          value={data.issueDate}
        />
      </div>

      {/* VIN */}
      <FieldRow
        cn="车架号（VIN）"
        en="Vehicle Identification Number"
        value={data.vin}
      />

      {/* 品牌 / 车型（两列） */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderLeft: '1.2px solid #000',
        }}
      >
        <div style={{ borderRight: '1.2px solid #000' }}>
          <FieldRow
            cn="汽车品牌（中/英）"
            en="Make"
            value={[data.brandCn, data.brandEn].filter(Boolean).join(' / ')}
          />
        </div>
        <FieldRow
          cn="车型（中/英）"
          en="Model"
          value={[data.modelCn, data.modelEn].filter(Boolean).join(' / ')}
        />
      </div>

      <FieldRow cn="发动机型号" en="Engine Mode" value={data.engineMode} />

      <FieldRow
        cn="使用性质（中/英）"
        en="Purpose"
        value={[data.purposeCn, data.purposeEn].filter(Boolean).join(' / ')}
      />

      {/* 车身结构 / 核定载客 / 里程（三列） */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr',
          borderLeft: '1.2px solid #000',
        }}
      >
        <div style={{ borderRight: '1.2px solid #000' }}>
          <FieldRow
            cn="车身结构"
            en="Body Structure"
            value={data.bodyStructure || ''}
          />
        </div>
        <div style={{ borderRight: '1.2px solid #000' }}>
          <FieldRow
            cn="核定载客"
            en="Seating Capacity"
            value={data.seatingCapacity}
          />
        </div>
        <FieldRow
          cn="里程表读数 (km)"
          en="Mileage (km)"
          value={data.mileageKm}
        />
      </div>

      {/* 燃料类型 / 自重 / 总质量（三列） */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr',
          borderLeft: '1.2px solid #000',
        }}
      >
        <div style={{ borderRight: '1.2px solid #000' }}>
          <FieldRow
            cn="燃料类型（中/英）"
            en="Fuel Type"
            value={[data.fuelTypeCn, data.fuelTypeEn].filter(Boolean).join(' / ')}
          />
        </div>
        <div style={{ borderRight: '1.2px solid #000' }}>
          <FieldRow
            cn="车辆自重 (kg)"
            en="Vehicle Weight (kg)"
            value={data.vehicleWeightKg}
          />
        </div>
        <FieldRow
          cn="车辆总质量 (kg)"
          en="Gross Vehicle Weight (kg)"
          value={data.grossVehicleWeightKg}
        />
      </div>

      {/* 长宽高（三列） */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          borderLeft: '1.2px solid #000',
        }}
      >
        <div style={{ borderRight: '1.2px solid #000' }}>
          <FieldRow cn="长 (mm)" en="Length (mm)" value={data.lengthMm} />
        </div>
        <div style={{ borderRight: '1.2px solid #000' }}>
          <FieldRow cn="宽 (mm)" en="Width (mm)" value={data.widthMm} />
        </div>
        <FieldRow cn="高 (mm)" en="Height (mm)" value={data.heightMm} />
      </div>

      {/* 车主信息（多行） */}
      <FieldRow
        cn="车主名称（中/英）"
        en="Owner Name"
        value={ownerName}
        multiline
      />
      <FieldRow
        cn="车主地址（中/英）"
        en="Owner Address"
        value={ownerAddress}
        multiline
      />

      {/* 签发信息 */}
      <div
        style={{
          border: '1.2px solid #000',
          borderTop: 'none',
          padding: '8px 12px',
          minHeight: '90px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: '9pt',
          }}
        >
          <span>
            <span style={{ fontWeight: 500 }}>发证机关签章：</span>
            <span
              style={{
                fontStyle: 'italic',
                fontFamily: '"Times New Roman", serif',
                opacity: 0.85,
              }}
            >
              Issuing authority&apos;s stamp &amp; signature
            </span>
          </span>
        </div>
      </div>
      <div
        style={{
          border: '1.2px solid #000',
          borderTop: 'none',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '9pt',
        }}
      >
        <span style={{ fontWeight: 500 }}>
          发证日期：
          <span
            style={{
              fontStyle: 'italic',
              fontFamily: '"Times New Roman", serif',
              fontWeight: 400,
              marginLeft: '4px',
              opacity: 0.85,
            }}
          >
            Licence date
          </span>
        </span>
        <span style={{ fontSize: '10pt' }}>{data.issueDate}</span>
      </div>
    </div>
  );
}

export const ExportLicensePreview = memo(ExportLicensePreviewComponent);
