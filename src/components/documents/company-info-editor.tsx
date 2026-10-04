'use client';

import type { CompanyInfo } from './types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  label: string;
  labelCn: string;
  data: CompanyInfo;
  onChange: (data: CompanyInfo) => void;
  /** 是否展开中英文双语输入（默认 true） */
  bilingual?: boolean;
}

export default function CompanyInfoEditor({ label, labelCn, data, onChange, bilingual = true }: Props) {
  const update = (field: keyof CompanyInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <Label className="text-xs font-semibold text-navy">
        {label} / {labelCn}
      </Label>

      {bilingual ? (
        <>
          {/* 公司名称 - 双语 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">公司名称（中文）</Label>
              <Input
                className="mt-0.5 h-7 text-xs"
                placeholder="公司全称"
                value={data.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('name', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Company Name (EN)</Label>
              <Input
                className="mt-0.5 h-7 text-xs"
                placeholder="Company full name"
                value={data.nameEn || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('nameEn', e.target.value)}
              />
            </div>
          </div>
          {/* 地址 - 双语 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">地址（中文）</Label>
              <Input
                className="mt-0.5 h-7 text-xs"
                placeholder="详细地址"
                value={data.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('address', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Address (EN)</Label>
              <Input
                className="mt-0.5 h-7 text-xs"
                placeholder="Full address"
                value={data.addressEn || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('addressEn', e.target.value)}
              />
            </div>
          </div>
          {/* 国家 - 双语 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">国家（中文）</Label>
              <Input
                className="mt-0.5 h-7 text-xs"
                placeholder="中国"
                value={data.country}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('country', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Country (EN)</Label>
              <Input
                className="mt-0.5 h-7 text-xs"
                placeholder="China"
                value={data.countryEn || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('countryEn', e.target.value)}
              />
            </div>
          </div>
          {/* 联系人 - 双语 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">联系人（中文）</Label>
              <Input
                className="mt-0.5 h-7 text-xs"
                placeholder="联系人姓名"
                value={data.contact}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('contact', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Contact (EN)</Label>
              <Input
                className="mt-0.5 h-7 text-xs"
                placeholder="Contact person"
                value={data.contactEn || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('contactEn', e.target.value)}
              />
            </div>
          </div>
          {/* 电话 + 邮箱 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Phone / 电话</Label>
              <Input
                className="mt-0.5 h-7 text-xs"
                placeholder="+86-xxx-xxxx"
                value={data.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('phone', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Email / 邮箱</Label>
              <Input
                className="mt-0.5 h-7 text-xs"
                placeholder="email@example.com"
                value={data.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('email', e.target.value)}
              />
            </div>
          </div>
        </>
      ) : (
        /* 单语模式（兼容旧版） */
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Label className="text-[10px] text-muted-foreground">Company Name / 公司名称</Label>
            <Input
              className="mt-0.5 h-7 text-xs"
              placeholder="Company full name"
              value={data.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('name', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] text-muted-foreground">Address / 地址</Label>
            <Input
              className="mt-0.5 h-7 text-xs"
              placeholder="Full address"
              value={data.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('address', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Country / 国家</Label>
            <Input
              className="mt-0.5 h-7 text-xs"
              placeholder="China"
              value={data.country}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('country', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Contact / 联系人</Label>
            <Input
              className="mt-0.5 h-7 text-xs"
              placeholder="Contact person"
              value={data.contact}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('contact', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Phone / 电话</Label>
            <Input
              className="mt-0.5 h-7 text-xs"
              placeholder="+86-xxx-xxxx"
              value={data.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('phone', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Email / 邮箱</Label>
            <Input
              className="mt-0.5 h-7 text-xs"
              placeholder="email@example.com"
              value={data.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('email', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}