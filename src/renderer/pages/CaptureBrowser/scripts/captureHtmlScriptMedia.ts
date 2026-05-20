export const CAPTURE_HTML_SCRIPT_MEDIA = `
    _log("[step:stylesheets] Stylesheet inlining skipped (handled via CSSOM snapshot)");
    const images = document.querySelectorAll("img");
    _log("[step:images] Converting " + images.length + " image(s) to data URIs...");
    for (const img of images) {
      if (img.loading === "lazy") img.loading = "eager";
    }
    await new Promise(resolve => {
      var pending = 0;
      var done = false;
      var timeout = setTimeout(() => { done = true; resolve(undefined); }, 5000);
      for (const img of images) {
        if (img.complete && img.naturalWidth > 0) continue;
        if (!img.src || img.src.startsWith("data:")) continue;
        pending++;
        var check = () => { pending--; if (pending <= 0 && !done) { done = true; clearTimeout(timeout); resolve(undefined); } };
        img.addEventListener("load", check, { once: true });
        img.addEventListener("error", check, { once: true });
      }
      if (pending === 0) { done = true; clearTimeout(timeout); resolve(undefined); }
    });
    for (const img of images) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 200;
        const ctx = canvas.getContext("2d");
        if (ctx && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, 0, 0);
          img.src = canvas.toDataURL("image/png");
          img.removeAttribute("srcset");
        }
      } catch {}
    }
    _log("Done converting images");
    const videos = document.querySelectorAll("video");
    _log("[step:videos] Capturing " + videos.length + " video poster frame(s)...");
    for (const video of videos) {
      try {
        var replaced = false;
        if (video.src || video.querySelector("source")) {
          if (video.readyState < 2) {
            video.preload = "auto";
            video.muted = true;
            video.load();
            await new Promise(resolve => {
              var t = setTimeout(resolve, 3000);
              video.addEventListener("loadeddata", () => { clearTimeout(t); resolve(undefined); }, { once: true });
              video.addEventListener("error", () => { clearTimeout(t); resolve(undefined); }, { once: true });
            });
          }
          if (video.readyState >= 2 && video.videoWidth > 0) {
            video.currentTime = 0.1;
            await new Promise(resolve => {
              var t = setTimeout(resolve, 2000);
              video.addEventListener("seeked", () => { clearTimeout(t); resolve(undefined); }, { once: true });
            });
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
              var pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
              var hasContent = false;
              for (var pi = 3; pi < pixelData.length; pi += 400) if (pixelData[pi] > 0) { hasContent = true; break; }
              if (hasContent) {
                const dataUri = canvas.toDataURL("image/jpeg", 0.85);
                const img = document.createElement("img");
                img.src = dataUri;
                img.className = video.className;
                var vstyle = video.getAttribute("style");
                if (vstyle) img.setAttribute("style", vstyle);
                img.setAttribute("alt", "Video poster");
                video.replaceWith(img);
                replaced = true;
              }
            }
          }
        }
        if (!replaced) {
          if (video.poster) {
            const img = document.createElement("img");
            img.src = video.poster;
            img.className = video.className;
            var vstyle2 = video.getAttribute("style");
            if (vstyle2) img.setAttribute("style", vstyle2);
            img.setAttribute("alt", "Video poster");
            video.replaceWith(img);
          } else {
            const placeholder = document.createElement("div");
            placeholder.className = video.className;
            var existingStyle = video.getAttribute("style") || "";
            placeholder.setAttribute("style", existingStyle + ";background:#1a1a2e;display:flex;align-items:center;justify-content:center;min-height:120px;");
            placeholder.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
            video.replaceWith(placeholder);
          }
        }
      } catch (e) { _log("  FAILED video capture: " + (e && e.message || e)); }
    }
    _log("Done capturing video posters");
    var bgElements = document.querySelectorAll('[style*="background"]');
    _log("[step:backgrounds] Resolving " + bgElements.length + " element(s) with background image URLs...");
    var bgResolvedCount = 0;
    for (var bgEl of bgElements) {
      try {
        var bgStyle = bgEl.getAttribute("style") || "";
        var bgUrlRegex = /url\\(["']?(?!data:|https?:\\/\\/)([^"')]+?)["']?\\)/g;
        var bgMatch, newStyle = bgStyle;
        while ((bgMatch = bgUrlRegex.exec(bgStyle)) !== null) {
          try {
            var resolvedBgUrl = new URL(bgMatch[1], document.baseURI).href;
            newStyle = newStyle.replace(bgMatch[0], 'url("' + resolvedBgUrl + '")');
            bgResolvedCount++;
          } catch (e2) {}
        }
        if (newStyle !== bgStyle) bgEl.setAttribute("style", newStyle);
      } catch (e) {}
    }
    _log("Resolved " + bgResolvedCount + " background image URL(s) to absolute");
`;
