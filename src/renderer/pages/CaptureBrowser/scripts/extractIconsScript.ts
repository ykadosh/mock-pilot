/**
 * Script that runs in the webview during capture to detect icon font libraries.
 * It checks @font-face font-family names and element class patterns against known libraries.
 * Returns an array of detected library IDs.
 */
export const EXTRACT_ICONS_SCRIPT = `
  (function() {
    var detected = {};

    var libraries = [
      {
        id: "font-awesome",
        fontFamilyPatterns: [/font\\s*awesome/i, /FontAwesome/i],
        classPatterns: [/\\bfa[srlbdk]?\\b/, /\\bfa-/]
      },
      {
        id: "material-icons",
        fontFamilyPatterns: [/material\\s*icons/i, /material\\s*symbols/i],
        classPatterns: [/\\bmaterial-icons\\b/, /\\bmaterial-symbols/]
      },
      {
        id: "bootstrap-icons",
        fontFamilyPatterns: [/bootstrap[\\s-]*icons/i],
        classPatterns: [/\\bbi\\b/, /\\bbi-/]
      },
      {
        id: "remix-icons",
        fontFamilyPatterns: [/remixicon/i, /remix[\\s-]*icon/i],
        classPatterns: [/\\bri-/]
      }
    ];

    // Check @font-face declarations for matching font-family names
    var styleSheets = document.styleSheets;
    for (var s = 0; s < styleSheets.length; s++) {
      try {
        var rules = styleSheets[s].cssRules || styleSheets[s].rules;
        if (!rules) continue;
        for (var r = 0; r < rules.length; r++) {
          var rule = rules[r];
          if (rule.type === CSSRule.FONT_FACE_RULE) {
            var family = rule.style.getPropertyValue("font-family").replace(/['"]/g, "").trim();
            for (var li = 0; li < libraries.length; li++) {
              var lib = libraries[li];
              for (var pi = 0; pi < lib.fontFamilyPatterns.length; pi++) {
                if (lib.fontFamilyPatterns[pi].test(family)) {
                  detected[lib.id] = true;
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    // Also check inline <style> tags for @font-face font-family
    var inlineStyles = document.querySelectorAll("style");
    for (var si = 0; si < inlineStyles.length; si++) {
      var text = inlineStyles[si].textContent || "";
      var fontFaceMatches = text.match(/@font-face\\s*\\{[^}]*\\}/gi);
      if (!fontFaceMatches) continue;
      for (var fi = 0; fi < fontFaceMatches.length; fi++) {
        var familyMatch = fontFaceMatches[fi].match(/font-family\\s*:\\s*['"]?([^;'"\\}]+)/i);
        if (!familyMatch) continue;
        var familyName = familyMatch[1].trim().replace(/['"]/g, "");
        for (var li2 = 0; li2 < libraries.length; li2++) {
          var lib2 = libraries[li2];
          for (var pi2 = 0; pi2 < lib2.fontFamilyPatterns.length; pi2++) {
            if (lib2.fontFamilyPatterns[pi2].test(familyName)) {
              detected[lib2.id] = true;
            }
          }
        }
      }
    }

    // Check element class names for icon library patterns
    var allElements = document.querySelectorAll("*");
    for (var ei = 0; ei < allElements.length; ei++) {
      var className = allElements[ei].className;
      if (typeof className !== "string" || !className) continue;
      for (var li3 = 0; li3 < libraries.length; li3++) {
        if (detected[libraries[li3].id]) continue;
        var lib3 = libraries[li3];
        for (var pi3 = 0; pi3 < lib3.classPatterns.length; pi3++) {
          if (lib3.classPatterns[pi3].test(className)) {
            detected[lib3.id] = true;
            break;
          }
        }
      }
      // Early exit if all detected
      if (Object.keys(detected).length === libraries.length) break;
    }

    return { libraries: Object.keys(detected) };
  })()
`;
