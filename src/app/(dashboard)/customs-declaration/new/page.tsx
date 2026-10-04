import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CustomsDeclarationWorkspace } from '@/components/customs-declaration/workspace';

export const metadata: Metadata = {
  title: '新建出口报关单 · ExportDrive',
};

export default function NewCustomsDeclarationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-on-surface-variant">加载中…</div>}>
      <CustomsDeclarationWorkspace mode="new" />
    </Suspense>
  );
}
