import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// POST /api/auth/fallback-login - 降级登录（SMS 未配置时）
// 前置条件：验证码已通过本地验证（GET /api/auth/verify-code）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body as { phone?: string };

    if (!phone) {
      return NextResponse.json({ error: "缺少手机号" }, { status: 400 });
    }

    const supabasePhone = `+86${phone}`;
    const fallbackEmail = `${phone}@phone.local`;
    const supabase = getSupabaseClient();

    // 尝试直接为用户生成 magiclink（用户可能已存在）
    let { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: fallbackEmail,
      });

    // 如果用户不存在（generateLink 失败），先创建用户
    if (linkError || !linkData?.properties?.hashed_token) {
      const randomPassword =
        crypto.randomUUID().replace(/-/g, "") +
        crypto.randomUUID().replace(/-/g, "");

      // 尝试创建用户（使用 fallback email + phone）
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: fallbackEmail,
          phone: supabasePhone,
          password: randomPassword,
          email_confirm: true,
          phone_confirm: true,
        });

      if (createError) {
        // 如果是"已存在"错误（email 或 phone 冲突），尝试用 phone 查找
        if (
          createError.message?.includes("already") ||
          createError.message?.includes("registered")
        ) {
          // 用户已存在但 email 可能不同，尝试直接用 phone 生成 link
          // 先尝试用原始 email
          const retry = await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: fallbackEmail,
          });
          if (retry.data?.properties?.hashed_token) {
            linkData = retry.data;
            linkError = null;
          } else {
            // 最后手段：列出所有用户找到目标
            const found = await findUserByPhone(supabase, supabasePhone);
            if (found?.email) {
              const retry2 = await supabase.auth.admin.generateLink({
                type: "magiclink",
                email: found.email,
              });
              if (retry2.data?.properties?.hashed_token) {
                linkData = retry2.data;
                linkError = null;
              }
            }
          }
        }
        if (linkError && !linkData?.properties?.hashed_token) {
          return NextResponse.json(
            { error: `登录失败：${createError.message || linkError?.message || "未知错误"}` },
            { status: 500 }
          );
        }
      } else if (newUser?.user) {
        // 新用户创建成功，生成 magiclink
        const retry = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: fallbackEmail,
        });
        if (retry.data?.properties?.hashed_token) {
          linkData = retry.data;
          linkError = null;
        } else {
          return NextResponse.json(
            { error: "生成登录令牌失败" },
            { status: 500 }
          );
        }
      }
    }

    if (!linkData?.properties?.hashed_token) {
      return NextResponse.json(
        { error: "生成登录令牌失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hashed_token: linkData.properties.hashed_token,
    });
  } catch (error) {
    console.error("降级登录异常:", error);
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}

// 通过 phone 查找用户（分页遍历）
async function findUserByPhone(
  supabase: ReturnType<typeof getSupabaseClient>,
  phone: string
): Promise<{ id: string; email?: string; phone?: string } | undefined> {
  for (let page = 1; page <= 10; page++) {
    const { data } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    const found = data?.users?.find(
      (u: { phone?: string }) => u.phone === phone
    );
    if (found) return found;
    if (!data?.users || data.users.length < 1000) break;
  }
  return undefined;
}
