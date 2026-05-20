
// This script is built dynamically with the AI results injected
export function createMatchComponentsScript(aiComponents: { name: string; selector: string; count: number; description: string; props: { name: string; type: string; description: string }[] }[]) {
  const serialized = JSON.stringify(aiComponents);
  return `
    (function() {
      var aiComponents = ${serialized};
      var results = [];

      for (var i = 0; i < aiComponents.length; i++) {
        var comp = aiComponents[i];
        try {
          var elements = document.querySelectorAll(comp.selector);
          if (elements.length === 0) continue;

          var representative = elements[0];
          var hash = 'ai-' + comp.selector.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);

          results.push({
            label: comp.name,
            html: representative.outerHTML,
            count: elements.length,
            hash: hash,
            description: comp.description || '',
            props: comp.props || []
          });
        } catch (e) {
          // Invalid selector, skip this component
        }
      }

      return results;
    })()
  `;
}
