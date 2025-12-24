// Reusable QR sharing helper
// Usage: include this script and call initQrShare({container:'#qr-box'})
(function(){
  function makeQrLib(cb){
    if (window.QRCode) return cb();
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    s.onload=cb; document.head.appendChild(s);
  }
  function isLocal(url){
    return /^file:/i.test(url)||/localhost|127\.0\.0\.1|192\.168\./.test(url);
  }
  window.initQrShare=function(opts){
    opts=opts||{};
    var selector=opts.container||'#qr-code';
    var el=document.querySelector(selector);
    if(!el){return;}
    makeQrLib(function(){
      el.innerHTML='';
      var url=window.location.href.split('#')[0];
      try{
        new QRCode(el,{text:url,width:opts.width||160,height:opts.height||160,correctLevel:QRCode.CorrectLevel.H});
      }catch(e){el.textContent='QR Error';}
      var warnSel=opts.warnSelector||'#qr-local-warning';
      var wEl=document.querySelector(warnSel);
      if(wEl){wEl.style.display=isLocal(url)?'block':'none';}
    });
  };
})();
