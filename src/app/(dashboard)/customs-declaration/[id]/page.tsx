import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CustomsDeclarationWorkspace } from '@/components/customs-declaration/workspace';

export const metadata: Metadata = {
  title: '编辑出口报关单 · ExportDrive',
};

export default async function EditCustomsDeclarationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="p-8 text-center text-on-surface-variant">加载中…</div>}>
      <CustomsDeclarationWorkspace mode="edit" declarationId={id} />
    </Suspense>
  );
}
