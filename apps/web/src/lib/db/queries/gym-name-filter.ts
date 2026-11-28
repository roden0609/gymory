export function gymNameFilter(term: string) {
  // Escape literal regex characters, then quote for PostgREST's OR grammar.
  const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const operand = `"${pattern.replace(/["\\]/g, "\\$&")}"`;
  return `name.imatch.${operand},name_zh.imatch.${operand}`;
}
