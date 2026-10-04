if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
