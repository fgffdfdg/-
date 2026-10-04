import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 内存中临时存储验证码（仅用于 SMS 未配置时的降级方案）
const pendingCodes = new Map<string, { code: string; expiresAt: number }>();

// POST /api/auth/verify-code - 发送验证码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, type = "login" } = body as { phone?: string; type?: string };

    if (!phone) {
      return NextResponse.json(
        { error: "请输入手机号" },
        { status: 400 }
      );
    }

    // 验证手机号格式（中国大陆）
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: "手机号格式不正确" },
        { status: 400 }
      );
    }

    // 非生产环境：始终生成本地验证码用于测试（不依赖 SMS 提供商）
    const isDev = process.env.COZE_PROJECT_ENV !== "PROD";
    let devCode: string | undefined;

    if (isDev) {
      devCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 分钟过期
      pendingCodes.set(phone, { code: devCode, expiresAt });
      console.log(`[验证码] 手机号: ${phone}, 验证码: ${devCode}, 类型: ${type}`);
    }

    if (!isDev) {
      // 生产环境：通过 Supabase 发送真实短信
      const supabasePhone = `+86${phone}`;
      const supabase = getSupabaseClient();

      if (type === "register") {
        const { error } = await supabase.auth.signUp({
          phone: supabasePhone,
          password: "",
        });

        if (error) {
          if (isSmsNotConfigured(error.message)) {
            // SMS 未配置，降级为本地验证码
            devCode = String(Math.floor(100000 + Math.random() * 900000));
            pendingCodes.set(phone, { code: devCode, expiresAt: Date.now() + 600000 });
            console.log(`[验证码-降级] 手机号: ${phone}, 验证码: ${devCode}`);
          } else if (error.message?.includes("already") || error.message?.includes("registered")) {
            return NextResponse.json({ error: "该手机号已注册，请直接登录" }, { status: 409 });
          } else {
            return NextResponse.json({ error: `发送验证码失败：${error.message}` }, { status: 500 });
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone: supabasePhone });
        if (error) {
          if (isSmsNotConfigured(error.message)) {
            devCode = String(Math.floor(100000 + Math.random() * 900000));
            pendingCodes.set(phone, { code: devCode, expiresAt: Date.now() + 600000 });
            console.log(`[验证码-降级] 手机号: ${phone}, 验证码: ${devCode}`);
          } else {
            return NextResponse.json({ error: `发送验证码失败：${error.message}` }, { status: 500 });
          }
        }
      }
    }

    // 清理过期验证码
    for (const [key, value] of pendingCodes.entries()) {
      if (value.expiresAt < Date.now()) pendingCodes.delete(key);
    }

    return NextResponse.json({
      success: true,
      message: devCode ? "验证码已发送（测试模式）" : "验证码已发送",
      phone: phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
      ...(devCode ? { devCode } : {}),
    });
  } catch (error) {
    console.error("发送验证码异常:", error);
    return NextResponse.json(
      { error: "发送验证码失败，请稍后重试" },
      { status: 500 }
    );
  }
}

// 判断是否为 SMS 未配置的错误
function isSmsNotConfigured(message?: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("sms") ||
    lower.includes("provider") ||
    lower.includes("twilio") ||
    lower.includes("messagebird") ||
    lower.includes("vonage") ||
    lower.includes("not configured") ||
    lower.includes("no messaging provider")
  );
}

// GET /api/auth/verify-code?phone=xxx&code=xxx - 验证验证码（降级方案）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const code = searchParams.get("code");

  if (!phone || !code) {
    return NextResponse.json(
      { error: "缺少手机号或验证码" },
      { status: 400 }
    );
  }

  const stored = pendingCodes.get(phone);
  if (!stored) {
    return NextResponse.json(
      { valid: false, error: "验证码不存在或已过期" },
      { status: 400 }
    );
  }

  if (stored.expiresAt < Date.now()) {
    pendingCodes.delete(phone);
    return NextResponse.json(
      { valid: false, error: "验证码已过期" },
      { status: 400 }
    );
  }

  if (stored.code !== code) {
    return NextResponse.json(
      { valid: false, error: "验证码错误" },
      { status: 400 }
    );
  }

  // 验证成功后删除（一次性使用）
  pendingCodes.delete(phone);

  return NextResponse.json({ valid: true });
}
