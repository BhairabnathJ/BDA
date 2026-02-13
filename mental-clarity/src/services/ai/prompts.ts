export function buildEntityPrompt(userText: string): string {
  return `Extract all meaningful entities from this text. Return ONLY valid JSON.

Text: "${userText}"

Respond with this exact JSON structure:
{
  "entities": [
    {
      "label": "short entity name (1-4 words)",
      "category": "organic|technical|creative|learning|personal"
    }
  ]
}

Rules:
- Extract 2-8 entities depending on text complexity
- Use concise labels (1-4 words)
- Categories: "organic" (natural/lifestyle), "technical" (code/systems), "creative" (art/design), "learning" (education/skills), "personal" (people/self)
- No duplicates
- No generic entities like "thing" or "stuff"`;
}

export function buildRelationshipPrompt(
  userText: string,
  entities: string[],
): string {
  return `Given this text and extracted entities, identify relationships between them. Return ONLY valid JSON.

Text: "${userText}"

Entities: ${JSON.stringify(entities)}

Respond with this exact JSON structure:
{
  "relationships": [
    {
      "sourceLabel": "entity name from list",
      "targetLabel": "different entity name from list",
      "label": "describes the relationship",
      "type": "related|causes|part-of|depends-on|similar|contrasts",
      "strength": 0.1 to 1.0
    }
  ]
}

Rules:
- Only use entity labels from the provided list
- sourceLabel and targetLabel must be different
- strength: 0.8-1.0 (explicit connection), 0.5-0.7 (implied), 0.1-0.4 (weak/tangential)
- type: "related" (general), "causes" (A leads to B), "part-of" (A is subset of B), "depends-on" (A requires B), "similar" (A ≈ B), "contrasts" (A vs B)
- Maximum ${Math.min(entities.length * 2, 12)} relationships`;
}
