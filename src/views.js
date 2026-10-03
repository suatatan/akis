import { esc, icon, btn } from './main.js';
import { duration } from './metrics.js';
export function shellHTML() {
  return '<aside id="sidebar"><div class="brand"><div class="brand-mark">a<span>·</span></div><div>akış<small>DÜŞÜNCELERİNE YER AÇ</small></div>' + btn('hide-sidebar', 'panel-left-close', 'Dosyaları gizle') + '</div>' +
  '<div class="sidebar-actions"><button id="new-note" class="primary">' + icon('plus') + ' Yeni yazı</button>' + btn('folder-open', 'folder-open', 'Klasör aç · Ctrl+Shift+O') + '</div>' +
  '<div class="project-label"><span id="project-name"></span>' + btn('refresh', 'refresh-cw', 'Dosyaları yenile') + '</div>' +
  '<div class="search-wrap">' + icon('search') + '<input id="file-search" placeholder="Dosyalarda ara" aria-label="Dosya adlarında ara"></div><nav id="file-tree" aria-label="Proje dosyaları"></nav>' +
  '<div class="sidebar-bottom"><button id="my-notes">' + icon('notebook-pen') + ' Yazı defterim</button><button id="open-file">' + icon('file-up') + ' Dosya aç <kbd>Ctrl O</kbd></button><button id="settings-button">' + icon('sliders-horizontal') + ' Ayarlar ve istatistik</button><div class="local-note">' + icon('hard-drive') + ' Yalnızca senin bilgisayarında</div></div></aside>' +
  '<main id="workspace"><header><div class="document-controls">' + btn('show-sidebar', 'panel-left', 'Dosyaları göster') + '<button id="document-name" title="Dosya adını değiştir"></button><span id="save-state" role="status">Kaydedildi</span></div><div class="header-actions">' +
  '<button id="start-flow" class="flow-button">' + icon('wind') + '<span>Akışa başla</span></button>' + btn('source-button', 'code-xml', 'Markdown kaynağı · Ctrl+Shift+M') + btn('focus-button', 'scan-line', 'Odak modu · Ctrl+Shift+F') + btn('fullscreen-button', 'maximize', 'Tam ekran · F11') + '</div></header>' +
  '<div id="formatbar" aria-label="Biçimlendirme"><span>YAZI ALANI</span><div>' + btn('bold', 'bold', 'Kalın · Ctrl+B') + btn('italic', 'italic', 'İtalik · Ctrl+I') + btn('heading', 'heading-2', 'Başlık') + '<b class="separator"></b>' + btn('list', 'list', 'Liste') + btn('quote', 'text-quote', 'Alıntı') + btn('link', 'link', 'Bağlantı ekle') + '</div><button id="export-button">' + icon('download') + ' Dışa aktar</button></div>' +
  '<div id="flow-banner" hidden><span class="live-dot"></span><span id="flow-message">İlk kelimenle başlar. Kendini düzenlemeden yaz.</span><strong id="flow-time">00:00</strong><span id="flow-gap"></span><button id="stop-flow" aria-label="Akışı bitir">' + icon('x') + '</button></div>' +
  '<section id="writing-scroll"><div class="paper"><div class="eyebrow">KELİMELERİN İÇİN SAKİN BİR YER</div><div id="editor"></div><textarea id="source-editor" spellcheck="false" aria-label="Markdown kaynağı" hidden></textarea><div class="end-mark">✦</div></div></section>' +
  '<footer><span class="footer-left">' + icon('feather') + ' Acele etme. Sadece yaz.</span><div><button id="word-stats"><strong id="word-count">0</strong> kelime</button><span id="char-count">0 karakter</span><span id="reading-time">1 dk okuma</span><span class="footer-divider"></span><span id="footer-flow">' + icon('wind') + ' <span>Akış bekliyor</span></span></div></footer></main>' +
  '<dialog id="settings-dialog" aria-label="Ayarlar ve istatistik"></dialog><dialog id="input-dialog"></dialog><div id="toast" role="status"></div><button id="leave-focus" hidden>' + icon('arrow-left') + ' Odaktan çık</button>';
}
const options = (values, current) => values.map(([v,n]) => '<option value="' + v + '" ' + (v === current ? 'selected' : '') + '>' + n + '</option>').join('');
const row = (label, control, hint='') => '<div class="setting-row"><div>' + label + (hint ? '<small>' + hint + '</small>' : '') + '</div>' + control + '</div>';
const select = (id, values, value) => '<select id="' + id + '">' + options(values,value) + '</select>';
const range = (id,min,max,step,value) => '<input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">';
export function settingsHTML(tab, s, stats) {
  const tabs = [['appearance','palette','Görünüm'],['writing','feather','Yazma deneyimi'],['stats','chart-no-axes-column','İstatistikler'],['about','info','Dosyalar ve yardım']];
  let c = '';
  if (tab === 'appearance') {
    const names = { paper: 'Kâğıt', sage: 'Adaçayı', sand: 'Kum', night: 'Gece', custom: 'Özel' };
    c = '<h2>Kendi yazı alanın.</h2><p class="lead">Gözlerine ve kelimelerine iyi gelen bir yer.</p><label class="field-title">KÂĞIT RENGİ</label><div class="themes">' +
      Object.entries(names).map(([key,n]) => '<button class="theme-option ' + (s.theme === key ? 'active' : '') + '" data-theme="' + key + '"><span class="swatch ' + key + '"' + (key === 'custom' ? ' style="background:' + esc(s.customColor) + '"' : '') + '>' + (s.theme === key ? icon('check') : '') + '</span>' + n + '</button>').join('') + '</div>' +
      row('Özel renk','<input type="color" id="custom-color" value="' + esc(s.customColor) + '">') +
      row('Arka plan görseli','<div><button id="choose-background" class="secondary">Görsel seç</button> <button id="clear-background" class="subtle">Kaldır</button></div>','Bilgisayarından bir görsel seç.') +
      '<label class="field-title">TİPOGRAFİ</label>' + row('Yazı tipi',select('font-select',[['lora','Lora · Kitap hissi'],['inter','Inter · Sade'],['mono','JetBrains Mono · Daktilo'],['georgia','Georgia'],['system','Sistem yazı tipi']],s.font)) +
      row('Yazı boyutu <b id="font-size-value">' + s.fontSize + ' px</b>',range('font-size',14,36,1,s.fontSize)) +
      row('Satır aralığı',range('line-height',1.3,2.5,.1,s.lineHeight)) + row('Yazı alanı genişliği',range('paper-width',560,1000,20,s.width)) +
      '<div class="font-preview">Bir cümle, yeni bir dünyanın başlangıcı olabilir.</div>';
  }
  if (tab === 'writing') c = '<h2>Ritmini bul.</h2><p class="lead">Düşüncelerine yetişen bir yazma deneyimi.</p><label class="field-title">AKIŞ MODU</label>' +
    row('Mola sınırı',select('gap-select',[3,5,10,15,30,60].map(n=>[n,n+' saniye']),s.gap),'Bu kadar duraksayınca seri yeniden başlar.') +
    row('Kesintisiz yazma hedefi',select('goal-select',[1,3,5,10,15,25].map(n=>[n,n+' dakika']),s.goal)) +
    '<p class="hint">Süre ilk yazdığın harfle başlar. Mola süresi seriye eklenmez. Hedefe ulaşınca bildirim görürsün; yazın hiçbir zaman silinmez.</p><label class="field-title">SES VE ODAK</label>' +
    row('Daktilo sesi',select('sound-select',[['off','Sessiz'],['soft','Yumuşak'],['typewriter','Daktilo']],s.sound)) +
    row('Ses düzeyi',range('volume',0,1,.05,s.volume)) + row('Daktilo odağı','<input id="typewriter" type="checkbox" ' + (s.typewriter?'checked':'') + '>','Yazdığın satırı sayfanın ortasında tutar.') +
    '<div class="shortcut-card">' + icon('scan-line') + '<div>Kelimenle baş başa kal.<small>Odak modu: Ctrl + Shift + F</small></div></div>';
  if (tab === 'stats') {
    const days = Array.from({length:7},(_,i)=> { const d=new Date(); d.setDate(d.getDate()-6+i); return { label:d.toLocaleDateString('tr',{weekday:'short'}),value:stats.days[d.toLocaleDateString('sv-SE')]?.words || 0 }; });
    const today=stats.days[new Date().toLocaleDateString('sv-SE')] || {}, all=Object.values(stats.days).reduce((a,v)=>({words:a.words+v.words,seconds:a.seconds+v.seconds}),{words:0,seconds:0}), max=Math.max(1,...days.map(d=>d.value));
    const card=(label,value,unit)=>'<div><span>'+label+'</span><strong>'+value+'<small>'+unit+'</small></strong></div>';
    c = '<h2>Her kelime bir adım.</h2><p class="lead">Küçük başlangıçlar, biriken düşünceler.</p><div class="stats-cards">' +
      card('BUGÜN YAZILAN',(today.words||0).toLocaleString('tr'),'kelime') + card('TOPLAM YAZILAN',all.words.toLocaleString('tr'),'kelime') +
      card('EN UZUN AKIŞ',duration(stats.best),'dakika : saniye') + card('AKTİF YAZMA',Math.floor(all.seconds/60),'dakika') +
      '</div><label class="field-title">SON 7 GÜN</label><div class="chart">' + days.map(d=>'<div class="chart-column"><span>'+d.value+'</span><div class="bar-track"><div class="bar" style="height:'+Math.max(2,d.value/max*100)+'%"></div></div><small>'+d.label+'</small></div>').join('') +
      '</div><p class="hint">Yazılan kelime, klavyeyle eklediğin kelime artışlarının toplamıdır. Silip tekrar yazmak yeniden sayılır; yapıştırılan metin sayılmaz. Aktif süre son tuş vuruşundan sonraki 5 saniyeyi kapsar. Akış yalnızca Akış modu açıkken ölçülür.</p>';
  }
  if (tab === 'about') c = '<h2>Yazın sana ait.</h2><p class="lead">Hesap yok. Bulut yok. Kaydetme telaşı yok.</p><div class="about-card"><strong>Akış 0.1.0</strong><p>Yeni yazılar otomatik olarak yazı defterine kaydolur. Proje klasörü seçtiğinde yeni dosyalar o klasörde oluşturulur. Dosyaların standart Markdown biçimindedir.</p><p>Her kayıtta bir önceki sürüm yedeklenir. Dışarıda değişen dosyanın üzerine yazılmaz. Kayıt hatasında yazını dışa aktarabilir veya kurtarma taslağını bulabilirsin.</p><button id="show-data" class="secondary">'+icon('folder-open')+' Yedek ve veri klasörü</button> <button id="reveal-doc" class="secondary">'+icon('file-text')+' Bu dosyayı göster</button><p><button id="reload-doc" class="secondary">Diskteki sürümü yeniden aç</button></p></div><div class="shortcuts">' +
    [['Yeni yazı','Ctrl N'],['Dosya aç','Ctrl O'],['Klasör aç','Ctrl Shift O'],['Odak modu','Ctrl Shift F'],['Markdown kaynağı','Ctrl Shift M'],['Tam ekran','F11'],['Geri al','Ctrl Z'],['Yazıda bul','Ctrl F']].map(([n,k])=>'<span>'+n+' <kbd>'+k+'</kbd></span>').join('') +
    '</div><p class="hint">Başlıklar, listeler, tablolar, görev listeleri, alıntılar, kod ve görseller desteklenir. Özel Markdown uzantıları için kaynak görünümünü kullan. Görsel editör biçimlendirmeyi standartlaştırır.</p>';
  return '<div class="settings-shell"><aside><div class="settings-title">'+icon('sliders-horizontal')+' Ayarlar</div>'+tabs.map(([key,i,n])=>'<button data-tab="'+key+'" class="'+(tab===key?'active':'')+'">'+icon(i)+n+'</button>').join('')+'<span class="settings-version">AKIŞ / 0.1.0<br>Kelimelerin için bir yer.</span></aside><section>'+btn('close-settings','x','Ayarları kapat','close-modal')+c+'</section></div>';
}

