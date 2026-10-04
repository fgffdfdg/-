"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClientWithRetry } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2, CheckCircle2, XCircle, ArrowRight, LogIn } from "lucide-react";
import Link from "next/link";

interface InvitationInfo {
  id: string;
  email: string;
  organization_name: string;
  organization_id: string;
  role_name: string;
  role_description: string | null;
  expires_at: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = await getSupabaseBrowserClientWithRetry();
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
        setUserEmail(session?.user?.email || "");
      } catch {
        setIsLoggedIn(false);
      }
    }
    checkAuth();
  }, []);

  const fetchInvitation = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/invitations/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "邀请不存在");
        return;
      }
      setInvitation(data.data);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  const handleAccept = useCallback(async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("请先登录");
        return;
      }

      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAccepted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "接受邀请失败");
    } finally {
      setAccepting(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">邀请无效</h2>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Link href="/">
              <Button>返回首页</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">已成功加入</h2>
            <p className="text-sm text-muted-foreground mb-4">
              你已加入 <strong>{invitation?.organization_name}</strong>
            </p>
            <Button onClick={() => router.push("/")} className="w-full">
              进入工作台
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle>组织邀请</CardTitle>
          <CardDescription>你收到了一份加入组织的邀请</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">组织名称</span>
              <span className="text-sm font-medium">{invitation?.organization_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">分配角色</span>
              <Badge>{invitation?.role_name}</Badge>
            </div>
            {invitation?.role_description && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">角色说明</span>
                <span className="text-sm">{invitation.role_description}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">有效期至</span>
              <span className="text-sm">
                {invitation?.expires_at ? new Date(invitation.expires_at).toLocaleString("zh-CN") : ""}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {!isLoggedIn ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                请先登录或注册账号，然后接受邀请
              </p>
              <Link href={`/login?redirect=/invite/${token}`}>
                <Button className="w-full">
                  <LogIn className="h-4 w-4 mr-2" />
                  登录 / 注册
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                当前登录账号：{userEmail}
              </p>
              <Button className="w-full" onClick={handleAccept} disabled={accepting}>
                {accepting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                接受邀请并加入
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
