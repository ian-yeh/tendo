export function validatePrompt(prompt: string): { valid: boolean; issue?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, issue: 'Prompt cannot be empty' };
  }

  if (prompt.length < 10) {
    return { valid: false, issue: 'Prompt is too short — provide more detail about what you want the agent to do' };
  }

  // Check if prompt describes a clear outcome
  const actionKeywords = ['click', 'find', 'search', 'navigate', 'fill', 'enter', 'scroll', 'select', 'check', 'verify', 'complete', 'add', 'submit', 'login', 'view'];
  const hasAction = actionKeywords.some(kw => prompt.toLowerCase().includes(kw));

  if (!hasAction) {
    return {
      valid: false,
      issue: 'Prompt should describe a clear action (e.g., click, search, navigate, fill, verify). Your prompt lacks actionable direction.',
    };
  }

  // Check if prompt is too vague
  const vaguePatterns = ['do something', 'check stuff', 'explore', 'mess around', 'try to'];
  const isTooVague = vaguePatterns.some(pattern => prompt.toLowerCase().includes(pattern));

  if (isTooVague) {
    return {
      valid: false,
      issue: 'Prompt is too vague. Be specific about what the agent should do and what success looks like.',
    };
  }

  return { valid: true };
}
