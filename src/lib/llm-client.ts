import { LLMClient, Config, type Message, type LLMConfig } from "coze-coding-dev-sdk";

/**
 * 统一 LLM 调用入口
 * - 沙箱环境：使用内置 LLMClient（免费，无需 API Key）
 * - 自有服务器：使用火山引擎 Ark API（需配置 ARK_API_KEY + ARK_ENDPOINT_ID）
 */
export async function callLLM(
  messages: Message[],
  options: LLMConfig = {},
  customHeaders?: Record<string, string>
): Promise<string> {
  const useArkAPI = !!process.env.ARK_API_KEY;

  if (useArkAPI) {
    return callWithArkAPI(messages, options);
  }

  return callWithBuiltInLLM(messages, options, customHeaders);
}

// ===== 内置 LLMClient（沙箱环境） =====

async function callWithBuiltInLLM(
  messages: Message[],
  options: LLMConfig,
  customHeaders?: Record<string, string>
): Promise<string> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders || {});

  const response = await client.invoke(messages, {
    model: options.model || "doubao-seed-2-0-lite-260215",
    temperature: options.temperature ?? 0.2,
    ...(options.thinking ? { thinking: options.thinking } : {}),
  });

  if (!response.content) {
    throw new Error("LLM 未返回内容");
  }

  return response.content;
}

// ===== 火山引擎 Ark API（自有服务器） =====

async function callWithArkAPI(
  messages: Message[],
  options: LLMConfig
): Promise<string> {
  const apiKey = process.env.ARK_API_KEY;
  const endpointId = process.env.ARK_ENDPOINT_ID;

  if (!apiKey) throw new Error("未配置 ARK_API_KEY 环境变量");
  if (!endpointId) throw new Error("未配置 ARK_ENDPOINT_ID 环境变量");

  const res = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: endpointId,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.2,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Ark API 请求失败 (${res.status}): ${errBody}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Ark API 未返回有效内容");
  }

  return content;
}
