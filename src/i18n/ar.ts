import { Translations } from "./en"

const ar: Translations = {
  common: {
    ok: "نعم",
    cancel: "حذف",
    back: "خلف",
  },
  welcomeScreen: {
    postscript:
      "ربما لا يكون هذا هو الشكل الذي يبدو عليه تطبيقك مالم يمنحك المصمم هذه الشاشات وشحنها في هذه الحالة",
    readyForLaunch: "تطبيقك تقريبا جاهز للتشغيل",
    exciting: "اوه هذا مثير",
  },
  errorScreen: {
    title: "هناك خطأ ما",
    friendlySubtitle:
      "هذه هي الشاشة التي سيشاهدها المستخدمون في عملية الانتاج عند حدوث خطأ. سترغب في تخصيص هذه الرسالة ( الموجودة في 'ts.en/i18n/app') وربما التخطيط ايضاً ('app/screens/ErrorScreen'). إذا كنت تريد إزالة هذا بالكامل، تحقق من 'app/app.tsp' من اجل عنصر <ErrorBoundary>.",
    reset: "اعادة تعيين التطبيق",
  },
  emptyStateComponent: {
    generic: {
      heading: "فارغة جداً....حزين",
      content: "لا توجد بيانات حتى الآن. حاول النقر فوق الزر لتحديث التطبيق او اعادة تحميله.",
      button: "لنحاول هذا مرّة أخرى",
    },
  },
  inspection: {
    title: "فحص المركبة",
    createInspection: "إنشاء فحص",
    inspectionType: "نوع الفحص",
    date: "التاريخ",
    inspector: "المفتش",
    result: "النتيجة",
    passed: "نجح",
    failed: "فشل",
    complete: "إكمال الفحص",
    start: "بدء الفحص",
  },
  privacyPolicy: {
    title: "اتفاقية اختبار بيتا",
    scrollToBottom: "يرجى التمرير إلى الأسفل للمتابعة",
    submitButton: "أوافق وأرسل",
    submitting: "جاري الإرسال...",
    error: "فشل في إرسال القبول. يرجى المحاولة مرة أخرى.",
    loading: "جاري تحميل PDF...",
  },
}

export default ar
