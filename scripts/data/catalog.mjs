// Profession catalogue seed (admins can extend it later from the admin panel).
// professions: [slug, name_uz, name_ru, synonyms[], skill slugs[]]

export const SKILLS = [
  ["gisht-terish", "Gʻisht terish"], ["suvoq", "Suvoq ishlari"], ["kafel-yotqizish", "Kafel yotqizish"],
  ["elektr-montaj", "Elektr montaj"], ["elektr-tarmoq-tamiri", "Elektr tarmogʻi taʼmiri"],
  ["santexnika-montaj", "Santexnika montaji"], ["payvandlash-elektr", "Elektr payvandlash"],
  ["payvandlash-argon", "Argon payvandlash"], ["boyoq-ishlari", "Boʻyoq ishlari"],
  ["gipsokarton", "Gipsokarton"], ["kran-boshqarish", "Kran boshqarish"], ["chizma-oqish", "Chizma oʻqish"],
  ["haydovchilik-b", "B toifali guvohnoma"], ["haydovchilik-c", "C toifali guvohnoma"],
  ["haydovchilik-e", "E toifali guvohnoma"], ["traktor-boshqarish", "Traktor boshqarish"],
  ["kombayn-boshqarish", "Kombayn boshqarish"], ["dvigatel-tamiri", "Dvigatel taʼmiri"],
  ["avto-elektrik", "Avtoelektrika"], ["shahar-yollari", "Shahar yoʻllarini bilish"],
  ["javascript", "JavaScript"], ["typescript", "TypeScript"], ["react", "React"], ["nextjs", "Next.js"],
  ["nodejs", "Node.js"], ["python", "Python"], ["php", "PHP"], ["sql", "SQL"], ["figma", "Figma"],
  ["photoshop", "Adobe Photoshop"], ["premiere", "Adobe Premiere"], ["smm-target", "Target reklama"],
  ["kontent-yaratish", "Kontent yaratish"], ["kompyuter-tamiri", "Kompyuter taʼmiri"],
  ["tarmoq-sozlash", "Tarmoq sozlash"], ["1c", "1C: Buxgalteriya"], ["excel", "MS Excel"],
  ["ingliz-tili", "Ingliz tili"], ["rus-tili", "Rus tili"], ["matematika", "Matematika"],
  ["pedagogika", "Pedagogika"], ["bolalar-bilan-ishlash", "Bolalar bilan ishlash"],
  ["soch-turmaklash", "Soch turmaklash"], ["erkaklar-sartaroshligi", "Erkaklar sartaroshligi"],
  ["milliy-taomlar", "Milliy taomlar"], ["yevropa-taomlari", "Yevropa taomlari"],
  ["mijozlarga-xizmat", "Mijozlarga xizmat koʻrsatish"], ["kassa", "Kassa bilan ishlash"],
  ["tozalash", "Professional tozalash"], ["qoriqlash", "Qoʻriqlash"], ["birinchi-yordam", "Birinchi tibbiy yordam"],
  ["agronomiya", "Agronomiya"], ["sugorish", "Sugʻorish tizimlari"], ["chorva-parvarishi", "Chorva parvarishi"],
  ["bogdorchilik", "Bogʻdorchilik"], ["issiqxona", "Issiqxona xoʻjaligi"], ["hamshiralik", "Hamshiralik parvarishi"],
  ["laboratoriya-tahlili", "Laboratoriya tahlili"], ["farmatsevtika", "Farmatsevtika"],
  ["tikuvchilik", "Tikuvchilik"], ["tokarlik", "Tokarlik"], ["savdo", "Savdo koʻnikmalari"],
  ["ombor-hisobi", "Ombor hisobi"], ["muzokara", "Muzokara olib borish"],
];

export const CATEGORIES = [
  {
    slug: "qurilish", name: "Qurilish", nameRu: "Строительство", icon: "🧱",
    professions: [
      ["gisht-teruvchi", "Gʻisht teruvchi", "Каменщик", ["gishtchi", "usta"], ["gisht-terish", "chizma-oqish"]],
      ["suvoqchi", "Suvoqchi", "Штукатур", ["shtukatur"], ["suvoq", "gipsokarton"]],
      ["kafelchi", "Kafelchi", "Плиточник", ["plitka"], ["kafel-yotqizish"]],
      ["elektrik", "Elektrik", "Электрик", ["elektromontyor", "svetchik"], ["elektr-montaj", "elektr-tarmoq-tamiri", "chizma-oqish"]],
      ["santexnik", "Santexnik", "Сантехник", ["santex"], ["santexnika-montaj", "payvandlash-elektr"]],
      ["payvandchi", "Payvandchi", "Сварщик", ["svarshik", "svarka"], ["payvandlash-elektr", "payvandlash-argon", "chizma-oqish"]],
      ["boyoqchi", "Boʻyoqchi", "Маляр", ["malyar"], ["boyoq-ishlari", "suvoq"]],
      ["montajchi", "Montajchi", "Монтажник", ["montajnik"], ["gipsokarton", "chizma-oqish"]],
      ["kranchi", "Kranchi", "Крановщик", ["kranovshik"], ["kran-boshqarish"]],
      ["qurilish-ishchisi", "Qurilish ishchisi", "Разнорабочий", ["mardikor", "raznorabochiy"], ["gisht-terish"]],
    ],
  },
  {
    slug: "transport", name: "Transport va haydovchilar", nameRu: "Транспорт", icon: "🚚",
    professions: [
      ["haydovchi", "Haydovchi", "Водитель", ["shofyor", "voditel"], ["haydovchilik-b", "shahar-yollari"]],
      ["taksichi", "Taksi haydovchisi", "Таксист", ["taksist"], ["haydovchilik-b", "shahar-yollari", "mijozlarga-xizmat"]],
      ["yuk-haydovchisi", "Yuk mashinasi haydovchisi", "Водитель грузовика", ["dalnoboy", "fura"], ["haydovchilik-c", "haydovchilik-e"]],
      ["kuryer", "Kuryer", "Курьер", ["dostavka", "yetkazib-beruvchi"], ["haydovchilik-b", "shahar-yollari"]],
      ["mexanik", "Avtomexanik", "Автомеханик", ["avtomexanik", "moto-usta"], ["dvigatel-tamiri", "avto-elektrik"]],
    ],
  },
  {
    slug: "qishloq-xojaligi", name: "Qishloq xoʻjaligi", nameRu: "Сельское хозяйство", icon: "🌾",
    professions: [
      ["traktorchi", "Traktorchi", "Тракторист", ["traktorist", "mexanizator"], ["traktor-boshqarish", "dvigatel-tamiri"]],
      ["kombaynchi", "Kombaynchi", "Комбайнёр", ["kombayner"], ["kombayn-boshqarish", "dvigatel-tamiri"]],
      ["agronom", "Agronom", "Агроном", [], ["agronomiya", "sugorish", "issiqxona"]],
      ["fermer-ishchisi", "Fermer xoʻjaligi ishchisi", "Работник фермы", ["dehqon"], ["sugorish", "issiqxona"]],
      ["chorvador", "Chorvador", "Животновод", ["podachi", "choʻpon"], ["chorva-parvarishi"]],
      ["bogbon", "Bogʻbon", "Садовник", ["sadovnik"], ["bogdorchilik", "sugorish"]],
    ],
  },
  {
    slug: "it", name: "IT va dizayn", nameRu: "IT и дизайн", icon: "💻",
    professions: [
      ["frontend-developer", "Frontend dasturchi", "Frontend-разработчик", ["frontend", "front-end"], ["javascript", "typescript", "react", "nextjs"]],
      ["backend-developer", "Backend dasturchi", "Backend-разработчик", ["backend", "back-end"], ["nodejs", "python", "php", "sql"]],
      ["fullstack-developer", "Full-stack dasturchi", "Full-stack разработчик", ["fullstack", "full-stack"], ["javascript", "typescript", "react", "nodejs", "sql"]],
      ["grafik-dizayner", "Grafik dizayner", "Графический дизайнер", ["dizayner", "designer"], ["figma", "photoshop"]],
      ["smm-mutaxassis", "SMM mutaxassisi", "SMM-специалист", ["smm", "smmchi"], ["smm-target", "kontent-yaratish"]],
      ["video-montajchi", "Video montajchi", "Видеомонтажёр", ["video-editor", "montajyor"], ["premiere", "kontent-yaratish"]],
      ["kompyuter-ustasi", "Kompyuter ustasi", "Компьютерный мастер", ["kompyuterchi"], ["kompyuter-tamiri", "tarmoq-sozlash"]],
    ],
  },
  {
    slug: "talim", name: "Taʼlim", nameRu: "Образование", icon: "📚",
    professions: [
      ["oqituvchi", "Oʻqituvchi", "Учитель", ["muallim", "pedagog"], ["pedagogika", "matematika", "ingliz-tili"]],
      ["repetitor", "Repetitor", "Репетитор", ["tutor"], ["pedagogika", "matematika", "ingliz-tili", "rus-tili"]],
      ["tarbiyachi", "Tarbiyachi", "Воспитатель", ["bogcha-tarbiyachisi"], ["bolalar-bilan-ishlash", "pedagogika"]],
      ["trener", "Trener", "Тренер", ["murabbiy"], ["birinchi-yordam"]],
    ],
  },
  {
    slug: "xizmat", name: "Xizmat koʻrsatish", nameRu: "Сфера услуг", icon: "🛎️",
    professions: [
      ["sartarosh", "Sartarosh", "Парикмахер", ["barber", "parikmaxer"], ["soch-turmaklash", "erkaklar-sartaroshligi"]],
      ["oshpaz", "Oshpaz", "Повар", ["povar", "oshpaz-yordamchisi"], ["milliy-taomlar", "yevropa-taomlari"]],
      ["ofitsiant", "Ofitsiant", "Официант", ["waiter"], ["mijozlarga-xizmat"]],
      ["farrosh", "Farrosh", "Уборщик", ["tozalovchi", "uborshitsa"], ["tozalash"]],
      ["qoriqchi", "Qoʻriqchi", "Охранник", ["oxrannik", "storoj"], ["qoriqlash", "birinchi-yordam"]],
      ["enaga", "Enaga", "Няня", ["nyanya"], ["bolalar-bilan-ishlash", "birinchi-yordam"]],
    ],
  },
  {
    slug: "sogliq", name: "Sogʻliqni saqlash", nameRu: "Здравоохранение", icon: "🩺",
    professions: [
      ["hamshira", "Hamshira", "Медсестра", ["medsestra"], ["hamshiralik", "birinchi-yordam"]],
      ["laborant", "Laborant", "Лаборант", [], ["laboratoriya-tahlili"]],
      ["farmatsevt", "Farmatsevt", "Фармацевт", ["dorixonachi", "provizor"], ["farmatsevtika", "kassa"]],
    ],
  },
  {
    slug: "savdo", name: "Savdo va ombor", nameRu: "Торговля и склад", icon: "🛒",
    professions: [
      ["sotuvchi", "Sotuvchi", "Продавец", ["prodavets", "konsultant"], ["savdo", "kassa", "mijozlarga-xizmat"]],
      ["kassir", "Kassir", "Кассир", [], ["kassa", "mijozlarga-xizmat"]],
      ["omborchi", "Omborchi", "Кладовщик", ["skladchi", "kladovshik"], ["ombor-hisobi", "excel"]],
      ["savdo-agenti", "Savdo agenti", "Торговый агент", ["agent", "merchandayzer"], ["savdo", "muzokara", "haydovchilik-b"]],
    ],
  },
  {
    slug: "ishlab-chiqarish", name: "Ishlab chiqarish", nameRu: "Производство", icon: "🏭",
    professions: [
      ["tikuvchi", "Tikuvchi", "Швея", ["shveya", "tikuvchi-ayol"], ["tikuvchilik"]],
      ["tokar", "Tokar", "Токарь", [], ["tokarlik", "chizma-oqish"]],
      ["stanok-operatori", "Stanok operatori", "Оператор станка", ["operator", "chpu"], ["tokarlik", "chizma-oqish"]],
    ],
  },
  {
    slug: "ofis", name: "Ofis va moliya", nameRu: "Офис и финансы", icon: "📊",
    professions: [
      ["buxgalter", "Buxgalter", "Бухгалтер", ["hisobchi"], ["1c", "excel"]],
      ["menejer", "Menejer", "Менеджер", ["manager", "boshqaruvchi"], ["muzokara", "excel", "rus-tili"]],
      ["ofis-menejeri", "Ofis menejeri / kotiba", "Офис-менеджер", ["kotiba", "sekretar"], ["excel", "mijozlarga-xizmat"]],
    ],
  },
];
