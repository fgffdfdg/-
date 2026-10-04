'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Phone, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const APP_ICON = 'https://coze-coding-project.tos.coze.site/ide_auth_avatar/2026-08-24/3704678079278092_0de8fd29ae16fad847a06ec546b68fb9_stock.jpg?sign=4909651195-2257dd7a00-0-cfbc5dfefdc185e278022b86e2849ead3f0c9372d7303be2e41bf669c8473c2a';
const APP_NAME = '汽车出口通';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  // ─── Phone login ───
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCodeCountdown, setPhoneCodeCountdown] = useState(0);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);

  // ─── Email login/register ───
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');
  const [emailRegistering, setEmailRegistering] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Shared ───
  const [activeTab, setActiveTab] = useState('phone');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initializing, setInitializing] = useState(true);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on tab switch
  useEffect(() => {
    if (activeTab === 'phone') phoneInputRef.current?.focus();
    else emailInputRef.current?.focus();
  }, [activeTab]);

  // Precheck: is user already logged in?
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = await getSupabaseBrowserClientWithRetry();
        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled && user) {
          router.replace(redirectUrl);
        }
      } catch { /* not logged in */ }
      if (!cancelled) setInitializing(false);
    })();
    return () => { cancelled = true; };
  }, [router, redirectUrl]);

  // Phone code countdown
  useEffect(() => {
    if (phoneCodeCountdown <= 0) return;
    const timer = setTimeout(() => setPhoneCodeCountdown(phoneCodeCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [phoneCodeCountdown]);

  // ─── Phone: send code ───
  const handleSendPhoneCode = async () => {
    setError('');
    const cleaned = phone.replace(/\s+/g, '');
    if (!/^1[3-9]\d{9}$/.test(cleaned)) {
      setError('请输入有效的手机号');
      return;
    }
    setPhoneSubmitting(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { error: err } = await supabase.auth.signInWithOtp({
        phone: `+86${cleaned}`,
        options: { shouldCreateUser: true },
      });
      if (err) throw err;
      setPhoneCodeSent(true);
      setPhoneCodeCountdown(60);
      setSuccess('验证码已发送');
    } catch (e: any) {
      setError(e?.message || '发送验证码失败，请重试');
    } finally {
      setPhoneSubmitting(false);
    }
  };

  // ─── Phone: verify code ───
  const handlePhoneVerify = async () => {
    setError('');
    if (!phoneCode || phoneCode.length < 6) {
      setError('请输入6位验证码');
      return;
    }
    setPhoneSubmitting(true);
    try {
      const cleaned = phone.replace(/\s+/g, '');
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { error: err } = await supabase.auth.verifyOtp({
        phone: `+86${cleaned}`,
        token: phoneCode,
        type: 'sms',
      });
      if (err) throw err;
      router.replace(redirectUrl);
    } catch (e: any) {
      setError(e?.message || '验证码错误，请重试');
    } finally {
      setPhoneSubmitting(false);
    }
  };

  // ─── Email: login / register ───
  const handleEmailAuth = async () => {
    setError('');
    setSuccess('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    if (!emailPassword || emailPassword.length < 6) {
      setError('密码至少6位');
      return;
    }

    if (emailRegistering) {
      if (!emailConfirmPassword || emailConfirmPassword !== emailPassword) {
        setError('两次输入的密码不一致');
        return;
      }
    }

    setEmailSubmitting(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();

      if (emailRegistering) {
        // Register
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password: emailPassword,
        });
        if (signUpErr) throw signUpErr;
        setSuccess('注册成功！请检查邮箱验证链接。');
        setEmailRegistering(false);
      } else {
        // Login
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password: emailPassword,
        });
        if (signInErr) throw signInErr;
        router.replace(redirectUrl);
      }
    } catch (e: any) {
      setError(e?.message || '操作失败，请重试');
    } finally {
      setEmailSubmitting(false);
    }
  };

  // ─── Go back ───
  const handleBack = () => {
    if (redirectUrl && redirectUrl !== '/') {
      router.push(redirectUrl);
    } else {
      router.push('/');
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </button>

      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="text-center pb-4">
          {/* App icon */}
          <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-xl border border-border/50 shadow-sm">
            <img
              src={APP_ICON}
              alt={APP_NAME}
              className="h-full w-full object-cover"
            />
          </div>
          <CardTitle className="text-xl font-semibold">{APP_NAME}</CardTitle>
          <CardDescription>登录或注册以继续使用</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(''); setSuccess(''); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="phone" className="gap-2">
                <Phone className="h-4 w-4" />
                手机登录
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                邮箱登录
              </TabsTrigger>
            </TabsList>

            {/* ─── Phone Tab ─── */}
            <TabsContent value="phone" className="space-y-4">
              {!phoneCodeSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">手机号</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
                        +86
                      </span>
                      <Input
                        ref={phoneInputRef}
                        id="phone"
                        type="tel"
                        placeholder="请输入手机号"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\s/g, ''))}
                        maxLength={11}
                        className="pl-14"
                        disabled={phoneSubmitting}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSendPhoneCode}
                    disabled={phoneSubmitting || phone.length < 11}
                  >
                    {phoneSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    获取验证码
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone-display">手机号</Label>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">+86</span>
                      <span className="font-medium">{phone}</span>
                      <button
                        type="button"
                        onClick={() => { setPhoneCodeSent(false); setPhoneCode(''); setError(''); }}
                        className="text-primary text-xs hover:underline ml-auto"
                      >
                        更换
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-code">验证码</Label>
                    <Input
                      id="phone-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="请输入6位验证码"
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      disabled={phoneSubmitting}
                      autoFocus
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handlePhoneVerify}
                    disabled={phoneSubmitting || phoneCode.length < 6}
                  >
                    {phoneSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    登录 / 注册
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSendPhoneCode}
                      disabled={phoneCodeCountdown > 0}
                      className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                    >
                      {phoneCodeCountdown > 0 ? `${phoneCodeCountdown}秒后重新发送` : '重新发送验证码'}
                    </button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ─── Email Tab ─── */}
            <TabsContent value="email" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  placeholder="请输入邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={emailSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-password">密码</Label>
                <div className="relative">
                  <Input
                    id="email-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码（至少6位）"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    disabled={emailSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {emailRegistering && (
                <div className="space-y-2">
                  <Label htmlFor="email-confirm-password">确认密码</Label>
                  <Input
                    id="email-confirm-password"
                    type="password"
                    placeholder="请再次输入密码"
                    value={emailConfirmPassword}
                    onChange={(e) => setEmailConfirmPassword(e.target.value)}
                    disabled={emailSubmitting}
                  />
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleEmailAuth}
                disabled={emailSubmitting || !email || !emailPassword}
              >
                {emailSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {emailRegistering ? '注册' : '登录'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setEmailRegistering(!emailRegistering); setError(''); setSuccess(''); }}
                  className="text-sm text-primary hover:underline"
                >
                  {emailRegistering ? '已有账号？去登录' : '没有账号？去注册'}
                </button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Error / Success */}
          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        登录即表示同意服务条款和隐私政策
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}