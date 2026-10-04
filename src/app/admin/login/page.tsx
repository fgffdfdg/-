'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import {
  Loader2,
  ShieldCheck,
  Globe,
  Lock,
  Mail,
  ArrowRight,
} from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  // Check if already authenticated
  useEffect(() => {
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          router.push('/admin');
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/admin');
    } catch {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1F33]">
        <Loader2 className="h-8 w-8 text-white/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0A1F33]">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.5) 50px, rgba(255,255,255,0.5) 51px), repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.5) 50px, rgba(255,255,255,0.5) 51px)',
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#E67E22] rounded-lg flex items-center justify-center">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">
              汽车出口通
            </span>
          </div>
          <p className="text-white/40 text-sm">专业工具 · 高效出口</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              管理后台
            </h1>
            <p className="text-white/50 text-lg leading-relaxed max-w-md">
              平台运营管理中心，管理用户、内容、数据与系统配置。
            </p>
          </div>

          <div className="space-y-4">
            <FeatureItem
              icon={<ShieldCheck className="h-4 w-4" />}
              title="安全认证"
              desc="独立于用户端的认证体系，保障管理操作安全"
            />
            <FeatureItem
              icon={<Lock className="h-4 w-4" />}
              title="权限管控"
              desc="基于角色的访问控制，操作日志可追溯"
            />
            <FeatureItem
              icon={<Globe className="h-4 w-4" />}
              title="全链条管理"
              desc="车辆核验、单证、合规、客户一站式管理"
            />
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/20 text-xs">
            汽车出口通 Admin Portal v1.0
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#E67E22] rounded-lg flex items-center justify-center">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <span className="text-white text-lg font-semibold">
              汽车出口通
            </span>
            <span className="text-white/30 text-sm ml-1">管理后台</span>
          </div>

          <Card className="border-white/10 bg-white/[0.03] backdrop-blur-sm shadow-2xl">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-[#E67E22]" />
                <span className="text-xs font-medium text-[#E67E22] uppercase tracking-wider">
                  Admin Access
                </span>
              </div>
              <CardTitle className="text-xl font-bold text-white">
                管理员登录
              </CardTitle>
              <CardDescription className="text-white/40">
                请输入管理员账号和密码
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="admin-email"
                    className="text-white/60 text-xs uppercase tracking-wider"
                  >
                    邮箱
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@exportdrive.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-9 bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus-visible:border-[#E67E22]/50 focus-visible:ring-[#E67E22]/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="admin-password"
                    className="text-white/60 text-xs uppercase tracking-wider"
                  >
                    密码
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={loading}
                      className="pl-9 bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus-visible:border-[#E67E22]/50 focus-visible:ring-[#E67E22]/20"
                    />
                  </div>
                </div>
                {error && (
                  <Alert
                    variant="destructive"
                    className="bg-red-500/10 border-red-500/20 text-red-400"
                  >
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button
                  type="submit"
                  className="w-full bg-[#E67E22] hover:bg-[#D35400] text-white font-medium transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    <>
                      登录管理后台
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="pt-2">
              <p className="text-white/20 text-xs text-center w-full">
                仅限授权管理员访问 &middot; 所有操作将被记录
              </p>
            </CardFooter>
          </Card>

          {/* Back to main site link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-white/30 hover:text-white/50 text-sm transition-colors"
            >
              &larr; 返回用户端
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#E67E22] flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-white/80 text-sm font-medium">{title}</p>
        <p className="text-white/30 text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
