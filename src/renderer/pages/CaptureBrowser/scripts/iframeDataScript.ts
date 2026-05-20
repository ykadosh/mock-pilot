export const IFRAME_DATA_SCRIPT = `
  (function() {
    var iframes = document.querySelectorAll("iframe");
    var data = [];
    iframes.forEach(function(iframe, index) {
      var src = iframe.getAttribute("src") || iframe.src;
      if (src && src !== "about:blank" && src.indexOf("javascript:") !== 0 && src.indexOf("data:") !== 0) {
        try { src = new URL(src, document.baseURI).href; } catch(e) {}
        data.push({ src: src, index: index });
      }
    });
    return data;
  })()
`;
