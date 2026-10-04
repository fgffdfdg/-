import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '登录 - 汽车出口通',
  description: '登录汽车出口通平台，使用车辆核验、单证制作、运费测算等专业工具。',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}