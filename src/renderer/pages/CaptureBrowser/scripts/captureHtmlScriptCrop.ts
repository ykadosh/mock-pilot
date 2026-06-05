
export const CAPTURE_HTML_SCRIPT_CROP = `
    _log("[step:crop] Cropping DOM to requested region...");
    var _cropTop = __CROP_TOP__;
    var _cropHeight = __CROP_HEIGHT__;
    var _cropBottom = _cropTop + _cropHeight;
    _log("Crop region: top=" + _cropTop + "px height=" + _cropHeight + "px (bottom=" + _cropBottom + "px)");
    // Extended-crop note: we deliberately do NOT freeze inline heights or pin a chain
    // of wrappers here. The webview is at the extended size, the page has already
    // responded to the resize event, and the cleanup step records that size in the
    // mp-viewport-height meta. The editor iframe sizes itself to that value, so
    // viewport-relative CSS (100vh, position:absolute top/bottom, %) reproduces the
    // exact live layout in the editor without us re-pinning anything.
    function _getAbsoluteTop(el) {
      var rect; try { rect = el.getBoundingClientRect(); } catch (e) { return null; }
      return { top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY, height: rect.height };
    }
    var _bodyChildren = Array.prototype.slice.call(document.body.children);
    var _removedAboveTotal = 0;
    var _removedBelowTotal = 0;
    var _keptCount = 0;
    var _skippedFixedCount = 0;
    for (var _ci = 0; _ci < _bodyChildren.length; _ci++) {
      var _child = _bodyChildren[_ci];
      var _cs; try { _cs = getComputedStyle(_child); } catch (e) { _cs = null; }
      // Viewport-anchored elements (fixed/sticky headers, nav bars, modal layers)
      // intentionally render outside normal flow. Removing them based on document
      // coordinates would drop kept overlays, so leave them in place.
      if (_cs && (_cs.position === 'fixed' || _cs.position === 'sticky')) { _skippedFixedCount++; continue; }
      var _bounds = _getAbsoluteTop(_child);
      if (!_bounds) { _keptCount++; continue; }
      if (_bounds.bottom <= _cropTop) {
        _removedAboveTotal += _bounds.height;
        _child.remove();
        continue;
      }
      if (_bounds.top >= _cropBottom) {
        _removedBelowTotal += _bounds.height;
        _child.remove();
        continue;
      }
      _keptCount++;
    }
    // Preserve original Y of kept elements by reinserting placeholders that match the
    // total height of removed siblings on each side. This keeps in-flow layout stable
    // for any later script that measures positions.
    if (_removedAboveTotal > 0) {
      var _topPlaceholder = document.createElement('div');
      _topPlaceholder.setAttribute('data-mp-crop-placeholder', 'top');
      _topPlaceholder.style.height = _removedAboveTotal + 'px';
      _topPlaceholder.style.width = '100%';
      document.body.insertBefore(_topPlaceholder, document.body.firstChild);
    }
    if (_removedBelowTotal > 0) {
      var _bottomPlaceholder = document.createElement('div');
      _bottomPlaceholder.setAttribute('data-mp-crop-placeholder', 'bottom');
      _bottomPlaceholder.style.height = _removedBelowTotal + 'px';
      _bottomPlaceholder.style.width = '100%';
      document.body.appendChild(_bottomPlaceholder);
    }
    var _cropMeta = document.createElement('meta');
    _cropMeta.name = 'mp-crop';
    _cropMeta.content = 'top=' + _cropTop + ';height=' + _cropHeight;
    document.head.appendChild(_cropMeta);
    // Sites with JS-driven or viewport-relative heights collapse back to their original
    // size when the captured HTML is rendered outside the force-resized webview. Pin
    // the document min-height to the crop bottom so the editor reproduces the same
    // canvas height the user previewed, even if internal containers shrink.
    document.documentElement.style.minHeight = _cropBottom + 'px';
    document.body.style.minHeight = _cropBottom + 'px';
    var _postCropHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    if (_postCropHeight < _cropBottom) {
      var _extensionSpacer = document.createElement('div');
      _extensionSpacer.setAttribute('data-mp-crop-placeholder', 'extension');
      _extensionSpacer.style.height = (_cropBottom - _postCropHeight) + 'px';
      _extensionSpacer.style.width = '100%';
      document.body.appendChild(_extensionSpacer);
    }
    _log("Cropped DOM: kept " + _keptCount + " body children, removed " + (_bodyChildren.length - _keptCount - _skippedFixedCount) +
      " (above=" + _removedAboveTotal + "px, below=" + _removedBelowTotal + "px), skipped " + _skippedFixedCount + " fixed/sticky, pinned doc to " + _cropBottom + "px");
`;
