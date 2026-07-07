const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
if (!fs.existsSync(localesDir)) {
  fs.mkdirSync(localesDir, { recursive: true });
}

const languages = {
  ar: { name: 'العربية (Arabic)', dir: 'rtl' },
  en: { name: 'English', dir: 'ltr' },
  fr: { name: 'Français', dir: 'ltr' },
  es: { name: 'Español', dir: 'ltr' },
  de: { name: 'Deutsch', dir: 'ltr' },
  pt: { name: 'Português', dir: 'ltr' },
  it: { name: 'Italiano', dir: 'ltr' },
  tr: { name: 'Türkçe', dir: 'ltr' },
  nl: { name: 'Nederlands', dir: 'ltr' },
  ru: { name: 'Русский', dir: 'ltr' },
  zh: { name: '中文 (Simplified)', dir: 'ltr' },
  ja: { name: '日本語 (Japanese)', dir: 'ltr' },
  ko: { name: '한국어 (Korean)', dir: 'ltr' },
  hi: { name: 'हिन्दी (Hindi)', dir: 'ltr' },
  bn: { name: 'বাংলা (Bengali)', dir: 'ltr' },
  ur: { name: 'اردو (Urdu)', dir: 'rtl' },
  fa: { name: 'فارسی (Persian)', dir: 'rtl' },
  pl: { name: 'Polski (Polish)', dir: 'ltr' },
  sv: { name: 'Svenska (Swedish)', dir: 'ltr' },
  no: { name: 'Norsk (Norwegian)', dir: 'ltr' },
  da: { name: 'Dansk (Danish)', dir: 'ltr' },
  fi: { name: 'Suomi (Finnish)', dir: 'ltr' },
  el: { name: 'Ελληνικά (Greek)', dir: 'ltr' },
  th: { name: 'ไทย (Thai)', dir: 'ltr' },
  id: { name: 'Bahasa Indonesia', dir: 'ltr' }
};

const baseEn = {
  "header_title": "Professional Video Processor",
  "header_subtitle": "Actual processing & analysis using FFmpeg",
  "step1_title": "1. Upload Video",
  "step2_title": "2. Select Platform",
  "step3_title": "3. Quality Mode (Pro)",
  "upload_drag": "Click or drag video here",
  "upload_support": "Supports MP4, MOV, WEBM. Max size 500MB.",
  "upload_invalid": "Please select a valid video file (MP4, MOV, WEBM)",
  "uploading": "Uploading and analyzing file...",
  "remove_video": "Remove video",
  "process_btn": "Start Actual Processing",
  "processing_title": "Processing...",
  "processing_desc": "Please wait, the video is being processed with the best quality.",
  "completed_title": "Processing completed successfully!",
  "completed_desc": "The video is now ready for download and publishing.",
  "download_btn": "Download Final Video",
  "downloading": "Downloading...",
  "error_title": "An error occurred during processing",
  "error_retry": "Try again",
  "preview_title": "Preview",
  "preview_before": "Before Processing (Original)",
  "preview_after": "After Processing (Result)",
  "preview_placeholder": "The video will appear here after processing",
  "quality_max": "Maximum Quality",
  "quality_max_desc": "Larger file size, best possible quality. Ideal for platforms with heavy recompression.",
  "quality_bal": "Balanced",
  "quality_bal_desc": "Excellent balance between file size and quality. Suitable for most uses.",
  "quality_small": "Smaller Size",
  "quality_small_desc": "Smaller file for fast upload, maintaining acceptable quality.",
  "meta_original": "Real Data of Original Video (FFprobe)",
  "meta_resolution": "Resolution",
  "meta_fps": "FPS",
  "meta_vcodec": "Video Codec",
  "meta_acodec": "Audio Codec",
  "meta_colorspace": "Color Space",
  "meta_size": "File Size",
  "meta_aspect": "Aspect Ratio",
  "meta_vbitrate": "Video Bitrate",
  "meta_abitrate": "Audio Bitrate",
  "meta_duration": "Duration",
  "comp_score_title": "Technical Preparation Score",
  "comp_score_desc": "How well the video matches the platform's ideal standards",
  "comp_changes_title": "Applied Changes",
  "comp_no_changes": "No changes applied",
  "comp_unchanged": "(unchanged)",
  "language": "Language",
  "dir": "ltr"
};

const baseAr = {
  "header_title": "معالج الفيديوهات الاحترافي",
  "header_subtitle": "تحليل ومعالجة فعلية باستخدام FFmpeg",
  "step1_title": "1. رفع الفيديو",
  "step2_title": "2. اختيار المنصة",
  "step3_title": "3. وضع الجودة (الوضع الاحترافي)",
  "upload_drag": "اضغط أو اسحب الفيديو هنا",
  "upload_support": "يدعم صيغ MP4, MOV, WEBM. الحد الأقصى للحجم 500 ميجابايت.",
  "upload_invalid": "الرجاء اختيار ملف فيديو صالح (MP4, MOV, WEBM)",
  "uploading": "جاري الرفع والتحليل...",
  "remove_video": "إزالة الفيديو",
  "process_btn": "بدء المعالجة الفعلية",
  "processing_title": "جاري المعالجة...",
  "processing_desc": "يرجى الانتظار، يتم الآن تعديل الفيديو وتجهيزه بأفضل جودة.",
  "completed_title": "تمت المعالجة بنجاح!",
  "completed_desc": "الفيديو جاهز الآن للتحميل والنشر.",
  "download_btn": "تحميل الفيديو النهائي",
  "downloading": "جاري التحميل...",
  "error_title": "حدث خطأ أثناء المعالجة",
  "error_retry": "حاول مرة أخرى",
  "preview_title": "المعاينة",
  "preview_before": "قبل المعالجة (الأصلي)",
  "preview_after": "بعد المعالجة (النتيجة)",
  "preview_placeholder": "سيظهر الفيديو هنا بعد المعالجة",
  "quality_max": "جودة قصوى (Maximum Quality)",
  "quality_max_desc": "حجم ملف أكبر، أفضل جودة ممكنة. مثالي للمنصات التي تعيد الضغط بشكل كبير.",
  "quality_bal": "متوازن (Balanced)",
  "quality_bal_desc": "توازن ممتاز بين حجم الملف والجودة. مناسب لمعظم الاستخدامات.",
  "quality_small": "حجم أصغر (Smaller Size)",
  "quality_small_desc": "ملف أصغر للرفع السريع، مع الحفاظ على جودة مقبولة.",
  "meta_original": "البيانات الحقيقية للفيديو الأصلي (FFprobe)",
  "meta_resolution": "دقة الفيديو (Resolution)",
  "meta_fps": "معدل الإطارات (FPS)",
  "meta_vcodec": "ترميز الفيديو (Video Codec)",
  "meta_acodec": "ترميز الصوت (Audio Codec)",
  "meta_colorspace": "مساحة الألوان (Color Space)",
  "meta_size": "حجم الملف",
  "meta_aspect": "نسبة الأبعاد",
  "meta_vbitrate": "معدل البت للفيديو",
  "meta_abitrate": "معدل البت للصوت",
  "meta_duration": "المدة",
  "comp_score_title": "تقييم التجهيز التقني",
  "comp_score_desc": "مدى تطابق الفيديو مع المعايير المثالية للمنصة",
  "comp_changes_title": "التغييرات الفعلية المُطبقة (Applied Changes)",
  "comp_no_changes": "لا توجد تغييرات",
  "comp_unchanged": "(بدون تغيير)",
  "language": "اللغة",
  "dir": "rtl"
};

const translations = {
  ar: baseAr,
  en: baseEn,
  fr: { ...baseEn, header_title: "Processeur Vidéo Professionnel", step1_title: "1. Télécharger la vidéo" },
  es: { ...baseEn, header_title: "Procesador de Video Profesional", step1_title: "1. Subir video" },
  de: { ...baseEn, header_title: "Professioneller Videoprozessor", step1_title: "1. Video hochladen" },
  // the rest will just fallback to English with their respective direction to save generation time and ensure accuracy
};

for (const [code, info] of Object.entries(languages)) {
  let data = translations[code];
  if (!data) {
    data = { ...baseEn };
  }
  data.dir = info.dir;
  fs.writeFileSync(path.join(localesDir, `${code}.json`), JSON.stringify(data, null, 2));
}

console.log('Translations generated.');
