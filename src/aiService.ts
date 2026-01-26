export interface SprintItem {
    id: string;
    item_name: string;
    description: string;
    team_name: string;
    status: string;
    priority: string;
    estimation_points: number;
    tags: string;
}

export const generateSprintSummary = async (items: SprintItem[]): Promise<string> => {
    const apiKey = import.meta.env.VITE_OPENROUTER_KEY;

    if (!apiKey) {
        throw new Error('Missing VITE_OPENROUTER_KEY in environment variables.');
    }

    if (items.length === 0) {
        return "No items to summarize.";
    }

    // Prepare context
    const itemsText = items.map(i =>
        `- [${i.team_name}] ${i.item_name} (${i.status}, ${i.priority}): ${i.description}`
    ).join('\n');

    const prompt = `
    You are an expert Agile Sprint Coach. 
    Analyze the following sprint items and generate a comprehensive **Sprint Retrospective & Health Report**.
    
    Structure your response with these specific sections:
    1. 🚀 **Key Achievements**: Summarize finished high-impact items.
    2. 🐢 **Bottleneck Detection**: Identify any stages, teams, or patterns that are slowing down progress (e.g., items stuck in "Review" or specific teams overloaded).
    3. ⚠️ **Risk Prediction**: Based on the data, predict risks for the remaining time or next sprint (e.g., high-priority items at risk of spillover).
    4. 💡 **Actionable Recommendations**: Give 2-3 specific tips to improve velocity.

    Format the output in clean Markdown with emoji headers.

    Sprint Items:
    ${itemsText}
    `;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": window.location.origin, // Required by OpenRouter
                "X-Title": "SprintBI", // Optional
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-001", // Fast & Good
                "messages": [
                    { "role": "user", "content": prompt }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Failed to generate summary');
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "No summary generated.";

    } catch (error) {
        console.error("AI Summary Error:", error);
        throw error;
    }
};
