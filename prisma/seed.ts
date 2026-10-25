import { PrismaClient, Prisma, PaymentChannel, DiscountType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const D = (n: number) => new Prisma.Decimal(n);

type Pkg = { name: string; amount: number; bonus?: number; cost: number; sell: number; orig?: number; best?: boolean };

const games: {
  slug: string; name: string; publisher: string; currencyName: string; requiresZone: boolean;
  zoneIdLabel?: string; stockGameCode: string; popular: boolean; packages: Pkg[];
}[] = [
  {
    slug: "mobile-legends", name: "Mobile Legends: Bang Bang", publisher: "Moonton", currencyName: "Diamonds",
    requiresZone: true, zoneIdLabel: "Zone ID", stockGameCode: "mlbb", popular: true,
    packages: [
      { name: "11 Diamonds", amount: 11, cost: 0.14, sell: 0.18 },
      { name: "56 Diamonds", amount: 56, cost: 0.72, sell: 0.89 },
      { name: "86 Diamonds", amount: 86, cost: 1.1, sell: 1.35, best: true },
      { name: "172 Diamonds", amount: 172, cost: 2.2, sell: 2.69 },
      { name: "257 Diamonds", amount: 257, cost: 3.3, sell: 3.99 },
      { name: "706 Diamonds", amount: 706, cost: 9.0, sell: 10.9, orig: 11.5, best: true },
      { name: "2195 Diamonds", amount: 2195, cost: 27.5, sell: 32.9, orig: 35.0 },
      { name: "Weekly Diamond Pass", amount: 0, bonus: 0, cost: 1.35, sell: 1.69, best: true },
    ],
  },
  {
    slug: "free-fire", name: "Garena Free Fire", publisher: "Garena", currencyName: "Diamonds",
    requiresZone: false, stockGameCode: "freefire", popular: true,
    packages: [
      { name: "100 + 10 Diamonds", amount: 100, bonus: 10, cost: 0.92, sell: 1.1 },
      { name: "310 + 31 Diamonds", amount: 310, bonus: 31, cost: 2.8, sell: 3.3, best: true },
      { name: "520 + 52 Diamonds", amount: 520, bonus: 52, cost: 4.6, sell: 5.4 },
      { name: "1060 + 106 Diamonds", amount: 1060, bonus: 106, cost: 9.2, sell: 10.7, orig: 11.2 },
      { name: "Weekly Membership", amount: 0, cost: 1.4, sell: 1.69 },
      { name: "Monthly Membership", amount: 0, cost: 6.8, sell: 7.9, orig: 8.5, best: true },
    ],
  },
  {
    slug: "pubg-mobile", name: "PUBG Mobile (UC)", publisher: "Krafton / Tencent", currencyName: "UC",
    requiresZone: false, stockGameCode: "pubgm", popular: true,
    packages: [
      { name: "60 UC", amount: 60, cost: 0.9, sell: 1.05 },
      { name: "325 UC", amount: 325, bonus: 0, cost: 4.5, sell: 5.2, best: true },
      { name: "660 UC", amount: 660, cost: 9.0, sell: 10.4 },
      { name: "1800 UC", amount: 1800, cost: 22.5, sell: 25.9, orig: 27.0 },
      { name: "3850 UC", amount: 3850, cost: 45.0, sell: 51.5, orig: 54.0 },
    ],
  },
  {
    slug: "honor-of-kings", name: "Honor of Kings", publisher: "TiMi Studio", currencyName: "Tokens",
    requiresZone: false, stockGameCode: "hok", popular: false,
    packages: [
      { name: "80 Tokens", amount: 80, cost: 0.95, sell: 1.15 },
      { name: "400 Tokens", amount: 400, cost: 4.7, sell: 5.5 },
      { name: "800 Tokens", amount: 800, cost: 9.3, sell: 10.8 },
    ],
  },
  {
    slug: "genshin-impact", name: "Genshin Impact", publisher: "HoYoverse", currencyName: "Genesis Crystals",
    requiresZone: true, zoneIdLabel: "Server", stockGameCode: "genshin", popular: false,
    packages: [
      { name: "60 Genesis Crystals", amount: 60, cost: 0.95, sell: 1.1 },
      { name: "330 Genesis Crystals", amount: 330, cost: 4.8, sell: 5.5, best: true },
      { name: "1090 Genesis Crystals", amount: 1090, cost: 15.5, sell: 17.9 },
    ],
  },
];

async function main() {
  // Admin
  const email = process.env.ADMIN_SEED_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_SEED_PASSWORD ?? "Admin@12345";
  await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12), emailVerified: new Date() },
  });

  // Games + packages
  for (const [i, g] of games.entries()) {
    const { packages, ...gameData } = g;
    const game = await db.game.upsert({
      where: { slug: g.slug },
      update: {},
      create: { ...gameData, sortOrder: i, coverUrl: `/games/${g.slug}.jpg`, description: `Top up ${g.name} instantly. Enter your ID, pay, receive in seconds.` },
    });
    const existing = await db.package.count({ where: { gameId: game.id } });
    if (existing === 0) {
      await db.package.createMany({
        data: packages.map((p, idx) => ({
          gameId: game.id, name: p.name, amount: p.amount, bonus: p.bonus ?? 0,
          costPrice: D(p.cost), sellPrice: D(p.sell), originalPrice: p.orig ? D(p.orig) : null,
          bestSeller: !!p.best, sortOrder: idx, stockSku: `${g.stockGameCode}-${p.amount || idx}`,
        })),
      });
    }
  }

  // Payment methods
  const methods: [PaymentChannel, string, number][] = [
    [PaymentChannel.KHQR, "Bakong KHQR", 0], [PaymentChannel.ABA, "ABA Pay", 0],
    [PaymentChannel.WING, "Wing", 0], [PaymentChannel.CARD, "Visa / Mastercard", 2.5], [PaymentChannel.WALLET, "Wallet Balance", 0],
  ];
  for (const [i, [channel, label, fee]] of methods.entries()) {
    await db.paymentMethod.upsert({ where: { channel }, update: {}, create: { channel, label, feePercent: D(fee), sortOrder: i } });
  }

  // Reseller tiers
  for (const [name, pct, spend] of [["Bronze", 2, 0], ["Silver", 4, 500], ["Gold", 6, 2000]] as const) {
    await db.resellerTier.upsert({ where: { name }, update: {}, create: { name, discountPercent: D(pct), minMonthlySpend: D(spend) } });
  }

  // Promo
  await db.promoCode.upsert({
    where: { code: "WELCOME5" }, update: {},
    create: { code: "WELCOME5", type: DiscountType.PERCENT, value: D(5), maxDiscount: D(2), perUserLimit: 1 },
  });

  // Banners
  if ((await db.banner.count()) === 0) {
    await db.banner.createMany({
      data: [
        { title: "Instant Diamonds, Zero Wait", subtitle: "Top up in under 10 seconds", imageUrl: "/banners/hero-1.jpg", placement: "HOME_HERO", linkUrl: "/games/mobile-legends" },
        { title: "Flash Sale -20%", subtitle: "Limited time on Free Fire", imageUrl: "/banners/promo-1.jpg", placement: "HOME_PROMO", linkUrl: "/games/free-fire" },
      ],
    });
  }

  // FAQ
  if ((await db.faq.count()) === 0) {
    await db.faq.createMany({
      data: [
        { question: "How long does delivery take?", questionKm: "តើការដឹកជញ្ជូនចំណាយពេលប៉ុន្មាន?", answer: "Usually under 1 minute after payment is confirmed.", answerKm: "ជាធម្មតាតិចជាង ១ នាទី បន្ទាប់ពីការបង់ប្រាក់ត្រូវបានបញ្ជាក់។", sortOrder: 0 },
        { question: "What if my order fails?", questionKm: "បើការបញ្ជាទិញបរាជ័យ?", answer: "Failed orders are refunded automatically to your wallet.", answerKm: "ការបញ្ជាទិញបរាជ័យនឹងត្រូវបានសងប្រាក់ចូលកាបូបរបស់អ្នកដោយស្វ័យប្រវត្តិ។", sortOrder: 1 },
      ],
    });
  }

  // Testimonials
  if ((await db.testimonial.count()) === 0) {
    await db.testimonial.createMany({
      data: [
        { name: "Sokha", game: "Mobile Legends", content: "Fast and trusted. Got my diamonds in seconds!" },
        { name: "Dara", game: "Free Fire", content: "Best price in Cambodia, KHQR payment is so easy." },
      ],
    });
  }

  // Settings
  const settings: Record<string, unknown> = {
    siteName: "DiamondHub", logoUrl: "/logo.svg", maintenanceMode: false,
    supportTelegram: process.env.SUPPORT_TELEGRAM ?? "", supportWhatsapp: process.env.SUPPORT_WHATSAPP ?? "",
    usdToKhr: Number(process.env.USD_TO_KHR ?? 4100), pointsPerUsd: 10, maxOrdersPerIpPerHour: 10,
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value: value as Prisma.InputJsonValue } });
  }

  console.log("Seed complete. Admin:", email);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
