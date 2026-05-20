
export const EXTRACT_COMPONENTS_SCRIPT = `
  (function() {
    // Simplify the page HTML into a condensed representation for AI analysis
    function simplifyHtml() {
      var SKIP_TAGS = ['script', 'style', 'link', 'meta', 'noscript', 'svg', 'path', 'br', 'hr', 'head'];
      var MAX_TEXT_LENGTH = 20;
      var MAX_DEPTH = 8;

      function simplifyElement(el, depth) {
        if (depth > MAX_DEPTH) return '';
        var tag = el.tagName.toLowerCase();
        if (SKIP_TAGS.indexOf(tag) !== -1) return '';

        var cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return '';

        // Build opening tag with meaningful attributes only
        var attrs = '';
        var className = el.getAttribute('class');
        if (className) attrs += ' class="' + className.trim() + '"';
        var role = el.getAttribute('role');
        if (role) attrs += ' role="' + role + '"';
        var ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) attrs += ' aria-label="' + ariaLabel + '"';
        var href = el.getAttribute('href');
        if (href) attrs += ' href="..."';
        var type = el.getAttribute('type');
        if (type) attrs += ' type="' + type + '"';
        var src = el.getAttribute('src');
        if (src) attrs += ' src="..."';

        var children = '';
        for (var i = 0; i < el.childNodes.length; i++) {
          var child = el.childNodes[i];
          if (child.nodeType === 1) {
            children += simplifyElement(child, depth + 1);
          } else if (child.nodeType === 3) {
            var text = child.textContent.trim();
            if (text) {
              children += text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) + '...' : text;
            }
          }
        }

        // Collapse empty wrapper divs/spans with no meaningful attrs
        if ((tag === 'div' || tag === 'span') && !role && !ariaLabel && !className) {
          return children;
        }

        if (!children && !attrs && (tag === 'div' || tag === 'span')) return '';

        return '<' + tag + attrs + '>' + children + '</' + tag + '>';
      }

      return simplifyElement(document.body, 0);
    }

    // Extract all page CSS from style tags
    function extractPageCss() {
      var cssBlocks = [];
      var styles = document.querySelectorAll('style');
      for (var i = 0; i < styles.length; i++) {
        var text = styles[i].textContent || '';
        if (text.trim()) cssBlocks.push(text);
      }
      return cssBlocks.join('\\n');
    }

    return { simplifiedHtml: simplifyHtml(), pageCss: extractPageCss() };
  })()
`;
