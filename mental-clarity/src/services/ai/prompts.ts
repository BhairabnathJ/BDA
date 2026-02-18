// ── Prompt A: Topic Extraction + Hierarchy ──

export function promptA_TopicHierarchy(text: string): string {
  return `Analyze this brain dump and extract topics organized into a hierarchy.

Text: "${text}"

Return ONLY this JSON structure:
{
  "topics": [
    {
      "label": "short name (1-4 words)",
      "level": 1 or 2,
      "kind": "umbrella" or "subnode",
      "category": "organic|technical|creative|learning|personal",
      "parentLabel": "umbrella label (only if kind=subnode)"
    }
  ]
}

Rules:
- Extract 4–12 topics depending on text complexity
- Level 1 = broad life areas (Work, School, Health, Money, Hobbies) → kind "umbrella"
- Level 2 = specific themes under an umbrella → kind "subnode", must have parentLabel
- Categories: "technical" (code/engineering), "learning" (school/study), "personal" (self/relationships), "organic" (health/lifestyle), "creative" (art/music/hobbies)
- Every subnode must reference a valid umbrella parentLabel
- No duplicates. No generics like "stuff" or "things"`;
}

// ── Prompt B: Node Matching + Multi-Parent ──

export function promptB_NodeMatching(
  text: string,
  newTopics: { label: string; kind: string }[],
  existingNodes: { id: string; label: string; kind: string }[],
): string {
  return `Given a brain dump, newly extracted topics, and existing graph nodes, decide:
1) Does each new topic match an existing node? (similarity > 0.75 = match)
2) Which parent umbrellas should each topic belong to?
3) What text segment from the dump provides context for each parent relationship?

Text: "${text}"

New topics: ${JSON.stringify(newTopics)}

Existing nodes: ${JSON.stringify(existingNodes)}

Return ONLY this JSON:
{
  "topics": [
    {
      "label": "topic label",
      "match": { "existingNodeId": "id or null", "similarity": 0.0-1.0 } | null,
      "parents": [
        {
          "parentId": "umbrella node id",
          "contextSegment": "exact quote from text relevant to this parent"
        }
      ]
    }
  ]
}

Rules:
- If a topic matches an existing node (similarity >= 0.75), reuse it
- A subnode CAN have multiple parents (e.g., "sleep issues" under both Health and Work)
- contextSegment should be a direct quote from the text (1-2 sentences)
- Every topic must have at least 1 parent`;
}

// ── Prompt C: Relationships ──

export function promptC_Relationships(
  text: string,
  nodes: { id: string; label: string }[],
): string {
  return `Identify relationships between these nodes based on the text.

Text: "${text}"

Nodes: ${JSON.stringify(nodes)}

Return ONLY this JSON:
{
  "relationships": [
    {
      "sourceLabel": "node label from list",
      "targetLabel": "different node label from list",
      "label": "describes the relationship",
      "justification": "1 short sentence grounded in the text",
      "type": "direct|semantic|causes|part-of|contrasts",
      "strength": 0.1 to 1.0
    }
  ]
}

Rules:
- Only use labels from the provided node list
- Types: "direct" (explicitly mentioned together), "semantic" (thematically related), "causes" (A leads to B), "part-of" (A is subset of B), "contrasts" (A vs B)
- justification should reference why this relationship exists in this dump
- Strength: 0.8-1.0 (explicit), 0.5-0.7 (implied), 0.1-0.4 (tangential)
- Max ${Math.min(nodes.length * 2, 15)} relationships
- Prefer quality over quantity — skip weak/obvious connections`;
}

// ── Prompt D: Task Extraction (optional) ──

export function promptD_Tasks(
  text: string,
  topics: string[],
): string {
  return `Extract actionable tasks or TODO items from this text.

Text: "${text}"

Known topics: ${JSON.stringify(topics)}

Return ONLY this JSON:
{
  "tasks": [
    {
      "label": "actionable task description",
      "relatedTopic": "closest topic label from the list"
    }
  ]
}

Rules:
- Only extract things the user clearly needs/wants to DO
- relatedTopic must match a label from the list
- Keep task labels concise but specific
- Max 8 tasks`;
}

// ── Prompt E: Summary (deferred, called on page open) ──

export function promptE_Summary(
  segments: string[],
  topicLabel: string,
): string {
  return `Summarize these text segments about "${topicLabel}" into 2-3 sentences.

Segments:
${segments.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

Return ONLY this JSON:
{ "summary": "2-3 sentence summary" }`;
}

// ── Legacy prompts (backward compat) ──

export function buildEntityPrompt(userText: string): string {
  return promptA_TopicHierarchy(userText);
}

export function buildRelationshipPrompt(
  userText: string,
  entities: string[],
): string {
  return promptC_Relationships(
    userText,
    entities.map((label, i) => ({ id: `node-${i}`, label })),
  );
}
