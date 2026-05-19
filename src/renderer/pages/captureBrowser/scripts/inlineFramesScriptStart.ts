/* eslint-disable no-useless-escape */
export const INLINE_FRAMES_SCRIPT_START = `
  (function() {
    var capturedMap = `;

export const INLINE_FRAMES_SCRIPT_MIDDLE = `;

    function findCapturedHtml(src) {
      if (capturedMap[src]) return capturedMap[src];
      var normalized = src.replace(/[#?].*$/, "").replace(/\/+$/, "");
      if (capturedMap[normalized]) return capturedMap[normalized];
      var keys = Object.keys(capturedMap);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(src) >= 0 || src.indexOf(keys[i]) >= 0) return capturedMap[keys[i]];
      }
      try {
        var srcUrl = new URL(src);
        var srcPath = srcUrl.pathname.replace(/\/+$/, "");
        for (var j = 0; j < keys.length; j++) {
          try {
            var keyUrl = new URL(keys[j]);
            var keyPath = keyUrl.pathname.replace(/\/+$/, "");
            if (srcPath === keyPath && srcPath.length > 1) return capturedMap[keys[j]];
          } catch(e2) {}
        }
      } catch(e) {}
      return null;
    }

    function replaceIframe(iframe, scopeId) {
      var src = iframe.getAttribute("src") || iframe.src;
      try { src = new URL(src, document.baseURI).href; } catch(e) {}
      var capturedHtml = findCapturedHtml(src);
      if (!capturedHtml) return false;
      var doc = new DOMParser().parseFromString(capturedHtml, "text/html");
      doc.querySelectorAll('#trust-warning, .trust-warning, [class*="trust-warning"], [class*="embed-warning"], #embed-trust, [class*="TrustWarning"], [data-testid*="trust"]').forEach(function(el) { el.remove(); });
      doc.querySelectorAll('div, section, aside, p, span').forEach(function(el) {
        if (el.textContent && el.textContent.indexOf('Do not enter passwords') >= 0 && el.textContent.indexOf('CodePen') >= 0) el.remove();
      });
      var nestedIframes = doc.querySelectorAll("iframe");
      for (var ni = nestedIframes.length - 1; ni >= 0; ni--) replaceIframeInDoc(doc, nestedIframes[ni], scopeId + "-" + ni, src);
      var container = document.createElement("div");
      container.setAttribute("data-iframe-inline", scopeId);
      container.setAttribute("data-iframe-src", iframe.getAttribute("src") || "");
      var width = iframe.getAttribute("width") || iframe.style.width || "100%";
      var height = iframe.getAttribute("height") || iframe.style.height || "auto";
      container.style.width = (typeof width === "string" && width.indexOf("%") >= 0) ? width : width + "px";
      container.style.height = height === "auto" ? "auto" : (typeof height === "string" && height.indexOf("%") >= 0) ? height : height + "px";
      container.style.overflow = "hidden";
      container.style.position = "relative";
      var scopeSelector = '[data-iframe-inline="' + scopeId + '"]';
      var iframeStyles = doc.querySelectorAll("style");
      for (var si = 0; si < iframeStyles.length; si++) {
        var css = iframeStyles[si].textContent || "";
        css = css.replace(/([^{}]+)\{/g, function(match, selectors) {
          if (selectors.trim().charAt(0) === "@") return match;
          var parts = selectors.split(",").map(function(sel) {
            var trimmed = sel.trim();
            if (!trimmed) return sel;
            if (trimmed === "html" || trimmed === "body" || trimmed === ":root") return scopeSelector;
            return scopeSelector + " " + trimmed;
          });
          return parts.join(",") + "{";
        });
        var scopedStyle = document.createElement("style");
        scopedStyle.textContent = css;
        container.appendChild(scopedStyle);
      }
      var bodyContent = doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;
      var contentWrapper = document.createElement("div");
      contentWrapper.style.height = "100%";
      contentWrapper.style.width = "100%";
      contentWrapper.innerHTML = bodyContent;
      if (doc.body) {
        contentWrapper.className = doc.body.className;
        var bodyStyle = doc.body.getAttribute("style");
        if (bodyStyle) contentWrapper.setAttribute("style", "height:100%;width:100%;" + bodyStyle);
      }
      container.appendChild(contentWrapper);
      iframe.replaceWith(container);
      return true;
    }
`;
