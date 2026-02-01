type Sentiment = "positive" | "negative" | "neutral";

interface SentimentResult {
  id: string;
  sentiment: Sentiment;
}

/**
 * Analyze sentiment of multiple comments in a single OpenAI API call.
 * Returns a map of comment ID -> sentiment.
 * Falls back to "neutral" for all comments if the API call fails.
 */
export async function analyzeSentiments(
  comments: { id: string; message: string }[]
): Promise<Record<string, Sentiment>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || comments.length === 0) {
    return Object.fromEntries(comments.map((c) => [c.id, "neutral" as Sentiment]));
  }

  const numbered = comments.map((c, i) => `${i + 1}. [${c.id}] ${c.message}`).join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are a sentiment classifier for Facebook ad comments. Classify each comment as "positive", "negative", or "neutral". Respond with a JSON object: {"results": [{"id": "comment_id", "sentiment": "positive|negative|neutral"}]}. Be concise. Comments are in Romanian or English.',
          },
          {
            role: "user",
            content: `Classify the sentiment of each comment:\n\n${numbered}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[Sentiment] OpenAI API error:", response.status);
      return Object.fromEntries(comments.map((c) => [c.id, "neutral" as Sentiment]));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return Object.fromEntries(comments.map((c) => [c.id, "neutral" as Sentiment]));
    }

    const parsed: { results: SentimentResult[] } = JSON.parse(content);
    const map: Record<string, Sentiment> = {};

    for (const r of parsed.results) {
      if (r.id && ["positive", "negative", "neutral"].includes(r.sentiment)) {
        map[r.id] = r.sentiment;
      }
    }

    // Fill missing with neutral
    for (const c of comments) {
      if (!map[c.id]) map[c.id] = "neutral";
    }

    return map;
  } catch (error) {
    console.error("[Sentiment] Error analyzing sentiments:", error);
    return Object.fromEntries(comments.map((c) => [c.id, "neutral" as Sentiment]));
  }
}
