if (typeof module === 'undefined') var module = { exports: {} };
(function (module, exports) {

  // ...existing code...

})(module, module.exports);
// expose to window so app can read it
window.STRONGS_GREEK = module.exports;