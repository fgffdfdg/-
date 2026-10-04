import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '汽车出口通 - 管理后台登录',
  description: '汽车出口通管理后台',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
