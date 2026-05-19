/* eslint-disable no-useless-escape */
export const INLINE_FRAMES_SCRIPT_END = `
    function replaceIframeInDoc(doc, iframe, scopeId, parentUrl) {
      var src = iframe.getAttribute("src") || iframe.getAttribute("data-src") || "";
      try { src = new URL(src, parentUrl || document.baseURI).href; } catch(e) {}
      var capturedHtml = findCapturedHtml(src);
      if (!capturedHtml) {
        iframe.remove();
        return;
      }
      var innerDoc = new DOMParser().parseFromString(capturedHtml, "text/html");
      innerDoc.querySelectorAll('#trust-warning, .trust-warning, [class*="trust-warning"], [class*="embed-warning"], #embed-trust, [class*="TrustWarning"], [data-testid*="trust"]').forEach(function(el) { el.remove(); });
      innerDoc.querySelectorAll('div, section, aside, p, span').forEach(function(el) {
        if (el.textContent && el.textContent.indexOf('Do not enter passwords') >= 0 && el.textContent.indexOf('CodePen') >= 0) el.remove();
      });
      var container = doc.createElement("div");
      container.setAttribute("data-iframe-inline", scopeId);
      container.style.width = iframe.getAttribute("width") || iframe.style.width || "100%";
      container.style.height = iframe.getAttribute("height") || iframe.style.height || "100%";
      container.style.overflow = "hidden";
      var styles = innerDoc.querySelectorAll("style");
      var nestedScope = '[data-iframe-inline="' + scopeId + '"]';
      for (var si = 0; si < styles.length; si++) {
        var css = styles[si].textContent || "";
        css = css.replace(/([^{}]+)\{/g, function(match, selectors) {
          if (selectors.trim().charAt(0) === "@") return match;
          var parts = selectors.split(",").map(function(sel) {
            var trimmed = sel.trim();
            if (!trimmed) return sel;
            if (trimmed === "html" || trimmed === "body" || trimmed === ":root") return nestedScope;
            return nestedScope + " " + trimmed;
          });
          return parts.join(",") + "{";
        });
        var scopedStyle = doc.createElement("style");
        scopedStyle.textContent = css;
        container.appendChild(scopedStyle);
      }
      var bodyContent = innerDoc.body ? innerDoc.body.innerHTML : innerDoc.documentElement.innerHTML;
      var wrapper = doc.createElement("div");
      wrapper.style.height = "100%";
      wrapper.style.width = "100%";
      wrapper.innerHTML = bodyContent;
      if (innerDoc.body) {
        wrapper.className = innerDoc.body.className;
        var bodyStyle = innerDoc.body.getAttribute("style");
        if (bodyStyle) wrapper.setAttribute("style", "height:100%;width:100%;" + bodyStyle);
      }
      container.appendChild(wrapper);
      iframe.replaceWith(container);
    }

    var iframes = document.querySelectorAll("iframe");
    for (var i = iframes.length - 1; i >= 0; i--) {
      var iframe = iframes[i];
      var src = iframe.getAttribute("src") || iframe.src;
      if (!src || src === "about:blank" || src.indexOf("javascript:") === 0 || src.indexOf("data:") === 0) continue;
      replaceIframe(iframe, "iframe-inline-" + i);
    }
  })()
`;
