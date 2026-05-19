/* eslint-disable no-useless-escape */
export const EXTRACT_ASSETS_SCRIPT = `
  (function() {
    var typographyMap = {};
    var colorSet = { text: {}, background: {}, border: {} };
    function rgbToHex(rgb) {
      if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return null;
      var match = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
      if (!match) return rgb.startsWith("#") ? rgb.toLowerCase() : null;
      var r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    var allElements = document.querySelectorAll("*");
    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      var cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
      var textColor = rgbToHex(cs.color);
      if (textColor) colorSet.text[textColor] = true;
      var bgColor = rgbToHex(cs.backgroundColor);
      if (bgColor) colorSet.background[bgColor] = true;
      var borderColor = rgbToHex(cs.borderColor);
      if (borderColor && cs.borderWidth !== "0px") colorSet.border[borderColor] = true;
      if (!el.textContent || !el.textContent.trim()) continue;
      var hasDirectText = false;
      for (var c = 0; c < el.childNodes.length; c++) {
        if (el.childNodes[c].nodeType === 3 && el.childNodes[c].textContent.trim()) {
          hasDirectText = true;
          break;
        }
      }
      if (!hasDirectText) continue;
      var key = cs.fontFamily.toLowerCase() + "|" + cs.fontSize + "|" + cs.fontWeight + "|" + cs.fontStyle + "|" + cs.letterSpacing + "|" + cs.textTransform;
      if (!typographyMap[key]) {
        typographyMap[key] = { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, textTransform: cs.textTransform };
      }
    }
    var typography = Object.values(typographyMap);
    var uniqueColors = {};
    Object.keys(colorSet.text).forEach(function(c) { uniqueColors[c] = true; });
    Object.keys(colorSet.background).forEach(function(c) { uniqueColors[c] = true; });
    Object.keys(colorSet.border).forEach(function(c) { uniqueColors[c] = true; });
    var colors = Object.keys(uniqueColors).map(function(c) { return { value: c }; });
    return { typography: typography, colors: colors };
  })()
`;
