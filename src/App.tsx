/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import { supabase } from './lib/supabase'

/* =====================================================================
   CONFIG  (.env faylida to'ldiring — pastdagi README ga qarang)
   ===================================================================== */
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY as string | undefined
const GEMINI_MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-2.5-flash'
const EJS_SERVICE = (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined)?.trim()
const EJS_TEMPLATE = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined)?.trim()
const EJS_KEY = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined)?.trim()
const MAIL_READY = !!(EJS_SERVICE && EJS_TEMPLATE && EJS_KEY)

/* =====================================================================
   TYPES
   ===================================================================== */
type Lang = 'ru' | 'uz' | 'en' | 'tr' | 'kk' | 'de' | 'fr' | 'es' | 'ar' | 'zh' | 'hi' | 'ko'
type Goal = 'lose' | 'keep' | 'gain'
type MealKey = 'bf' | 'ln' | 'dn' | 'sn'
type Tab = 'home' | 'plan' | 'hist' | 'prof'
type Stage = 'closed' | 'pick' | 'cam' | 'busy' | 'preview' | 'result'

interface Profile { name: string; gender: 'm' | 'f'; age: number; height: number; weight: number; tw: number; meals: number; goal: Goal; act: number }
interface Form { name: string; gender: 'm' | 'f'; age: string; height: string; weight: string; tw: string; meals: number; goal: Goal; act: number }
interface Entry { id: string; date: string; meal: MealKey; name: string; kcal: number; p: number; f: number; c: number; vit: string[]; img?: string }
interface PlanMeal { type: MealKey; name: string; kcal: number; p: number; f: number; c: number }
interface Plan { lang: Lang; analysis: string; tips: string[]; days: PlanMeal[][] }
interface UserData { profile?: Profile; plan?: Plan; draft?: Form; entries: Entry[]; water: Record<string, number>; tab: Tab; onboarded: boolean }
interface Targets { bmr: number; tdee: number; kcal: number; protein: number; fat: number; carbs: number; water: number; bmi: number }
interface Scan { dish: string; grams: number; kcal: number; protein: number; fat: number; carbs: number; fiber: number; sugar: number; vitamins: { n: string; v: string }[]; note: string }

/* =====================================================================
   LANGUAGES (12) — butun sayt shu lug'atdan o'qiydi
   ===================================================================== */
const LANGS: { c: Lang; n: string; f: string }[] = [
  { c: 'ru', n: 'Русский', f: '🇷🇺' }, { c: 'uz', n: 'Oʻzbekcha', f: '🇺🇿' }, { c: 'en', n: 'English', f: '🇬🇧' },
  { c: 'tr', n: 'Türkçe', f: '🇹🇷' }, { c: 'kk', n: 'Қазақша', f: '🇰🇿' }, { c: 'de', n: 'Deutsch', f: '🇩🇪' },
  { c: 'fr', n: 'Français', f: '🇫🇷' }, { c: 'es', n: 'Español', f: '🇪🇸' }, { c: 'ar', n: 'العربية', f: '🇸🇦' },
  { c: 'zh', n: '中文', f: '🇨🇳' }, { c: 'hi', n: 'हिन्दी', f: '🇮🇳' }, { c: 'ko', n: '한국어', f: '🇰🇷' },
]

const D: Record<Lang, Record<string, string>> = {
  en: {
    tag: 'Smart calorie tracking with AI', login: 'Log in', reg: 'Sign up', email: 'Email', pass: 'Password', byCode: 'Email code', byPass: 'Password',
    sendCode: 'Send code', code: '6-digit code', confirm: 'Confirm', resend: 'Resend code', sent: 'Code sent to your email', badCode: 'Wrong code',
    fill: 'Fill in all fields correctly', short: 'Password: at least 6 characters', noAcc: 'Account not found', exists: 'Account already exists',
    badPass: 'Wrong password', demo: 'Email service is not set up. Demo code:', mailConfig: 'Email delivery is not configured. Set the EmailJS service ID, template ID, and public key.', mailFail: 'Could not send the email. Check your EmailJS template and recipient settings.', expired: 'Code expired, request a new one', sending: 'Sending…',
    err: 'Something went wrong, try again', back: 'Back',
    onb: 'Tell us about yourself', name: 'Name', gender: 'Gender', male: 'Male', female: 'Female', age: 'Age', height: 'Height', weight: 'Weight',
    tw: 'Target weight', meals: 'Meals per day', goal: 'Your goal', lose: 'Lose weight', keep: 'Maintain', gain: 'Gain muscle', act: 'Activity',
    a1: 'Low', a2: 'Moderate', a3: 'High', build: 'Build my plan', analyzing: 'AI is analyzing your data…',
    hi: 'Hi, {n}!', home: 'Home', plan: 'Plan', hist: 'History', prof: 'Profile',
    today: 'Today', eaten: 'Eaten', left: 'Left', over: 'Over', protein: 'Protein', fat: 'Fat', carbs: 'Carbs', water: 'Water', kcal: 'kcal', g: 'g', ml: 'ml',
    bf: 'Breakfast', ln: 'Lunch', dn: 'Dinner', sn: 'Snack',
    add: 'Add', scan: 'Scan food', cam: 'Camera', gal: 'Gallery', shoot: 'Take photo', retake: 'Retake', analyze: 'Analyze',
    scanning: 'AI is analyzing the food…', addTo: 'Add to', vit: 'Vitamins & minerals', notFood: 'No food found in the photo',
    camErr: 'Camera is unavailable. Allow access (HTTPS or localhost required).', noKey: 'Add VITE_GEMINI_KEY to the .env file',
    aiAn: 'AI analysis', forecast: 'At a safe pace you will reach {w} around {d}.', fkeep: 'Your calories are balanced to keep a stable weight.',
    bmi: 'BMI', empty: 'Nothing here yet', logout: 'Log out', theme: 'Dark mode', lang: 'Language', edit: 'Edit profile', save: 'Save',
    regen: 'Regenerate', regenTxt: 'This plan is in another language', dailyGoal: 'Daily goal', cancel: 'Cancel', close: 'Close', cm: 'cm', kg: 'kg',
    planT: 'Weekly meal plan', dayN: 'Day {n}', dish: 'Dish', fiber: 'Fiber', sugar: 'Sugar', added: 'Added', last7: 'Last 7 days', total: 'Total', tips: 'Tips',
  },
  ru: {
    tag: 'Умный подсчёт калорий с ИИ', login: 'Вход', reg: 'Регистрация', email: 'Эл. почта', pass: 'Пароль', byCode: 'Код на почту', byPass: 'Пароль',
    sendCode: 'Отправить код', code: 'Код из 6 цифр', confirm: 'Подтвердить', resend: 'Отправить снова', sent: 'Код отправлен на почту', badCode: 'Неверный код',
    fill: 'Заполните все поля правильно', short: 'Пароль: минимум 6 символов', noAcc: 'Аккаунт не найден', exists: 'Аккаунт уже существует',
    badPass: 'Неверный пароль', demo: 'Почтовый сервис не настроен. Демо-код:', mailConfig: 'Отправка почты не настроена. Укажите service ID, template ID и public key из EmailJS.', mailFail: 'Не удалось отправить письмо. Проверьте шаблон и адрес получателя в EmailJS.', expired: 'Код истёк, запросите новый', sending: 'Отправка…',
    err: 'Что-то пошло не так, попробуйте снова', back: 'Назад',
    onb: 'Расскажите о себе', name: 'Имя', gender: 'Пол', male: 'Мужской', female: 'Женский', age: 'Возраст', height: 'Рост', weight: 'Вес',
    tw: 'Желаемый вес', meals: 'Приёмов пищи в день', goal: 'Ваша цель', lose: 'Похудеть', keep: 'Удерживать вес', gain: 'Набрать массу', act: 'Активность',
    a1: 'Низкая', a2: 'Средняя', a3: 'Высокая', build: 'Составить план', analyzing: 'ИИ анализирует ваши данные…',
    hi: 'Привет, {n}!', home: 'Главная', plan: 'План', hist: 'История', prof: 'Профиль',
    today: 'Сегодня', eaten: 'Съедено', left: 'Осталось', over: 'Перебор', protein: 'Белки', fat: 'Жиры', carbs: 'Углеводы', water: 'Вода', kcal: 'ккал', g: 'г', ml: 'мл',
    bf: 'Завтрак', ln: 'Обед', dn: 'Ужин', sn: 'Перекус',
    add: 'Добавить', scan: 'Сканировать еду', cam: 'Камера', gal: 'Галерея', shoot: 'Сделать фото', retake: 'Переснять', analyze: 'Анализировать',
    scanning: 'ИИ анализирует блюдо…', addTo: 'Добавить в', vit: 'Витамины и минералы', notFood: 'На фото не найдена еда',
    camErr: 'Камера недоступна. Разрешите доступ (нужен HTTPS или localhost).', noKey: 'Добавьте VITE_GEMINI_KEY в файл .env',
    aiAn: 'Анализ ИИ', forecast: 'В безопасном темпе вы достигнете {w} примерно к {d}.', fkeep: 'Калории подобраны для стабильного веса.',
    bmi: 'ИМТ', empty: 'Пока пусто', logout: 'Выйти', theme: 'Тёмная тема', lang: 'Язык', edit: 'Изменить профиль', save: 'Сохранить',
    regen: 'Обновить', regenTxt: 'План составлен на другом языке', dailyGoal: 'Дневная норма', cancel: 'Отмена', close: 'Закрыть', cm: 'см', kg: 'кг',
    planT: 'План питания на неделю', dayN: 'День {n}', dish: 'Блюдо', fiber: 'Клетчатка', sugar: 'Сахар', added: 'Добавлено', last7: 'Последние 7 дней', total: 'Итого', tips: 'Советы',
  },
  uz: {
    tag: 'AI bilan aqlli kaloriya nazorati', login: 'Kirish', reg: 'Ro‘yxatdan o‘tish', email: 'Email', pass: 'Parol', byCode: 'Email kod', byPass: 'Parol',
    sendCode: 'Kod yuborish', code: '6 xonali kod', confirm: 'Tasdiqlash', resend: 'Qayta yuborish', sent: 'Kod emailingizga yuborildi', badCode: 'Kod noto‘g‘ri',
    fill: 'Barcha maydonlarni to‘g‘ri to‘ldiring', short: 'Parol kamida 6 belgi', noAcc: 'Akkaunt topilmadi', exists: 'Bu akkaunt mavjud',
    badPass: 'Parol noto‘g‘ri', demo: 'Email xizmati sozlanmagan. Demo kod:', mailConfig: 'Email yuborish sozlanmagan. EmailJS service ID, template ID va public key ni kiriting.', mailFail: 'Email yuborilmadi. EmailJS shabloni va qabul qiluvchi email sozlamalarini tekshiring.', expired: 'Kod eskirdi, yangisini so‘rang', sending: 'Yuborilmoqda…',
    err: 'Xatolik yuz berdi, qayta urinib ko‘ring', back: 'Orqaga',
    onb: 'O‘zingiz haqingizda ayting', name: 'Ism', gender: 'Jins', male: 'Erkak', female: 'Ayol', age: 'Yosh', height: 'Bo‘y', weight: 'Vazn',
    tw: 'Maqsad vazn', meals: 'Kuniga necha mahal ovqat', goal: 'Maqsadingiz', lose: 'Ozish', keep: 'Vaznni saqlash', gain: 'Massa olish', act: 'Faollik',
    a1: 'Past', a2: 'O‘rta', a3: 'Yuqori', build: 'Reja tuzish', analyzing: 'AI ma’lumotlaringizni tahlil qilmoqda…',
    hi: 'Salom, {n}!', home: 'Asosiy', plan: 'Reja', hist: 'Tarix', prof: 'Profil',
    today: 'Bugun', eaten: 'Yeyildi', left: 'Qoldi', over: 'Oshdi', protein: 'Oqsil', fat: 'Yog‘', carbs: 'Uglevod', water: 'Suv', kcal: 'kkal', g: 'g', ml: 'ml',
    bf: 'Nonushta', ln: 'Tushlik', dn: 'Kechki ovqat', sn: 'Snek',
    add: 'Qo‘shish', scan: 'Ovqatni skanerlash', cam: 'Kamera', gal: 'Galereya', shoot: 'Suratga olish', retake: 'Qayta olish', analyze: 'Tahlil qilish',
    scanning: 'AI ovqatni tahlil qilmoqda…', addTo: 'Qo‘shish:', vit: 'Vitamin va minerallar', notFood: 'Rasmda ovqat topilmadi',
    camErr: 'Kamera mavjud emas. Ruxsat bering (HTTPS yoki localhost kerak).', noKey: '.env fayliga VITE_GEMINI_KEY qo‘shing',
    aiAn: 'AI tahlili', forecast: 'Xavfsiz sur’atda {w} ga taxminan {d} da erishasiz.', fkeep: 'Kaloriya barqaror vazn uchun moslangan.',
    bmi: 'TMI', empty: 'Hozircha bo‘sh', logout: 'Chiqish', theme: 'Tungi rejim', lang: 'Til', edit: 'Profilni tahrirlash', save: 'Saqlash',
    regen: 'Yangilash', regenTxt: 'Reja boshqa tilda tuzilgan', dailyGoal: 'Kunlik me’yor', cancel: 'Bekor qilish', close: 'Yopish', cm: 'sm', kg: 'kg',
    planT: 'Haftalik ovqat rejasi', dayN: 'Kun {n}', dish: 'Taom', fiber: 'Tolalar', sugar: 'Shakar', added: 'Qo‘shildi', last7: 'Oxirgi 7 kun', total: 'Jami', tips: 'Maslahatlar',
  },
  tr: {
    tag: 'Yapay zekâ ile akıllı kalori takibi', login: 'Giriş', reg: 'Kayıt ol', email: 'E-posta', pass: 'Şifre', byCode: 'E-posta kodu', byPass: 'Şifre',
    sendCode: 'Kod gönder', code: '6 haneli kod', confirm: 'Onayla', resend: 'Tekrar gönder', sent: 'Kod e-postanıza gönderildi', badCode: 'Kod yanlış',
    fill: 'Tüm alanları doğru doldurun', short: 'Şifre en az 6 karakter', noAcc: 'Hesap bulunamadı', exists: 'Hesap zaten var',
    badPass: 'Şifre yanlış', mailConfig: 'E-posta gönderimi yapılandırılmamış. EmailJS service ID, template ID ve public key bilgilerini girin.', mailFail: 'E-posta gönderilemedi. EmailJS şablonunu ve alıcı adresi ayarlarını kontrol edin.', expired: 'Kodun süresi doldu, yenisini isteyin', sending: 'Gönderiliyor…',
    err: 'Bir hata oluştu, tekrar deneyin', back: 'Geri',
    onb: 'Kendinizden bahsedin', name: 'Ad', gender: 'Cinsiyet', male: 'Erkek', female: 'Kadın', age: 'Yaş', height: 'Boy', weight: 'Kilo',
    tw: 'Hedef kilo', meals: 'Günlük öğün sayısı', goal: 'Hedefiniz', lose: 'Kilo ver', keep: 'Kiloyu koru', gain: 'Kas kazan', act: 'Aktivite',
    a1: 'Düşük', a2: 'Orta', a3: 'Yüksek', build: 'Planımı oluştur', analyzing: 'Yapay zekâ verilerinizi analiz ediyor…',
    hi: 'Merhaba, {n}!', home: 'Ana sayfa', plan: 'Plan', hist: 'Geçmiş', prof: 'Profil',
    today: 'Bugün', eaten: 'Yenen', left: 'Kalan', over: 'Aşım', protein: 'Protein', fat: 'Yağ', carbs: 'Karbonhidrat', water: 'Su', kcal: 'kcal', g: 'g', ml: 'ml',
    bf: 'Kahvaltı', ln: 'Öğle yemeği', dn: 'Akşam yemeği', sn: 'Atıştırmalık',
    add: 'Ekle', scan: 'Yemeği tara', cam: 'Kamera', gal: 'Galeri', shoot: 'Fotoğraf çek', retake: 'Tekrar çek', analyze: 'Analiz et',
    scanning: 'Yapay zekâ yemeği analiz ediyor…', addTo: 'Ekle:', vit: 'Vitamin ve mineraller', notFood: 'Fotoğrafta yemek bulunamadı',
    camErr: 'Kamera kullanılamıyor. İzin verin (HTTPS veya localhost gerekir).', noKey: '.env dosyasına VITE_GEMINI_KEY ekleyin',
    aiAn: 'Yapay zekâ analizi', forecast: 'Güvenli tempoda {w} hedefine yaklaşık {d} tarihinde ulaşırsınız.', fkeep: 'Kalorileriniz sabit kilo için dengelendi.',
    bmi: 'VKİ', empty: 'Henüz boş', logout: 'Çıkış', theme: 'Karanlık mod', lang: 'Dil', edit: 'Profili düzenle', save: 'Kaydet',
    regen: 'Yenile', regenTxt: 'Plan başka bir dilde hazırlanmış', dailyGoal: 'Günlük hedef', cancel: 'İptal', close: 'Kapat', cm: 'cm', kg: 'kg',
    planT: 'Haftalık yemek planı', dayN: 'Gün {n}', dish: 'Yemek', fiber: 'Lif', sugar: 'Şeker', added: 'Eklendi', last7: 'Son 7 gün', total: 'Toplam', tips: 'İpuçları',
  },
  kk: {
    tag: 'ЖИ арқылы калорияны ақылды бақылау', login: 'Кіру', reg: 'Тіркелу', email: 'Эл. пошта', pass: 'Құпиясөз', byCode: 'Пошта коды', byPass: 'Құпиясөз',
    sendCode: 'Код жіберу', code: '6 таңбалы код', confirm: 'Растау', resend: 'Қайта жіберу', sent: 'Код поштаға жіберілді', badCode: 'Код қате',
    fill: 'Барлық өрісті дұрыс толтырыңыз', short: 'Құпиясөз кемінде 6 таңба', noAcc: 'Аккаунт табылмады', exists: 'Аккаунт бұрыннан бар',
    badPass: 'Құпиясөз қате', mailConfig: 'Пошта жіберу бапталмаған. EmailJS service ID, template ID және public key енгізіңіз.', mailFail: 'Хат жіберілмеді. EmailJS үлгісі мен алушы мекенжайын тексеріңіз.', expired: 'Код ескірді, жаңасын сұраңыз', sending: 'Жіберілуде…',
    err: 'Қате шықты, қайталап көріңіз', back: 'Артқа',
    onb: 'Өзіңіз туралы айтыңыз', name: 'Аты', gender: 'Жынысы', male: 'Ер', female: 'Әйел', age: 'Жасы', height: 'Бойы', weight: 'Салмағы',
    tw: 'Мақсатты салмақ', meals: 'Күніне неше рет тамақтану', goal: 'Мақсатыңыз', lose: 'Арықтау', keep: 'Салмақты сақтау', gain: 'Бұлшықет жинау', act: 'Белсенділік',
    a1: 'Төмен', a2: 'Орташа', a3: 'Жоғары', build: 'Жоспар құру', analyzing: 'ЖИ деректеріңізді талдауда…',
    hi: 'Сәлем, {n}!', home: 'Басты', plan: 'Жоспар', hist: 'Тарих', prof: 'Профиль',
    today: 'Бүгін', eaten: 'Жедім', left: 'Қалды', over: 'Асып кетті', protein: 'Ақуыз', fat: 'Май', carbs: 'Көмірсу', water: 'Су', kcal: 'ккал', g: 'г', ml: 'мл',
    bf: 'Таңғы ас', ln: 'Түскі ас', dn: 'Кешкі ас', sn: 'Тіскебасар',
    add: 'Қосу', scan: 'Тағамды сканерлеу', cam: 'Камера', gal: 'Галерея', shoot: 'Суретке түсіру', retake: 'Қайта түсіру', analyze: 'Талдау',
    scanning: 'ЖИ тағамды талдауда…', addTo: 'Қосу:', vit: 'Витамин және минералдар', notFood: 'Суретте тамақ табылмады',
    camErr: 'Камера қолжетімсіз. Рұқсат беріңіз (HTTPS немесе localhost керек).', noKey: '.env файлына VITE_GEMINI_KEY қосыңыз',
    aiAn: 'ЖИ талдауы', forecast: 'Қауіпсіз қарқынмен {w} көрсеткішіне шамамен {d} күні жетесіз.', fkeep: 'Калория тұрақты салмаққа есептелген.',
    bmi: 'ДМИ', empty: 'Әзірге бос', logout: 'Шығу', theme: 'Қараңғы режим', lang: 'Тіл', edit: 'Профильді өзгерту', save: 'Сақтау',
    regen: 'Жаңарту', regenTxt: 'Жоспар басқа тілде құрылған', dailyGoal: 'Күндік норма', cancel: 'Бас тарту', close: 'Жабу', cm: 'см', kg: 'кг',
    planT: 'Апталық тамақтану жоспары', dayN: 'Күн {n}', dish: 'Тағам', fiber: 'Талшық', sugar: 'Қант', added: 'Қосылды', last7: 'Соңғы 7 күн', total: 'Барлығы', tips: 'Кеңестер',
  },
  de: {
    tag: 'Smartes Kalorientracking mit KI', login: 'Anmelden', reg: 'Registrieren', email: 'E-Mail', pass: 'Passwort', byCode: 'E-Mail-Code', byPass: 'Passwort',
    sendCode: 'Code senden', code: '6-stelliger Code', confirm: 'Bestätigen', resend: 'Erneut senden', sent: 'Code wurde an Ihre E-Mail gesendet', badCode: 'Falscher Code',
    fill: 'Bitte alle Felder korrekt ausfüllen', short: 'Passwort: mindestens 6 Zeichen', noAcc: 'Konto nicht gefunden', exists: 'Konto existiert bereits',
    badPass: 'Falsches Passwort', mailConfig: 'E-Mail-Versand ist nicht eingerichtet. EmailJS Service-ID, Template-ID und Public Key eintragen.', mailFail: 'E-Mail konnte nicht gesendet werden. EmailJS-Vorlage und Empfängeradresse prüfen.', expired: 'Code abgelaufen, neuen anfordern', sending: 'Wird gesendet…',
    err: 'Etwas ist schiefgelaufen, bitte erneut versuchen', back: 'Zurück',
    onb: 'Erzähl uns von dir', name: 'Name', gender: 'Geschlecht', male: 'Männlich', female: 'Weiblich', age: 'Alter', height: 'Größe', weight: 'Gewicht',
    tw: 'Zielgewicht', meals: 'Mahlzeiten pro Tag', goal: 'Dein Ziel', lose: 'Abnehmen', keep: 'Gewicht halten', gain: 'Muskeln aufbauen', act: 'Aktivität',
    a1: 'Niedrig', a2: 'Mittel', a3: 'Hoch', build: 'Plan erstellen', analyzing: 'KI analysiert deine Daten…',
    hi: 'Hallo, {n}!', home: 'Start', plan: 'Plan', hist: 'Verlauf', prof: 'Profil',
    today: 'Heute', eaten: 'Gegessen', left: 'Übrig', over: 'Zu viel', protein: 'Eiweiß', fat: 'Fett', carbs: 'Kohlenhydrate', water: 'Wasser', kcal: 'kcal', g: 'g', ml: 'ml',
    bf: 'Frühstück', ln: 'Mittagessen', dn: 'Abendessen', sn: 'Snack',
    add: 'Hinzufügen', scan: 'Essen scannen', cam: 'Kamera', gal: 'Galerie', shoot: 'Foto aufnehmen', retake: 'Neu aufnehmen', analyze: 'Analysieren',
    scanning: 'KI analysiert das Essen…', addTo: 'Hinzufügen zu', vit: 'Vitamine & Mineralstoffe', notFood: 'Kein Essen auf dem Foto gefunden',
    camErr: 'Kamera nicht verfügbar. Zugriff erlauben (HTTPS oder localhost nötig).', noKey: 'VITE_GEMINI_KEY in der .env-Datei eintragen',
    aiAn: 'KI-Analyse', forecast: 'In sicherem Tempo erreichst du {w} etwa am {d}.', fkeep: 'Deine Kalorien sind für ein stabiles Gewicht ausgelegt.',
    bmi: 'BMI', empty: 'Noch leer', logout: 'Abmelden', theme: 'Dunkelmodus', lang: 'Sprache', edit: 'Profil bearbeiten', save: 'Speichern',
    regen: 'Neu erstellen', regenTxt: 'Plan ist in einer anderen Sprache', dailyGoal: 'Tagesziel', cancel: 'Abbrechen', close: 'Schließen', cm: 'cm', kg: 'kg',
    planT: 'Wochen-Ernährungsplan', dayN: 'Tag {n}', dish: 'Gericht', fiber: 'Ballaststoffe', sugar: 'Zucker', added: 'Hinzugefügt', last7: 'Letzte 7 Tage', total: 'Gesamt', tips: 'Tipps',
  },
  fr: {
    tag: 'Suivi intelligent des calories avec l’IA', login: 'Connexion', reg: 'Inscription', email: 'E-mail', pass: 'Mot de passe', byCode: 'Code e-mail', byPass: 'Mot de passe',
    sendCode: 'Envoyer le code', code: 'Code à 6 chiffres', confirm: 'Confirmer', resend: 'Renvoyer', sent: 'Code envoyé à votre e-mail', badCode: 'Code incorrect',
    fill: 'Remplissez correctement tous les champs', short: 'Mot de passe : 6 caractères minimum', noAcc: 'Compte introuvable', exists: 'Le compte existe déjà',
    badPass: 'Mot de passe incorrect', mailConfig: 'L’envoi d’e-mails n’est pas configuré. Renseignez le service ID, le template ID et la clé publique EmailJS.', mailFail: 'E-mail non envoyé. Vérifiez le modèle EmailJS et l’adresse du destinataire.', expired: 'Code expiré, demandez-en un nouveau', sending: 'Envoi…',
    err: 'Une erreur est survenue, réessayez', back: 'Retour',
    onb: 'Parlez-nous de vous', name: 'Prénom', gender: 'Sexe', male: 'Homme', female: 'Femme', age: 'Âge', height: 'Taille', weight: 'Poids',
    tw: 'Poids cible', meals: 'Repas par jour', goal: 'Votre objectif', lose: 'Perdre du poids', keep: 'Maintenir', gain: 'Prendre du muscle', act: 'Activité',
    a1: 'Faible', a2: 'Modérée', a3: 'Élevée', build: 'Créer mon plan', analyzing: 'L’IA analyse vos données…',
    hi: 'Salut, {n} !', home: 'Accueil', plan: 'Plan', hist: 'Historique', prof: 'Profil',
    today: 'Aujourd’hui', eaten: 'Mangé', left: 'Restant', over: 'Dépassé', protein: 'Protéines', fat: 'Lipides', carbs: 'Glucides', water: 'Eau', kcal: 'kcal', g: 'g', ml: 'ml',
    bf: 'Petit-déjeuner', ln: 'Déjeuner', dn: 'Dîner', sn: 'Collation',
    add: 'Ajouter', scan: 'Scanner un repas', cam: 'Caméra', gal: 'Galerie', shoot: 'Prendre la photo', retake: 'Reprendre', analyze: 'Analyser',
    scanning: 'L’IA analyse le plat…', addTo: 'Ajouter à', vit: 'Vitamines et minéraux', notFood: 'Aucun aliment détecté sur la photo',
    camErr: 'Caméra indisponible. Autorisez l’accès (HTTPS ou localhost requis).', noKey: 'Ajoutez VITE_GEMINI_KEY dans le fichier .env',
    aiAn: 'Analyse IA', forecast: 'À un rythme sûr, vous atteindrez {w} vers le {d}.', fkeep: 'Vos calories sont calculées pour un poids stable.',
    bmi: 'IMC', empty: 'Rien pour l’instant', logout: 'Déconnexion', theme: 'Mode sombre', lang: 'Langue', edit: 'Modifier le profil', save: 'Enregistrer',
    regen: 'Régénérer', regenTxt: 'Le plan est dans une autre langue', dailyGoal: 'Objectif quotidien', cancel: 'Annuler', close: 'Fermer', cm: 'cm', kg: 'kg',
    planT: 'Plan repas de la semaine', dayN: 'Jour {n}', dish: 'Plat', fiber: 'Fibres', sugar: 'Sucre', added: 'Ajouté', last7: '7 derniers jours', total: 'Total', tips: 'Conseils',
  },
  es: {
    tag: 'Control inteligente de calorías con IA', login: 'Entrar', reg: 'Registrarse', email: 'Correo', pass: 'Contraseña', byCode: 'Código por correo', byPass: 'Contraseña',
    sendCode: 'Enviar código', code: 'Código de 6 dígitos', confirm: 'Confirmar', resend: 'Reenviar', sent: 'Código enviado a tu correo', badCode: 'Código incorrecto',
    fill: 'Completa todos los campos correctamente', short: 'Contraseña: mínimo 6 caracteres', noAcc: 'Cuenta no encontrada', exists: 'La cuenta ya existe',
    badPass: 'Contraseña incorrecta', mailConfig: 'El envío de correo no está configurado. Añade el service ID, template ID y public key de EmailJS.', mailFail: 'No se pudo enviar el correo. Comprueba la plantilla y el destinatario en EmailJS.', expired: 'Código caducado, solicita uno nuevo', sending: 'Enviando…',
    err: 'Algo salió mal, inténtalo de nuevo', back: 'Atrás',
    onb: 'Cuéntanos sobre ti', name: 'Nombre', gender: 'Sexo', male: 'Hombre', female: 'Mujer', age: 'Edad', height: 'Altura', weight: 'Peso',
    tw: 'Peso objetivo', meals: 'Comidas al día', goal: 'Tu objetivo', lose: 'Perder peso', keep: 'Mantener', gain: 'Ganar músculo', act: 'Actividad',
    a1: 'Baja', a2: 'Media', a3: 'Alta', build: 'Crear mi plan', analyzing: 'La IA analiza tus datos…',
    hi: '¡Hola, {n}!', home: 'Inicio', plan: 'Plan', hist: 'Historial', prof: 'Perfil',
    today: 'Hoy', eaten: 'Comido', left: 'Restante', over: 'Excedido', protein: 'Proteínas', fat: 'Grasas', carbs: 'Carbohidratos', water: 'Agua', kcal: 'kcal', g: 'g', ml: 'ml',
    bf: 'Desayuno', ln: 'Almuerzo', dn: 'Cena', sn: 'Merienda',
    add: 'Añadir', scan: 'Escanear comida', cam: 'Cámara', gal: 'Galería', shoot: 'Tomar foto', retake: 'Repetir', analyze: 'Analizar',
    scanning: 'La IA analiza el plato…', addTo: 'Añadir a', vit: 'Vitaminas y minerales', notFood: 'No se encontró comida en la foto',
    camErr: 'Cámara no disponible. Permite el acceso (requiere HTTPS o localhost).', noKey: 'Añade VITE_GEMINI_KEY en el archivo .env',
    aiAn: 'Análisis de IA', forecast: 'A un ritmo seguro llegarás a {w} hacia el {d}.', fkeep: 'Tus calorías están ajustadas para un peso estable.',
    bmi: 'IMC', empty: 'Aún vacío', logout: 'Salir', theme: 'Modo oscuro', lang: 'Idioma', edit: 'Editar perfil', save: 'Guardar',
    regen: 'Regenerar', regenTxt: 'El plan está en otro idioma', dailyGoal: 'Meta diaria', cancel: 'Cancelar', close: 'Cerrar', cm: 'cm', kg: 'kg',
    planT: 'Plan semanal de comidas', dayN: 'Día {n}', dish: 'Plato', fiber: 'Fibra', sugar: 'Azúcar', added: 'Añadido', last7: 'Últimos 7 días', total: 'Total', tips: 'Consejos',
  },
  ar: {
    tag: 'تتبّع ذكي للسعرات بالذكاء الاصطناعي', login: 'تسجيل الدخول', reg: 'إنشاء حساب', email: 'البريد الإلكتروني', pass: 'كلمة المرور', byCode: 'رمز البريد', byPass: 'كلمة المرور',
    sendCode: 'إرسال الرمز', code: 'رمز من 6 أرقام', confirm: 'تأكيد', resend: 'إعادة الإرسال', sent: 'تم إرسال الرمز إلى بريدك', badCode: 'الرمز غير صحيح',
    fill: 'املأ جميع الحقول بشكل صحيح', short: 'كلمة المرور 6 أحرف على الأقل', noAcc: 'الحساب غير موجود', exists: 'الحساب موجود مسبقًا',
    badPass: 'كلمة المرور خاطئة', mailConfig: 'إرسال البريد غير مُعدّ. أضف معرّف الخدمة والقالب والمفتاح العام من EmailJS.', mailFail: 'تعذّر إرسال البريد. تحقّق من قالب EmailJS وعنوان المستلم.', expired: 'انتهت صلاحية الرمز، اطلب رمزًا جديدًا', sending: 'جارٍ الإرسال…',
    err: 'حدث خطأ، حاول مجددًا', back: 'رجوع',
    onb: 'حدّثنا عن نفسك', name: 'الاسم', gender: 'الجنس', male: 'ذكر', female: 'أنثى', age: 'العمر', height: 'الطول', weight: 'الوزن',
    tw: 'الوزن المستهدف', meals: 'عدد الوجبات يوميًا', goal: 'هدفك', lose: 'إنقاص الوزن', keep: 'الحفاظ على الوزن', gain: 'بناء العضلات', act: 'النشاط',
    a1: 'منخفض', a2: 'متوسط', a3: 'مرتفع', build: 'أنشئ خطتي', analyzing: 'الذكاء الاصطناعي يحلل بياناتك…',
    hi: 'مرحبًا، {n}!', home: 'الرئيسية', plan: 'الخطة', hist: 'السجل', prof: 'الملف',
    today: 'اليوم', eaten: 'المتناول', left: 'المتبقي', over: 'زيادة', protein: 'بروتين', fat: 'دهون', carbs: 'كربوهيدرات', water: 'الماء', kcal: 'سعرة', g: 'غ', ml: 'مل',
    bf: 'الإفطار', ln: 'الغداء', dn: 'العشاء', sn: 'وجبة خفيفة',
    add: 'إضافة', scan: 'مسح الطعام', cam: 'الكاميرا', gal: 'المعرض', shoot: 'التقاط صورة', retake: 'إعادة', analyze: 'تحليل',
    scanning: 'الذكاء الاصطناعي يحلل الطعام…', addTo: 'إضافة إلى', vit: 'الفيتامينات والمعادن', notFood: 'لم يتم العثور على طعام في الصورة',
    camErr: 'الكاميرا غير متاحة. اسمح بالوصول (يتطلب HTTPS أو localhost).', noKey: 'أضف VITE_GEMINI_KEY إلى ملف .env',
    aiAn: 'تحليل الذكاء الاصطناعي', forecast: 'بوتيرة آمنة ستصل إلى {w} تقريبًا في {d}.', fkeep: 'سعراتك مضبوطة للحفاظ على وزن ثابت.',
    bmi: 'مؤشر كتلة الجسم', empty: 'فارغ حاليًا', logout: 'تسجيل الخروج', theme: 'الوضع الداكن', lang: 'اللغة', edit: 'تعديل الملف', save: 'حفظ',
    regen: 'إعادة الإنشاء', regenTxt: 'الخطة بلغة أخرى', dailyGoal: 'الهدف اليومي', cancel: 'إلغاء', close: 'إغلاق', cm: 'سم', kg: 'كغ',
    planT: 'خطة الوجبات الأسبوعية', dayN: 'اليوم {n}', dish: 'الطبق', fiber: 'ألياف', sugar: 'سكر', added: 'تمت الإضافة', last7: 'آخر 7 أيام', total: 'المجموع', tips: 'نصائح',
  },
  zh: {
    tag: 'AI智能卡路里管理', login: '登录', reg: '注册', email: '邮箱', pass: '密码', byCode: '邮箱验证码', byPass: '密码',
    sendCode: '发送验证码', code: '6位验证码', confirm: '确认', resend: '重新发送', sent: '验证码已发送至邮箱', badCode: '验证码错误',
    fill: '请正确填写所有字段', short: '密码至少6位', noAcc: '未找到账号', exists: '账号已存在',
    badPass: '密码错误', mailConfig: '邮件发送尚未配置。请填写 EmailJS 的 service ID、template ID 和 public key。', mailFail: '邮件发送失败。请检查 EmailJS 模板和收件人设置。', expired: '验证码已过期，请重新获取', sending: '发送中…',
    err: '出错了，请重试', back: '返回',
    onb: '介绍一下你自己', name: '姓名', gender: '性别', male: '男', female: '女', age: '年龄', height: '身高', weight: '体重',
    tw: '目标体重', meals: '每日餐数', goal: '你的目标', lose: '减脂', keep: '保持体重', gain: '增肌', act: '活动量',
    a1: '低', a2: '中', a3: '高', build: '生成我的计划', analyzing: 'AI正在分析你的数据…',
    hi: '你好，{n}！', home: '首页', plan: '计划', hist: '历史', prof: '我的',
    today: '今天', eaten: '已摄入', left: '剩余', over: '超出', protein: '蛋白质', fat: '脂肪', carbs: '碳水', water: '饮水', kcal: '千卡', g: '克', ml: '毫升',
    bf: '早餐', ln: '午餐', dn: '晚餐', sn: '加餐',
    add: '添加', scan: '扫描食物', cam: '相机', gal: '相册', shoot: '拍照', retake: '重拍', analyze: '分析',
    scanning: 'AI正在分析食物…', addTo: '添加到', vit: '维生素与矿物质', notFood: '照片中未发现食物',
    camErr: '无法使用相机。请允许访问（需要HTTPS或localhost）。', noKey: '请在 .env 文件中添加 VITE_GEMINI_KEY',
    aiAn: 'AI分析', forecast: '按安全速度，你大约在{d}达到{w}。', fkeep: '热量已按稳定体重调整。',
    bmi: 'BMI', empty: '暂无内容', logout: '退出登录', theme: '深色模式', lang: '语言', edit: '编辑资料', save: '保存',
    regen: '重新生成', regenTxt: '计划使用的是其他语言', dailyGoal: '每日目标', cancel: '取消', close: '关闭', cm: '厘米', kg: '公斤',
    planT: '每周饮食计划', dayN: '第{n}天', dish: '菜品', fiber: '膳食纤维', sugar: '糖', added: '已添加', last7: '最近7天', total: '合计', tips: '建议',
  },
  hi: {
    tag: 'AI के साथ स्मार्ट कैलोरी ट्रैकिंग', login: 'लॉगिन', reg: 'साइन अप', email: 'ईमेल', pass: 'पासवर्ड', byCode: 'ईमेल कोड', byPass: 'पासवर्ड',
    sendCode: 'कोड भेजें', code: '6 अंकों का कोड', confirm: 'पुष्टि करें', resend: 'फिर से भेजें', sent: 'कोड आपके ईमेल पर भेजा गया', badCode: 'गलत कोड',
    fill: 'सभी फ़ील्ड सही भरें', short: 'पासवर्ड कम से कम 6 अक्षर', noAcc: 'खाता नहीं मिला', exists: 'खाता पहले से मौजूद है',
    badPass: 'गलत पासवर्ड', mailConfig: 'ईमेल भेजने की सुविधा सेट नहीं है। EmailJS service ID, template ID और public key भरें।', mailFail: 'ईमेल नहीं भेजा जा सका। EmailJS टेम्पलेट और प्राप्तकर्ता की सेटिंग जाँचें।', expired: 'कोड समाप्त, नया मँगवाएँ', sending: 'भेजा जा रहा है…',
    err: 'कुछ गलत हुआ, फिर कोशिश करें', back: 'वापस',
    onb: 'अपने बारे में बताएँ', name: 'नाम', gender: 'लिंग', male: 'पुरुष', female: 'महिला', age: 'उम्र', height: 'लंबाई', weight: 'वज़न',
    tw: 'लक्ष्य वज़न', meals: 'दिन में भोजन', goal: 'आपका लक्ष्य', lose: 'वज़न घटाना', keep: 'वज़न बनाए रखना', gain: 'मसल बढ़ाना', act: 'गतिविधि',
    a1: 'कम', a2: 'मध्यम', a3: 'अधिक', build: 'मेरा प्लान बनाएँ', analyzing: 'AI आपका डेटा विश्लेषित कर रहा है…',
    hi: 'नमस्ते, {n}!', home: 'होम', plan: 'प्लान', hist: 'इतिहास', prof: 'प्रोफ़ाइल',
    today: 'आज', eaten: 'खाया', left: 'बचा', over: 'अधिक', protein: 'प्रोटीन', fat: 'वसा', carbs: 'कार्ब्स', water: 'पानी', kcal: 'kcal', g: 'ग्रा', ml: 'मिली',
    bf: 'नाश्ता', ln: 'दोपहर का भोजन', dn: 'रात का खाना', sn: 'स्नैक',
    add: 'जोड़ें', scan: 'खाना स्कैन करें', cam: 'कैमरा', gal: 'गैलरी', shoot: 'फ़ोटो लें', retake: 'दोबारा लें', analyze: 'विश्लेषण',
    scanning: 'AI खाने का विश्लेषण कर रहा है…', addTo: 'जोड़ें:', vit: 'विटामिन और खनिज', notFood: 'फ़ोटो में खाना नहीं मिला',
    camErr: 'कैमरा उपलब्ध नहीं। अनुमति दें (HTTPS या localhost आवश्यक)।', noKey: '.env फ़ाइल में VITE_GEMINI_KEY जोड़ें',
    aiAn: 'AI विश्लेषण', forecast: 'सुरक्षित गति से आप लगभग {d} तक {w} पर पहुँचेंगे।', fkeep: 'आपकी कैलोरी स्थिर वज़न के लिए संतुलित है।',
    bmi: 'BMI', empty: 'अभी खाली', logout: 'लॉग आउट', theme: 'डार्क मोड', lang: 'भाषा', edit: 'प्रोफ़ाइल बदलें', save: 'सहेजें',
    regen: 'दोबारा बनाएँ', regenTxt: 'प्लान किसी और भाषा में है', dailyGoal: 'दैनिक लक्ष्य', cancel: 'रद्द करें', close: 'बंद करें', cm: 'सेमी', kg: 'किग्रा',
    planT: 'साप्ताहिक भोजन योजना', dayN: 'दिन {n}', dish: 'व्यंजन', fiber: 'फाइबर', sugar: 'चीनी', added: 'जोड़ा गया', last7: 'पिछले 7 दिन', total: 'कुल', tips: 'सुझाव',
  },
  ko: {
    tag: 'AI와 함께하는 스마트 칼로리 관리', login: '로그인', reg: '회원가입', email: '이메일', pass: '비밀번호', byCode: '이메일 코드', byPass: '비밀번호',
    sendCode: '코드 전송', code: '6자리 코드', confirm: '확인', resend: '다시 보내기', sent: '이메일로 코드를 보냈어요', badCode: '코드가 틀렸어요',
    fill: '모든 항목을 올바르게 입력하세요', short: '비밀번호는 6자 이상', noAcc: '계정을 찾을 수 없어요', exists: '이미 있는 계정이에요',
    badPass: '비밀번호가 틀렸어요', mailConfig: '이메일 전송이 설정되지 않았어요. EmailJS service ID, template ID, public key를 입력하세요.', mailFail: '이메일을 보내지 못했어요. EmailJS 템플릿과 수신자 설정을 확인하세요.', expired: '코드가 만료되었어요. 새로 요청하세요', sending: '전송 중…',
    err: '문제가 발생했어요. 다시 시도하세요', back: '뒤로',
    onb: '자신에 대해 알려주세요', name: '이름', gender: '성별', male: '남성', female: '여성', age: '나이', height: '키', weight: '체중',
    tw: '목표 체중', meals: '하루 식사 횟수', goal: '목표', lose: '체중 감량', keep: '체중 유지', gain: '근육 증가', act: '활동량',
    a1: '낮음', a2: '보통', a3: '높음', build: '내 플랜 만들기', analyzing: 'AI가 데이터를 분석 중…',
    hi: '안녕하세요, {n}님!', home: '홈', plan: '플랜', hist: '기록', prof: '프로필',
    today: '오늘', eaten: '섭취', left: '남음', over: '초과', protein: '단백질', fat: '지방', carbs: '탄수화물', water: '물', kcal: 'kcal', g: 'g', ml: 'ml',
    bf: '아침', ln: '점심', dn: '저녁', sn: '간식',
    add: '추가', scan: '음식 스캔', cam: '카메라', gal: '갤러리', shoot: '사진 찍기', retake: '다시 찍기', analyze: '분석',
    scanning: 'AI가 음식을 분석 중…', addTo: '추가 위치', vit: '비타민 및 미네랄', notFood: '사진에서 음식을 찾지 못했어요',
    camErr: '카메라를 사용할 수 없어요. 권한을 허용하세요 (HTTPS 또는 localhost 필요).', noKey: '.env 파일에 VITE_GEMINI_KEY를 추가하세요',
    aiAn: 'AI 분석', forecast: '안전한 속도로 약 {d}에 {w}에 도달해요.', fkeep: '안정적인 체중을 위해 칼로리가 조정되었어요.',
    bmi: 'BMI', empty: '아직 비어 있어요', logout: '로그아웃', theme: '다크 모드', lang: '언어', edit: '프로필 수정', save: '저장',
    regen: '다시 생성', regenTxt: '플랜이 다른 언어로 되어 있어요', dailyGoal: '일일 목표', cancel: '취소', close: '닫기', cm: 'cm', kg: 'kg',
    planT: '주간 식단 플랜', dayN: '{n}일차', dish: '음식', fiber: '식이섬유', sugar: '당', added: '추가됨', last7: '최근 7일', total: '합계', tips: '팁',
  },
}

const tr = (l: Lang, k: string, v?: Record<string, string | number>) => {
  let s = D[l]?.[k] ?? D.en[k] ?? k
  if (v) for (const x in v) s = s.replace(`{${x}}`, String(v[x]))
  return s
}

/* =====================================================================
   ICONS
   ===================================================================== */
const ICONS: Record<string, string[]> = {
  home: ['M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  plan: ['M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'],
  cam: ['M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z', 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  hist: ['M12 7v5l3 2', 'M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3 12h18', 'M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  x: ['M18 6L6 18M6 6l12 12'],
  trash: ['M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14'],
  image: ['M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'M21 15l-5-5L5 20'],
  mail: ['M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M22 6l-10 7L2 6'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  drop: ['M12 2.5S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.5 12 2.5z'],
  check: ['M5 12l5 5L20 7'],
  logout: ['M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  refresh: ['M21 12a9 9 0 1 1-3-6.7L21 8', 'M21 3v5h-5'],
}
const Ic = ({ n, s = 22 }: { n: string; s?: number }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONS[n].map((d, i) => <path key={i} d={d} />)}
  </svg>
)

/* =====================================================================
   HELPERS
   ===================================================================== */
const load = <T,>(k: string, d: T): T => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : d } catch { return d } }
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota */ } }
const dk = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
const MEALS: MealKey[] = ['bf', 'ln', 'dn', 'sn']
const EMOJI: Record<MealKey, string> = { bf: '🍳', ln: '🍲', dn: '🍽️', sn: '🍎' }
const guessMeal = (): MealKey => { const h = new Date().getHours(); return h < 11 ? 'bf' : h < 16 ? 'ln' : h < 21 ? 'dn' : 'sn' }

const genCode = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000))

/* ---- Kunlik norma: Mifflin-St Jeor (deterministik, 100% hisoblangan) ---- */
const ACT = [1.2, 1.375, 1.55]
function targets(p: Profile): Targets {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.gender === 'm' ? 5 : -161)
  const tdee = bmr * ACT[p.act]
  let kcal = p.goal === 'lose' ? tdee - 500 : p.goal === 'gain' ? tdee + 400 : tdee
  kcal = Math.round(Math.max(kcal, p.gender === 'm' ? 1500 : 1200) / 10) * 10
  const protein = Math.round(p.weight * (p.goal === 'gain' ? 2 : p.goal === 'lose' ? 1.8 : 1.5))
  const fat = Math.round((kcal * 0.27) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs, water: Math.round((p.weight * 35) / 50) * 50, bmi: p.weight / Math.pow(p.height / 100, 2) }
}

/* ---- Ovqat rejasi ---- */
const SLOTS: Record<number, MealKey[]> = {
  2: ['bf', 'dn'], 3: ['bf', 'ln', 'dn'], 4: ['bf', 'ln', 'sn', 'dn'], 5: ['bf', 'sn', 'ln', 'sn', 'dn'], 6: ['bf', 'sn', 'ln', 'sn', 'dn', 'sn'],
}
const WEIGHT: Record<MealKey, number> = { bf: 0.25, ln: 0.35, dn: 0.3, sn: 0.1 }
function shares(slots: MealKey[]) {
  const sn = slots.filter((s) => s === 'sn').length
  const raw = slots.map((s) => WEIGHT[s] / (s === 'sn' ? sn : 1))
  const sum = raw.reduce((a, b) => a + b, 0)
  return raw.map((x) => x / sum)
}
function fitDay(day: any[], slots: MealKey[], tg: Targets): PlanMeal[] {
  const rows = slots.map((s, i) => ({ type: s, name: String(day?.[i]?.name || ''), kcal: num(day?.[i]?.kcal), p: num(day?.[i]?.p), f: num(day?.[i]?.f), c: num(day?.[i]?.c) }))
  const sum = rows.reduce((a, r) => a + r.kcal, 0)
  const sh = shares(slots)
  const out = rows.map((r, i) => {
    if (sum <= 0) return { ...r, kcal: Math.round(tg.kcal * sh[i]), p: Math.round(tg.protein * sh[i]), f: Math.round(tg.fat * sh[i]), c: Math.round(tg.carbs * sh[i]) }
    const k = tg.kcal / sum
    return { ...r, kcal: Math.round(r.kcal * k), p: Math.round(r.p * k), f: Math.round(r.f * k), c: Math.round(r.c * k) }
  })
  out[out.length - 1].kcal += tg.kcal - out.reduce((a, r) => a + r.kcal, 0) // aniq moslash
  return out
}
function fallbackPlan(p: Profile, tg: Targets, lang: Lang): Plan {
  const slots = SLOTS[p.meals] || SLOTS[3]
  const day = fitDay([], slots, tg).map((m) => ({ ...m, name: tr(lang, m.type) }))
  return { lang, analysis: `${tr(lang, 'bmi')}: ${tg.bmi.toFixed(1)} · ${tr(lang, 'dailyGoal')}: ${tg.kcal} ${tr(lang, 'kcal')}`, tips: [], days: Array.from({ length: 7 }, () => day) }
}

/* ---- Gemini ---- */
async function gemini(parts: any[]): Promise<any> {
  if (!GEMINI_KEY) throw new Error('nokey')
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 16000 } }),
  })
  if (!r.ok) throw new Error('http ' + r.status)
  const j = await r.json()
  const txt = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('')
  return JSON.parse(txt.replace(/```json|```/g, '').trim())
}
const langName = (l: Lang) => LANGS.find((x) => x.c === l)!.n

async function makePlan(p: Profile, tg: Targets, lang: Lang): Promise<Plan> {
  const slots = SLOTS[p.meals] || SLOTS[3]
  const prompt = `You are a certified clinical dietitian and sports nutritionist. Write ALL text values in ${langName(lang)}.
Client: ${JSON.stringify({ name: p.name, sex: p.gender === 'm' ? 'male' : 'female', age: p.age, height_cm: p.height, weight_kg: p.weight, target_weight_kg: p.tw, goal: p.goal, activity: ['low', 'moderate', 'high'][p.act], meals_per_day: p.meals })}.
Computed exact daily targets (do not change): ${tg.kcal} kcal, protein ${tg.protein} g, fat ${tg.fat} g, carbs ${tg.carbs} g. BMI ${tg.bmi.toFixed(1)}.
Return ONLY JSON: {"analysis":"3-4 sentence professional analysis: BMI interpretation, realism of the goal and timeline, key advice","tips":["tip","tip","tip"],"days":[[{"type":"bf|ln|dn|sn","name":"dish with portion in grams","kcal":0,"p":0,"f":0,"c":0}]]}
Rules: exactly 7 days; every day has exactly ${slots.length} meals in this order of types: ${slots.join(', ')}; each day sums to ${tg.kcal} kcal (+-2%); macros consistent with kcal (4/4/9 kcal per g); practical, affordable, varied dishes (include Central Asian and international), no repeats on consecutive days.`
  const r = await gemini([{ text: prompt }])
  const days: PlanMeal[][] = Array.from({ length: 7 }, (_, i) => fitDay(r?.days?.[i] || [], slots, tg))
  return { lang, analysis: String(r?.analysis || ''), tips: (Array.isArray(r?.tips) ? r.tips : []).slice(0, 5).map(String), days }
}

/* ---- Rasm ---- */
function toJpeg(src: CanvasImageSource, w0: number, h0: number, max: number, q: number) {
  const k = Math.min(1, max / Math.max(w0, h0))
  const c = document.createElement('canvas')
  c.width = Math.round(w0 * k); c.height = Math.round(h0 * k)
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', q)
}
const foodPrompt = (lang: Lang) => `You are a clinical dietitian with expert food-recognition skills. Analyze the food in the photo. Write text in ${langName(lang)}.
Estimate the visible portion weight using visual cues (plate, cutlery, hand size). All numbers are for the WHOLE visible portion.
Return ONLY JSON: {"isFood":true,"dish":"name","grams":0,"kcal":0,"protein":0,"fat":0,"carbs":0,"fiber":0,"sugar":0,"vitamins":[{"n":"Vitamin C","v":"12 mg"}],"note":"one short health comment"}
List up to 8 of the most significant vitamins and minerals with amounts. If there is no food in the image return {"isFood":false}.`

async function sendMail(to: string, code: string) {
  const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: EJS_SERVICE, template_id: EJS_TEMPLATE, user_id: EJS_KEY, template_params: { to_email: to, email: to, code, app_name: 'Caloriest AI' } }),
  })
  if (!r.ok) throw new Error(`EmailJS ${r.status}: ${await r.text()}`)
}

const F0: Form = { name: '', gender: 'm', age: '', height: '', weight: '', tw: '', meals: 3, goal: 'lose', act: 1 }
const toForm = (p: Profile): Form => ({ ...p, age: String(p.age), height: String(p.height), weight: String(p.weight), tw: String(p.tw) })

/* =====================================================================
   APP  (hammasi bitta faylda; render funksiyalari — input fokusi yo'qolmasligi uchun)
   ===================================================================== */
export default function App() {
  /* ---- prefs: birinchi kirishda Rus tili + Dark tema ---- */
  const [prefs, setPrefs] = useState<{ lang: Lang; theme: 'light' | 'dark' }>(() => {
    const p = load('cal_prefs', { lang: 'ru' as Lang, theme: 'dark' as 'light' | 'dark' })
    return {
      lang: LANGS.some((l) => l.c === p.lang) ? p.lang : 'ru',
      theme: p.theme === 'light' ? 'light' : 'dark',
    }
  })
  const { lang, theme } = prefs
  const t = (k: string, v?: Record<string, string | number>) => tr(lang, k, v)
  const loc = lang === 'zh' ? 'zh-CN' : lang

  /* ---- Supabase auth / cloud data ---- */
  const [session, setSession] = useState<string | null>(null)
  const [user, setUser] = useState<UserData | undefined>()
  const [authReady, setAuthReady] = useState(false)
  const patch = (f: (d: UserData) => UserData) => {
    if (!session) return
    setUser((current) => {
      const next = f(current || { entries: [], water: {}, tab: 'home', onboarded: false })
      void supabase.from('user_data').upsert({ user_id: session, data: next, updated_at: new Date().toISOString() })
      return next
    })
  }

  /* ---- auth ui ---- */
  const [mode, setMode] = useState<'login' | 'reg'>('login')
  const [method, setMethod] = useState<'code' | 'pass'>('code')
  const [step, setStep] = useState<'form' | 'code'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [codeIn, setCodeIn] = useState('')
  const [demo, setDemo] = useState('')
  const [pending, setPending] = useState<{ code: string; exp: number; tries: number } | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [cool, setCool] = useState(0)

  /* ---- app ui ---- */
  const [langOpen, setLangOpen] = useState(false)
  const [form, setForm] = useState<Form>(F0)
  const [ferr, setFerr] = useState('')
  const [editing, setEditing] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [planDay, setPlanDay] = useState(0)
  const [toast, setToast] = useState('')
  const [ready, setReady] = useState(false)

  /* ---- scan ---- */
  const [stage, setStage] = useState<Stage>('closed')
  const [scanMeal, setScanMeal] = useState<MealKey>('ln')
  const [img, setImg] = useState('')
  const [thumb, setThumb] = useState('')
  const [res, setRes] = useState<Scan | null>(null)
  const [scanErr, setScanErr] = useState('')
  const [camFail, setCamFail] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const galRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600) }

  /* ---- effects ---- */
  useEffect(() => {
    const r = document.documentElement
    r.dataset.theme = theme; r.lang = lang; r.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.title = 'Caloriest AI'
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#050806' : '#f3f9f4')
    save('cal_prefs', prefs)
  }, [prefs])
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      const authUser = data.session?.user
      setSession(authUser?.id || null)
      if (authUser) {
        const { data: row } = await supabase.from('user_data').select('data').eq('user_id', authUser.id).maybeSingle()
        if (active) setUser((row?.data as UserData) || { entries: [], water: {}, tab: 'home', onboarded: false })
      }
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession?.user.id || null)
      if (!nextSession) setUser(undefined)
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])
  useEffect(() => { if (cool > 0) { const id = setTimeout(() => setCool((c) => c - 1), 1000); return () => clearTimeout(id) } }, [cool])
  useEffect(() => {
    const u = user
    setForm(u?.profile ? toForm(u.profile) : u?.draft ? { ...F0, ...u.draft } : F0)
    setEditing(false)
  }, [session, user])
  useEffect(() => { if (session && user && !user.onboarded) patch((d) => ({ ...d, draft: form })) }, [form])
  useEffect(() => {
    setReady(false)
    if (user?.tab === 'home' && user.onboarded) { const id = setTimeout(() => setReady(true), 80); return () => clearTimeout(id) }
  }, [user?.tab, user?.onboarded, session])

  /* kamera oqimi */
  useEffect(() => {
    if (stage !== 'cam') return
    let stream: MediaStream | undefined
    let dead = false
    const fail = () => { setCamFail(true); setScanErr(t('camErr')); setStage('pick') }
    if (!navigator.mediaDevices?.getUserMedia) { fail(); return }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((s) => {
        if (dead) { s.getTracks().forEach((x) => x.stop()); return }
        stream = s
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}) }
      })
      .catch(fail)
    return () => { dead = true; stream?.getTracks().forEach((x) => x.stop()) }
  }, [stage])

  /* ---- format helpers ---- */
  const fd = (key: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc, o).format(new Date(key + 'T12:00:00'))
  const setLang = (l: Lang) => setPrefs((p) => ({ ...p, lang: l }))
  const toggleTheme = () => setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))

  /* =================== AUTH LOGIC =================== */
  const normEmail = email.trim().toLowerCase()
  const resetAuth = () => { setStep('form'); setPassword(''); setCodeIn(''); setPending(null); setDemo(''); setErr(''); setCool(0) }
  const enter = () => { setEmail(''); resetAuth() }

  async function sendCode(em: string) {
    setBusy(true); setErr('')
    try {
      const code = genCode()
      if (MAIL_READY) { await sendMail(em, code); setDemo('') } else setDemo(code)
      setPending({ code, exp: Date.now() + 5 * 60000, tries: 0 })
      setStep('code'); setCodeIn(''); setCool(30)
    } catch (x) {
      console.error('EmailJS send failed:', x)
      setErr(t('mailFail'))
    }
    setBusy(false)
  }
  async function submitForm(e: FormEvent) {
    e.preventDefault(); setErr('')
    const needPass = mode === 'reg' || method === 'pass'
    if (!emailOk(normEmail) || (needPass && !password)) return setErr(t('fill'))
    if (mode === 'reg' && password.length < 6) return setErr(t('short'))
    setBusy(true)
    const result = mode === 'reg'
      ? await supabase.auth.signUp({ email: normEmail, password })
      : method === 'pass'
        ? await supabase.auth.signInWithPassword({ email: normEmail, password })
        : await supabase.auth.signInWithOtp({ email: normEmail, options: { shouldCreateUser: false } })
    setBusy(false)
    if (result.error) {
      const message = result.error.message.toLowerCase()
      if (message.includes('already registered') || message.includes('already exists')) return setErr(t('exists'))
      if (message.includes('invalid login') || message.includes('not found')) return setErr(mode === 'login' ? t('badPass') : t('err'))
      if (message.includes('confirm')) return setErr(result.error.message)
      return setErr(t('err'))
    }
    if (mode === 'reg') {
      if (!result.data.session) { setDemo('Emailingizni tasdiqlash uchun xatni tekshiring'); return }
      await supabase.from('user_data').upsert({ user_id: result.data.user.id, data: { entries: [], water: {}, tab: 'home', onboarded: false }, updated_at: new Date().toISOString() })
    }
    if (method === 'code') { setStep('code'); setCodeIn(''); setCool(30) } else enter()
  }
  async function confirmCode(e: FormEvent) {
    e.preventDefault()
    if (method !== 'code') return
    if (mode === 'reg' && pending) {
      if (Date.now() > pending.exp || pending.tries >= 5) return setErr(t('expired'))
      if (codeIn.trim() !== pending.code) { setPending({ ...pending, tries: pending.tries + 1 }); return setErr(t('badCode')) }
    }
    if (method === 'code') {
      setBusy(true)
      const { data, error } = await supabase.auth.verifyOtp({ email: normEmail, token: codeIn.trim(), type: 'email' })
      setBusy(false)
      if (error || !data.user) return setErr(error?.message || t('badCode'))
      const { data: row } = await supabase.from('user_data').select('data').eq('user_id', data.user.id).maybeSingle()
      setUser((row?.data as UserData) || { entries: [], water: {}, tab: 'home', onboarded: false })
    }
    enter()
  }

  /* =================== ONBOARDING LOGIC =================== */
  async function submitProfile(e: FormEvent) {
    e.preventDefault(); setFerr('')
    const p: Profile = { name: form.name.trim(), gender: form.gender, age: num(form.age), height: num(form.height), weight: num(form.weight), tw: form.goal === 'keep' ? num(form.weight) : num(form.tw), meals: form.meals, goal: form.goal, act: form.act }
    if (!p.name || p.age < 10 || p.age > 100 || p.height < 100 || p.height > 250 || p.weight < 30 || p.weight > 300 || p.tw < 30 || p.tw > 300) return setFerr(t('fill'))
    setThinking(true)
    const tg = targets(p)
    let plan: Plan
    try { plan = await makePlan(p, tg, lang) } catch (x: any) { plan = fallbackPlan(p, tg, lang); notify(x?.message === 'nokey' ? t('noKey') : t('err')) }
    patch((d) => ({ ...d, profile: p, plan, onboarded: true, tab: 'home', draft: undefined }))
    setEditing(false); setPlanDay(0); setThinking(false)
  }
  async function regen() {
    if (!user?.profile) return
    setThinking(true)
    const p = user.profile, tg = targets(p)
    let plan: Plan
    try { plan = await makePlan(p, tg, lang) } catch (x: any) { plan = fallbackPlan(p, tg, lang); notify(x?.message === 'nokey' ? t('noKey') : t('err')) }
    patch((d) => ({ ...d, plan })); setThinking(false)
  }

  /* =================== SCAN LOGIC =================== */
  const openScan = (m: MealKey) => { setScanMeal(m); setImg(''); setRes(null); setScanErr(''); setCamFail(false); setStage('pick') }
  const closeScan = () => setStage('closed')

  async function analyze(url: string) {
    setStage('busy'); setScanErr('')
    try {
      const r = await gemini([{ text: foodPrompt(lang) }, { inlineData: { mimeType: 'image/jpeg', data: url.split(',')[1] } }])
      if (!r?.isFood) { setScanErr(t('notFood')); setStage('preview'); return }
      setRes({
        dish: String(r.dish || '—'), grams: Math.round(num(r.grams)), kcal: Math.round(num(r.kcal)), protein: Math.round(num(r.protein) * 10) / 10,
        fat: Math.round(num(r.fat) * 10) / 10, carbs: Math.round(num(r.carbs) * 10) / 10, fiber: Math.round(num(r.fiber) * 10) / 10, sugar: Math.round(num(r.sugar) * 10) / 10,
        vitamins: (Array.isArray(r.vitamins) ? r.vitamins : []).slice(0, 8).map((v: any) => ({ n: String(v.n), v: String(v.v) })), note: String(r.note || ''),
      })
      setStage('result')
    } catch (x: any) { setScanErr(x?.message === 'nokey' ? t('noKey') : t('err')); setStage('preview') }
  }
  async function fromFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try {
      const bmp = await createImageBitmap(f)
      const url = toJpeg(bmp, bmp.width, bmp.height, 1024, 0.85)
      setThumb(toJpeg(bmp, bmp.width, bmp.height, 160, 0.6)); setImg(url)
      await analyze(url)
    } catch { setScanErr(t('err')); setStage('pick') }
  }
  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const url = toJpeg(v, v.videoWidth, v.videoHeight, 1024, 0.85)
    setThumb(toJpeg(v, v.videoWidth, v.videoHeight, 160, 0.6)); setImg(url)
    analyze(url)
  }
  function addResult() {
    if (!res) return
    const e: Entry = { id: uid(), date: dk(), meal: scanMeal, name: res.dish, kcal: res.kcal, p: res.protein, f: res.fat, c: res.carbs, vit: res.vitamins.map((v) => `${v.n} ${v.v}`), img: thumb }
    patch((d) => ({ ...d, entries: [...d.entries, e] }))
    closeScan(); notify(`✓ ${t('added')}: ${res.dish}`)
  }

  /* =================== RENDER PARTS =================== */
  const renderTop = () => (
    <header className="top">
      <div className="brand"><img className="brand-logo" src="/caloriest-logo.png" alt="" /><span>Caloriest AI</span></div>
      <div className="top-actions">
        <div className="lang-wrap">
          <button className="icon-btn" onClick={() => setLangOpen(!langOpen)} aria-label={t('lang')}><Ic n="globe" s={18} /><b>{lang.toUpperCase()}</b></button>
          {langOpen && (
            <>
              <div className="scrim" onClick={() => setLangOpen(false)} />
              <div className="lang-pop pop">
                {LANGS.map((l) => (
                  <button key={l.c} className={'lang-item' + (l.c === lang ? ' on' : '')} onClick={() => { setLang(l.c); setLangOpen(false) }}><span>{l.f}</span>{l.n}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <button className="icon-btn" onClick={toggleTheme} aria-label={t('theme')}><Ic n={theme === 'dark' ? 'sun' : 'moon'} s={18} /></button>
      </div>
    </header>
  )

  const renderAuth = () => (
    <div className="auth">
      <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
      {renderTop()}
      <main className="auth-card pop">
        <img className="auth-logo" src="/caloriest-logo.png" alt="Caloriest AI" />
        <div><h1>Caloriest AI</h1><p className="muted">{t('tag')}</p></div>

        {step === 'form' && (
          <>
            <div className="seg" data-i={mode === 'login' ? 0 : 1}>
              <i className="seg-thumb" />
              <button className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr('') }}>{t('login')}</button>
              <button className={mode === 'reg' ? 'on' : ''} onClick={() => { setMode('reg'); setErr('') }}>{t('reg')}</button>
            </div>
            {mode === 'login' && (
              <div className="seg small" data-i={method === 'code' ? 0 : 1}>
                <i className="seg-thumb" />
                <button className={method === 'code' ? 'on' : ''} onClick={() => { setMethod('code'); setErr('') }}>{t('byCode')}</button>
                <button className={method === 'pass' ? 'on' : ''} onClick={() => { setMethod('pass'); setErr('') }}>{t('byPass')}</button>
              </div>
            )}
            <form onSubmit={submitForm}>
              <label className="field"><Ic n="mail" s={20} />
                <input className="input" type="email" inputMode="email" autoComplete="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              {(mode === 'reg' || method === 'pass') && (
                <label className="field"><Ic n="lock" s={20} />
                  <input className="input" type="password" autoComplete={mode === 'reg' ? 'new-password' : 'current-password'} placeholder={t('pass')} value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
              )}
              {err && <p className="err" key={err}>{err}</p>}
              <button className="btn" disabled={busy}>{busy ? <i className="spin" /> : mode === 'login' && method === 'pass' ? t('login') : t('sendCode')}</button>
            </form>
          </>
        )}

        {step === 'code' && (
          <form onSubmit={confirmCode}>
            <p className="otp-hint">{t('sent')}<br /><span className="muted">{normEmail}</span></p>
            <input className="input otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={codeIn} autoFocus onChange={(e) => setCodeIn(e.target.value.replace(/\D/g, ''))} />
            {demo && <p className="note">{t('demo')} <b>{demo}</b></p>}
            {err && <p className="err" key={err}>{err}</p>}
            <button className="btn" disabled={codeIn.length !== 6}>{t('confirm')}</button>
            <div className="row">
              <button type="button" className="link" onClick={resetAuth}>← {t('back')}</button>
              <button type="button" className="link" disabled={cool > 0 || busy} onClick={() => sendCode(normEmail)}>{t('resend')}{cool > 0 ? ` (${cool})` : ''}</button>
            </div>
          </form>
        )}
      </main>
    </div>
  )

  const renderOnboard = () => (
    <div className="auth">
      {renderTop()}
      <main className="shell rise">
        <form className="card form" onSubmit={submitProfile}>
          <div><h1>{t('onb')}</h1></div>
          <div><label className="lbl">{t('name')}</label><input className="input" value={form.name} maxLength={30} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label className="lbl">{t('gender')}</label>
            <div className="chips">
              <button type="button" className={'chip' + (form.gender === 'm' ? ' on' : '')} onClick={() => setForm({ ...form, gender: 'm' })}>♂ {t('male')}</button>
              <button type="button" className={'chip' + (form.gender === 'f' ? ' on' : '')} onClick={() => setForm({ ...form, gender: 'f' })}>♀ {t('female')}</button>
            </div>
          </div>
          <div className="grid3">
            <div><label className="lbl">{t('age')}</label><input className="input" inputMode="numeric" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value.replace(/[^\d]/g, '') })} /></div>
            <div><label className="lbl">{t('height')}, {t('cm')}</label><input className="input" inputMode="numeric" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value.replace(/[^\d]/g, '') })} /></div>
            <div><label className="lbl">{t('weight')}, {t('kg')}</label><input className="input" inputMode="decimal" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value.replace(/[^\d.]/g, '') })} /></div>
          </div>
          <div>
            <label className="lbl">{t('goal')}</label>
            <div className="goals">
              {([['lose', '🔥', 'lose'], ['keep', '⚖️', 'keep'], ['gain', '💪', 'gain']] as [Goal, string, string][]).map(([g, em, k]) => (
                <button type="button" key={g} className={'goal' + (form.goal === g ? ' on' : '')} onClick={() => setForm({ ...form, goal: g })}><span>{em}</span>{t(k)}</button>
              ))}
            </div>
          </div>
          {form.goal !== 'keep' && (
            <div><label className="lbl">{t('tw')}, {t('kg')}</label><input className="input" inputMode="decimal" value={form.tw} onChange={(e) => setForm({ ...form, tw: e.target.value.replace(/[^\d.]/g, '') })} /></div>
          )}
          <div>
            <label className="lbl">{t('meals')}</label>
            <div className="chips">{[2, 3, 4, 5, 6].map((n) => <button type="button" key={n} className={'chip' + (form.meals === n ? ' on' : '')} onClick={() => setForm({ ...form, meals: n })}>{n}</button>)}</div>
          </div>
          <div>
            <label className="lbl">{t('act')}</label>
            <div className="chips">{['a1', 'a2', 'a3'].map((k, i) => <button type="button" key={k} className={'chip' + (form.act === i ? ' on' : '')} onClick={() => setForm({ ...form, act: i })}>{t(k)}</button>)}</div>
          </div>
          {ferr && <p className="err" key={ferr}>{ferr}</p>}
          <button className="btn">{t('build')}</button>
          {editing && <button type="button" className="btn ghost" onClick={() => setEditing(false)}>{t('cancel')}</button>}
        </form>
      </main>
    </div>
  )

  const renderEntry = (e: Entry) => (
    <div className="entry" key={e.id}>
      {e.img ? <img className="th" src={e.img} alt="" /> : <span className="th">{EMOJI[e.meal]}</span>}
      <div className="tx">
        <b>{e.name}</b>
        <small>{e.kcal} {t('kcal')} · {t('protein')} {Math.round(e.p)}{t('g')} · {t('fat')} {Math.round(e.f)}{t('g')} · {t('carbs')} {Math.round(e.c)}{t('g')}</small>
      </div>
      <button className="del" aria-label="delete" onClick={() => patch((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== e.id) }))}><Ic n="trash" s={18} /></button>
    </div>
  )

  const renderHome = (u: UserData, p: Profile, tg: Targets) => {
    const today = dk()
    const list = u.entries.filter((e) => e.date === today)
    const S = (k: 'kcal' | 'p' | 'f' | 'c') => list.reduce((a, e) => a + e[k], 0)
    const eaten = Math.round(S('kcal'))
    const left = tg.kcal - eaten
    const R = 86, C = 2 * Math.PI * R
    const pct = Math.min(eaten / tg.kcal, 1)
    const ml = u.water[today] || 0
    const wpct = Math.min(ml / tg.water, 1)
    const addWater = (d: number) => patch((x) => ({ ...x, water: { ...x.water, [today]: Math.max(0, (x.water[today] || 0) + d) } }))

    let forecast = t('fkeep')
    const diff = Math.abs(p.tw - p.weight)
    if (p.goal !== 'keep' && diff > 0.1 && ((p.goal === 'lose' && p.tw < p.weight) || (p.goal === 'gain' && p.tw > p.weight))) {
      const weeks = Math.min(diff / (p.goal === 'lose' ? 0.5 : 0.25), 156)
      forecast = t('forecast', { w: `${p.tw} ${t('kg')}`, d: new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(Date.now() + weeks * 7 * 864e5)) })
    }

    const macro = (label: string, val: number, goal: number, cls: string) => (
      <div className="macro-row" key={label}>
        <div className="macro-top"><b>{label}</b><span>{Math.round(val)} / {goal} {t('g')}</span></div>
        <div className="meter"><i className={cls} style={{ width: ready ? Math.min((val / goal) * 100, 100) + '%' : '0%' }} /></div>
      </div>
    )

    return (
      <main className="shell">
        <div className="hello span2 rise"><h1>{t('hi', { n: p.name })}</h1><p>{fd(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>

        <section className="card ring-card rise">
          <div className="ring">
            <svg viewBox="0 0 200 200">
              <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4ade80" /><stop offset="100%" stopColor="#15803d" /></linearGradient></defs>
              <circle className="track" cx="100" cy="100" r={R} fill="none" strokeWidth="16" />
              <circle className="bar" cx="100" cy="100" r={R} fill="none" strokeWidth="16" strokeLinecap="round" stroke={left < 0 ? '#ea580c' : 'url(#rg)'} strokeDasharray={C} strokeDashoffset={ready ? C * (1 - pct) : C} />
            </svg>
            <div className={'ring-mid' + (left < 0 ? ' over' : '')}><b>{Math.abs(left)}</b><span>{left >= 0 ? t('left') : t('over')} · {t('kcal')}</span></div>
          </div>
          <div className="ring-foot"><div><b>{eaten}</b>{t('eaten')}</div><div><b>{tg.kcal}</b>{t('dailyGoal')}</div></div>
        </section>

        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card macros rise">
            {macro(t('protein'), S('p'), tg.protein, '')}
            {macro(t('fat'), S('f'), tg.fat, 'f')}
            {macro(t('carbs'), S('c'), tg.carbs, 'c')}
          </section>

          <section className="card water rise">
            <div className="tank"><div className={'fill' + (ml === 0 ? ' empty' : '')} style={{ height: wpct * 100 + '%' }} /><b>{Math.round(wpct * 100)}%</b></div>
            <div className="water-body">
              <h3>{t('water')}</h3>
              <strong>{ml} <span>/ {tg.water} {t('ml')}</span></strong>
              <div className="water-btns">
                <button className="round" aria-label="-250" onClick={() => addWater(-250)}><Ic n="minus" s={18} /></button>
                <button className="round fillbtn" onClick={() => addWater(250)}><Ic n="drop" s={18} />+250 {t('ml')}</button>
              </div>
            </div>
          </section>
        </div>

        <section className="card span2 rise">
          <div className="card-h"><h2>{t('aiAn')}</h2></div>
          <p className="analysis">{forecast}</p>
        </section>

        {MEALS.map((m) => {
          const es = list.filter((e) => e.meal === m)
          return (
            <section className="card rise" key={m}>
              <div className="meal-h">
                <span className="em">{EMOJI[m]}</span>
                <div><h3>{t(m)}</h3><small>{Math.round(es.reduce((a, e) => a + e.kcal, 0))} {t('kcal')}</small></div>
                <button className="round fillbtn" onClick={() => openScan(m)}><Ic n="plus" s={18} />{t('add')}</button>
              </div>
              {es.length > 0 && <div className="entries">{es.map(renderEntry)}</div>}
            </section>
          )
        })}
      </main>
    )
  }

  const renderPlan = (u: UserData, tg: Targets) => {
    const plan = u.plan
    if (!plan) return null
    const day = plan.days[planDay] || plan.days[0]
    const sum = (k: 'kcal' | 'p' | 'f' | 'c') => day.reduce((a, m) => a + m[k], 0)
    return (
      <main className="shell">
        {plan.lang !== lang && (
          <div className="banner span2"><span>{t('regenTxt')}</span><button className="btn sm" onClick={regen}><Ic n="refresh" s={16} />{t('regen')}</button></div>
        )}
        <section className="card rise span2">
          <div className="card-h"><h2>{t('aiAn')}</h2></div>
          <div className="stats" style={{ marginBottom: 14 }}>
            <div className="stat"><b>{tg.kcal}</b><span>{t('kcal')}</span></div>
            <div className="stat"><b>{tg.bmi.toFixed(1)}</b><span>{t('bmi')}</span></div>
            <div className="stat"><b>{tg.water}</b><span>{t('ml')}</span></div>
          </div>
          <p className="analysis">{plan.analysis}</p>
          {plan.tips.length > 0 && (
            <ul className="tips">{plan.tips.map((x, i) => <li key={i}><Ic n="check" s={18} />{x}</li>)}</ul>
          )}
        </section>

        <section className="card rise span2">
          <div className="card-h"><h2>{t('planT')}</h2><button className="icon-btn" onClick={regen} aria-label={t('regen')}><Ic n="refresh" s={18} /></button></div>
          <div className="days">{plan.days.map((_, i) => <button key={i} className={'chip' + (planDay === i ? ' on' : '')} onClick={() => setPlanDay(i)}>{t('dayN', { n: i + 1 })}</button>)}</div>
          <div className="tbl-wrap">
            <table key={planDay}>
              <thead><tr><th>{t('dish')}</th><th>{t('kcal')}</th><th>{t('protein')}</th><th>{t('fat')}</th><th>{t('carbs')}</th></tr></thead>
              <tbody>
                {day.map((m, i) => (
                  <tr key={i} style={{ animationDelay: i * 60 + 'ms' }}>
                    <td><small>{t(m.type)}</small>{m.name}</td><td className="n">{m.kcal}</td><td>{m.p}</td><td>{m.f}</td><td>{m.c}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>{t('total')}</td><td>{sum('kcal')}</td><td>{sum('p')}</td><td>{sum('f')}</td><td>{sum('c')}</td></tr></tfoot>
            </table>
          </div>
        </section>
      </main>
    )
  }

  const renderHist = (u: UserData, tg: Targets) => {
    const days = Array.from({ length: 7 }, (_, i) => dk(new Date(Date.now() - (6 - i) * 864e5)))
    const tot = (d: string) => Math.round(u.entries.filter((e) => e.date === d).reduce((a, e) => a + e.kcal, 0))
    const max = tg.kcal * 1.4
    const keys = Array.from(new Set(u.entries.map((e) => e.date))).sort().reverse()
    return (
      <main className="shell">
        <section className="card rise span2">
          <div className="card-h"><h2>{t('last7')}</h2></div>
          <div className="bars">
            <div className="line" style={{ bottom: 26 + (tg.kcal / max) * 100 + 'px' }} />
            {days.map((d, i) => {
              const v = tot(d)
              return (
                <div className="bcol" key={d}>
                  <i className={v > tg.kcal ? 'o' : ''} style={{ height: Math.max((v / max) * 100, v ? 4 : 0) + 'px', animationDelay: i * 70 + 'ms' }} />
                  <span>{fd(d, { weekday: 'short' })}</span>
                </div>
              )
            })}
          </div>
        </section>
        {keys.length === 0 && <p className="empty-t span2">{t('empty')}</p>}
        {keys.map((d) => (
          <section className="card rise" key={d}>
            <div className="day-h"><h3>{fd(d, { weekday: 'long', day: 'numeric', month: 'long' })}</h3><span>{tot(d)} {t('kcal')}</span></div>
            <div className="entries">{u.entries.filter((e) => e.date === d).map(renderEntry)}</div>
          </section>
        ))}
      </main>
    )
  }

  const renderProf = (p: Profile, tg: Targets) => (
    <main className="shell">
      <section className="card rise span2">
        <div className="me">
          <div className="ava">{p.name.slice(0, 1).toUpperCase()}</div>
          <div style={{ flex: 1 }}><h2>{p.name}</h2><small>{session}</small></div>
          <button className="icon-btn" aria-label={t('edit')} onClick={() => { setForm(toForm(p)); setEditing(true) }}><Ic n="edit" s={18} /></button>
        </div>
        <div className="stats" style={{ marginTop: 16 }}>
          <div className="stat"><b>{p.weight}</b><span>{t('kg')}</span></div>
          <div className="stat"><b>{p.height}</b><span>{t('cm')}</span></div>
          <div className="stat"><b>{p.age}</b><span>{t('age')}</span></div>
          <div className="stat"><b>{tg.bmi.toFixed(1)}</b><span>{t('bmi')}</span></div>
          <div className="stat"><b>{tg.kcal}</b><span>{t('kcal')}</span></div>
          <div className="stat"><b>{p.tw}</b><span>{t('tw')}</span></div>
        </div>
      </section>
      <section className="card rise">
        <div className="row"><span>{t('theme')}</span><button className={'switch' + (theme === 'dark' ? ' on' : '')} role="switch" aria-checked={theme === 'dark'} onClick={toggleTheme} /></div>
      </section>
      <section className="card rise">
        <div className="card-h"><h3>{t('lang')}</h3></div>
        <div className="lang-grid">{LANGS.map((l) => <button key={l.c} className={'lang-item' + (l.c === lang ? ' on' : '')} onClick={() => setLang(l.c)}><span>{l.f}</span>{l.n}</button>)}</div>
      </section>
      <button className="btn ghost span2" onClick={() => { void supabase.auth.signOut(); setSession(null); setUser(undefined); resetAuth() }}><Ic n="logout" s={20} />{t('logout')}</button>
    </main>
  )

  const renderNav = (u: UserData) => {
    const tabs: [Tab, string][] = [['home', 'home'], ['plan', 'plan'], ['hist', 'hist'], ['prof', 'user']]
    const b = ([k, i]: [Tab, string]) => (
      <button key={k} className={'nav-b' + (u.tab === k ? ' on' : '')} onClick={() => patch((d) => ({ ...d, tab: k }))}><Ic n={i} s={24} />{t(k === 'prof' ? 'prof' : k)}</button>
    )
    return (
      <nav className="nav">
        {b(tabs[0])}{b(tabs[1])}
        <button className="fab" aria-label={t('scan')} onClick={() => openScan(guessMeal())}><Ic n="cam" s={28} /></button>
        {b(tabs[2])}{b(tabs[3])}
      </nav>
    )
  }

  const renderScan = () => {
    if (stage === 'closed') return null
    return (
      <div className="overlay" onClick={(e) => e.target === e.currentTarget && stage !== 'busy' && closeScan()}>
        <div className="sheet">
          <div className="sheet-h"><h2>{t('scan')}</h2><button className="icon-btn" aria-label={t('close')} onClick={closeScan}><Ic n="x" s={18} /></button></div>
          <input ref={galRef} type="file" accept="image/*" hidden onChange={fromFile} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={fromFile} />

          {stage === 'pick' && (
            <>
              <div className="pick">
                <button className="pick-b" onClick={() => { setScanErr(''); setStage('cam') }}><Ic n="cam" s={38} /><span>{t('cam')}</span></button>
                <button className="pick-b" onClick={() => galRef.current?.click()}><Ic n="image" s={38} /><span>{t('gal')}</span></button>
              </div>
              {camFail && <button className="btn ghost" onClick={() => camRef.current?.click()}><Ic n="cam" s={20} />{t('shoot')}</button>}
              {scanErr && <p className="err" key={scanErr}>{scanErr}</p>}
            </>
          )}

          {stage === 'cam' && (
            <div className="viewfinder">
              <video ref={videoRef} playsInline muted autoPlay />
              <i className="corner a" /><i className="corner b" /><i className="corner c" /><i className="corner d" />
              <button className="shutter" aria-label={t('shoot')} onClick={capture} />
            </div>
          )}

          {stage === 'busy' && (
            <>
              <div className="viewfinder"><img src={img} alt="" /><div className="scan-tint" /><i className="scanline" /></div>
              <p className="scan-msg shimmer">{t('scanning')}</p>
            </>
          )}

          {stage === 'preview' && (
            <>
              <div className="viewfinder"><img src={img} alt="" /></div>
              {scanErr && <p className="err" key={scanErr}>{scanErr}</p>}
              <div className="pick">
                <button className="btn ghost" onClick={() => setStage('pick')}>{t('retake')}</button>
                <button className="btn" onClick={() => analyze(img)}>{t('analyze')}</button>
              </div>
            </>
          )}

          {stage === 'result' && res && (
            <>
              <div className="res-top">
                <img src={img} alt="" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2>{res.dish}</h2>
                  <p className="muted">~{res.grams} {t('g')}</p>
                </div>
                <div className="big-k">{res.kcal}<br /><small>{t('kcal')}</small></div>
              </div>
              <div className="tiles">
                {([['protein', res.protein], ['fat', res.fat], ['carbs', res.carbs], ['fiber', res.fiber], ['sugar', res.sugar]] as [string, number][]).map(([k, v], i) => (
                  <div className="tile" key={k} style={{ animationDelay: i * 70 + 'ms' }}><b>{v} {t('g')}</b><span>{t(k)}</span></div>
                ))}
              </div>
              {res.vitamins.length > 0 && (
                <div>
                  <label className="lbl">{t('vit')}</label>
                  <div className="vits">{res.vitamins.map((v, i) => <span className="vit" key={i} style={{ animationDelay: i * 60 + 'ms' }}>{v.n} <b>{v.v}</b></span>)}</div>
                </div>
              )}
              {res.note && <p className="note">{res.note}</p>}
              <div>
                <label className="lbl">{t('addTo')}</label>
                <div className="chips">{MEALS.map((m) => <button key={m} className={'chip' + (scanMeal === m ? ' on' : '')} onClick={() => setScanMeal(m)}>{EMOJI[m]} {t(m)}</button>)}</div>
              </div>
              <button className="btn" onClick={addResult}><Ic n="check" s={20} />{t('add')}</button>
            </>
          )}
        </div>
      </div>
    )
  }

  /* =================== MAIN RENDER =================== */
  let body
  if (!authReady) body = <div className="auth"><main className="auth-card pop"><h1>Caloriest AI</h1><p className="muted">Hisob tekshirilmoqda...</p><i className="spin" /></main></div>
  else if (!session) body = renderAuth()
  else if (!user) body = <div className="auth"><div className="card rise"><i className="spin" /></div></div>
  else if (!user.onboarded || editing || !user.profile) body = renderOnboard()
  else {
    const tg = targets(user.profile)
    body = (
      <>
        {renderTop()}
        {user.tab === 'home' && renderHome(user, user.profile, tg)}
        {user.tab === 'plan' && renderPlan(user, tg)}
        {user.tab === 'hist' && renderHist(user, tg)}
        {user.tab === 'prof' && renderProf(user.profile, tg)}
        {renderNav(user)}
      </>
    )
  }

  return (
    <div className="app">
      {body}
      {renderScan()}
      {thinking && <div className="think"><img src="/caloriest-logo.png" alt="" /><p className="shimmer">{t('analyzing')}</p></div>}
      {toast && <div className="toast pop">{toast}</div>}
    </div>
  )
}
