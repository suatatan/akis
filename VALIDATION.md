# Doğrulama

2026-10-03 tarihinde Windows x64 üzerinde doğrulandı.

- Temel testler: Türkçe/Unicode kelime sayımı; mola sınırı ve kesintisiz süre; atomik UTF-8 kayıt; proje filtreleme; dosya adı ve dizin sınırları.
- Gerçek Electron penceresi: otomatik kayıt, görsel/kaynak Markdown geçişi, tablo ve görev listesi, tema/font/ses ayarlarının saklanması, akış ve mola sıfırlaması, odak modu, tam ekran, kapanış kaydı, yeniden açma.
- Proje: yerel klasör seçimi, iç içe dosyalar, göreli görseller, proje içine yeni belge oluşturma ve yeniden adlandırma.
- Kurtarma: dışarıda değişen dosyaya yazmayı engelleme, kurtarma kopyası, açık dosyanın üzerine dışa aktarmayı engelleme, ayrı kopya oluşturup disk sürümünü yeniden açma.
- Paketlenmiş Akis.exe: komut satırından Markdown açma, düzenleme ve kapanışta kayıt.

Windows NSIS kurulum ve portable paketleri derlenir. Kurulum dosyası ana bilgisayara kurulmadı; sağ tık kayıtlarının kurulum/kaldırma davranışı gerçek kurulum sonrası ayrıca kontrol edilebilir. macOS ve Linux yapılandırmaları GitHub Actions'ta bulunur; bu bilgisayarda test edilmedi.

Kod imzalama sertifikası yapılandırılmamıştır. Görsel editör özel Markdown uzantılarının tamamını desteklemez; README'deki kaynak görünümü sınırlarını incele.

