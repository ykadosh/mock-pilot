
export const CAPTURE_HTML_SCRIPT_CROP = `
    _log("[step:crop] Cropping DOM to requested region...");
    var _cropTop = __CROP_TOP__;
    var _cropHeight = __CROP_HEIGHT__;
    var _cropPageHeight = __CROP_PAGE_HEIGHT__;
    _log("Crop region: top=" + _cropTop + "px height=" + _cropHeight + "px pageHeight=" + _cropPageHeight + "px");
    var _cropMeta = document.createElement('meta');
    _cropMeta.name = 'mp-crop';
    _cropMeta.content = 'top=' + _cropTop + ';height=' + _cropHeight;
    document.head.appendChild(_cropMeta);
    // Surface crop height as the canonical viewport height for the editor iframe.
    // Cleanup later appends another mp-viewport-height meta; the resize script
    // uses querySelector and reads ours first so the iframe sizes to the crop.
    var _cropVpMeta = document.createElement('meta');
    _cropVpMeta.name = 'mp-viewport-height';
    _cropVpMeta.content = String(_cropHeight);
    document.head.appendChild(_cropVpMeta);
    // Move all in-flow body children into a wrapper and translate the wrapper
    // up by cropTop. We keep every original element (no removal) so the layout
    // is identical to the live page — the crop is purely visual via transform
    // and html/body overflow:hidden. Fixed/sticky children stay at body level
    // so they aren't trapped inside the transform's containing block (which
    // would detach them from the viewport anchoring they rely on).
    var _flowChildren = [];
    var _skippedFixedCount = 0;
    for (var _wi = 0; _wi < document.body.children.length; _wi++) {
      var _wc = document.body.children[_wi];
      var _wcs; try { _wcs = getComputedStyle(_wc); } catch (e) { _wcs = null; }
      if (_wcs && (_wcs.position === 'fixed' || _wcs.position === 'sticky')) {
        _skippedFixedCount++;
        continue;
      }
      _flowChildren.push(_wc);
    }
    var _wrapper = document.createElement('div');
    _wrapper.setAttribute('data-mp-crop-wrapper', 'true');
    // No position/margin/padding on the wrapper — we want it transparent to
    // layout so the in-flow children render at the exact same coordinates they
    // had before wrapping. The transform shifts the rendered pixels up.
    // min-height is set to the original page height so the wrapper preserves
    // the layout context the live page had (percentage/viewport heights,
    // bottom-anchored absolute positioning, etc. resolve against pageHeight
    // rather than the clipped cropHeight).
    _wrapper.style.cssText = 'display:block;height:' + _cropPageHeight +
      'px;min-height:' + _cropPageHeight +
      'px;transform:translateY(-' + _cropTop +
      'px);transform-origin:top left;';
    document.body.insertBefore(_wrapper, document.body.firstChild);
    for (var _mi = 0; _mi < _flowChildren.length; _mi++) {
      _wrapper.appendChild(_flowChildren[_mi]);
    }
    // Clip the document to the crop region. setProperty(...,'important') so
    // page rules like "html, body { height: 100% }" can't override the clip.
    var _clipTargets = [document.documentElement, document.body];
    for (var _ti = 0; _ti < _clipTargets.length; _ti++) {
      var _el = _clipTargets[_ti];
      _el.style.setProperty('height', _cropHeight + 'px', 'important');
      _el.style.setProperty('min-height', _cropHeight + 'px', 'important');
      _el.style.setProperty('max-height', _cropHeight + 'px', 'important');
      _el.style.setProperty('overflow', 'hidden', 'important');
    }
    _log("Cropped DOM: wrapped " + _flowChildren.length + " in-flow child(ren), skipped " + _skippedFixedCount + " fixed/sticky, clipped to " + _cropHeight + "px (offset=" + _cropTop + "px)");
`;
