import { extractArticleText, acceptAiSummary } from "./article-text";
import { fetchText } from "./http";

const SYSTEM_PROMPT =
  "You write a two-sentence summary of an automotive article for DRV247, a culture magazine aggregator. Use only the article text. Do not invent facts, quotes, names, or numbers. If the text is a paywall, cookie notice, login wall, error page, or too thin to summarize the article, reply with NONE.";

let gatewayDisabled = false;

export function llmConfigured(): boolean {
  return Boolean(llmAuth());
}

function llmAuth(): { token: string; url: string; model: string } | null {
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) {
    return {
      token: openai,
      url: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
    };
  }
  if (gatewayDisabled) return null;
  const gateway = process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();
  if (gateway) {
    return {
      token: gateway,
      url: "https://ai-gateway.vercel.sh/v1/chat/completions",
      model: "openai/gpt-4o-mini",
    };
  }
  return null;
}

export async function summarizeOriginalArticle(
  canonicalUrl: string,
  title: string,
): Promise<string | null> {
  if (!llmConfigured()) return null;
  const page = await fetchText(canonicalUrl, { timeoutMs: 12_000, accept: "text/html, */*" });
  if (!page.ok) return null;
  if (page.status === 401 || page.status === 403) return null;
  const articleText = extractArticleText(page.text);
  if (!articleText) return null;
  const raw = await completeSummary(articleText);
  if (!raw) return null;
  return acceptAiSummary(raw, title);
}

async function completeSummary(articleText: string): Promise<string | null> {
  const auth = llmAuth();
  if (!auth) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(auth.url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: auth.model,
        temperature: 0.2,
        max_tokens: 180,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: articleText },
        ],
      }),
    });
    if (!response.ok) {
      if (response.status === 403 && auth.url.includes("ai-gateway.vercel.sh")) {
        gatewayDisabled = true;
      }
      return null;
    }
    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return body.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
