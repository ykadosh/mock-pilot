export interface CssRule {
  selector: string;
  body: string;
}

/** Parses CSS text into rules, handling nested blocks (media queries, keyframes, etc.) */
export function parseCssRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  let i = 0;

  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;

    const braceStart = css.indexOf("{", i);
    if (braceStart === -1) break;

    const selector = css.slice(i, braceStart).trim();

    let depth = 1;
    let j = braceStart + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }

    const body = css.slice(braceStart + 1, j - 1).trim();
    rules.push({ selector, body });
    i = j;
  }

  return rules;
}

export function formatRule(selector: string, body: string): string {
  const declarations = body.split(";").filter((s) => s.trim());
  return `${selector} {\n  ${declarations.map((s) => s.trim()).join(";\n  ")};\n}`;
}

function matchNestedRules(atRule: CssRule, selector: string, property: string | undefined): string[] {
  const results: string[] = [];
  const nestedRules = parseCssRules(atRule.body);
  for (const nested of nestedRules) {
    if (!nested.selector.includes(selector)) continue;
    if (property && !nested.body.includes(property)) continue;
    const formatted = formatRule(nested.selector, nested.body).split("\n").join("\n  ");
    results.push(`${atRule.selector} {\n  ${formatted}\n}`);
  }
  return results;
}

export function matchRule(rule: CssRule, selector: string, property: string | undefined): string[] {
  if (rule.selector.startsWith("@")) {
    if (rule.selector.includes(selector)) {
      if (!property || rule.body.includes(property)) {
        return [formatRule(rule.selector, rule.body)];
      }
    }
    return matchNestedRules(rule, selector, property);
  }

  if (!rule.selector.includes(selector)) return [];
  if (property && !rule.body.includes(property)) return [];
  return [formatRule(rule.selector, rule.body)];
}
