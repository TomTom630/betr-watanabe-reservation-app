import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function readDateFromImage(imageBase64: string): Promise<string | null> {
  if (!openai) {
    // stub
    return "2026-06-09";
  }
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "この予約表の写真から日付を読み取って、ISO 8601形式（YYYY-MM-DD）で返してください。日付が見つからない場合は\"NONE\"とだけ返してください。説明は不要、日付かNONEだけ。"
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      }],
      max_tokens: 20,
    });
    const text = res.choices[0]?.message?.content?.trim() || "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    return null;
  } catch (e) {
    console.error("OpenAI error:", e);
    return null;
  }
}
