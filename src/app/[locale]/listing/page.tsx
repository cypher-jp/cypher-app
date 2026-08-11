import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { routing, type AppLocale } from "@/i18n/routing";

export const dynamic = "force-static";

interface PageProps {
  params: { locale: string };
}

/**
 * 掲載案内ページのコピー。言語ごとの文章量が多いためmessagesではなくページ内に持つ。
 * 料金は「現在の事実」として書き、「今後も一切/永久に」等の将来を縛る表現は使わない
 * (将来オプションプランを追加しても矛盾しないようにするため)。
 */
const COPY: Record<
  AppLocale,
  {
    eyebrow: string;
    title: string;
    lead: string[];
    priceFree: string;
    priceNote: string;
    meritsTitle: string;
    merits: { title: string; body: string }[];
    typesTitle: string;
    types: string[];
    infoTitle: string;
    info: string[];
    existingTitle: string;
    existingBody: string;
    existingItems: string[];
    flowTitle: string;
    steps: string[];
    ctaTitle: string;
    ctaPrice: string;
    ctaButton: string;
  }
> = {
  ja: {
    eyebrow: "EVENT LISTING",
    title: "ダンスイベントを、無料で世界へ。",
    lead: [
      "WORLD Cypher.では、ストリートダンスイベントの掲載を無料で受け付けています。",
      "バトル、ワークショップ、ショーケース、コンテスト、セッションなど、イベント規模を問わず掲載可能です。",
    ],
    priceFree: "基本掲載 0円",
    priceNote:
      "エントリーはWORLD Cypher.内では受け付けず、主催者様の公式エントリー先・公式SNSへ直接ユーザーをご案内します。そのためエントリー手数料も発生しません。",
    meritsTitle: "掲載するメリット",
    merits: [
      { title: "基本掲載は無料", body: "イベントの基本掲載に費用はかかりません。" },
      {
        title: "ダンスイベントに特化",
        body: "POPPING、LOCKING、BREAKING、HIP HOP、HOUSEなど、ストリートダンスイベントを探しているユーザーへ情報を届けます。",
      },
      {
        title: "国内・海外のダンサーへ",
        body: "国内外のイベントを掲載しています。日本のイベントを海外ダンサーが見つけたり、日本のダンサーが海外イベントを探したりできる環境を目指しています。",
      },
      {
        title: "公式エントリー先へ送客",
        body: "イベント詳細ページから、主催者様の公式エントリーページ・Instagram・公式サイトへ直接誘導します。",
      },
      {
        title: "多言語でイベントを掲載",
        body: "日本語・英語・韓国語・中国語・フランス語に対応。海外ユーザーにもイベントを発見してもらえる可能性を広げます。",
      },
    ],
    typesTitle: "掲載できるイベント",
    types: [
      "DANCE BATTLE",
      "WORKSHOP",
      "CONTEST",
      "SHOWCASE",
      "CYPHER / SESSION",
      "PARTY",
      "DANCE CAMP",
      "その他ストリートダンス関連イベント",
    ],
    infoTitle: "掲載できる情報",
    info: [
      "イベント名",
      "フライヤー",
      "開催日",
      "開催時間",
      "会場",
      "ジャンル",
      "エントリー料金",
      "エントリー締切",
      "Judge / DJ / MC / Guest",
      "公式Instagram",
      "公式サイト",
      "エントリーURL",
    ],
    existingTitle: "すでに掲載されている場合",
    existingBody:
      "WORLD Cypher.では公開情報をもとにイベント情報を掲載している場合があります。すでに掲載されているイベントについても、以下を受け付けています。",
    existingItems: ["情報の修正", "情報の追加", "フライヤー変更", "エントリーURL変更"],
    flowTitle: "掲載までの流れ",
    steps: [
      "掲載フォームからイベント情報を送信",
      "WORLD Cypher.で内容を確認",
      "イベントページを公開",
      "公式エントリー先・SNSへ送客",
    ],
    ctaTitle: "EVENT LISTING",
    ctaPrice: "基本掲載 ¥0",
    ctaButton: "イベント掲載を申し込む",
  },
  en: {
    eyebrow: "EVENT LISTING",
    title: "Get your dance event seen worldwide — for free.",
    lead: [
      "WORLD Cypher. lists street dance events free of charge.",
      "Battles, workshops, showcases, contests, sessions — events of any size are welcome.",
    ],
    priceFree: "Basic listing: Free",
    priceNote:
      "Entries are not handled inside WORLD Cypher. — we send users directly to your official entry page and social accounts, so there are no entry fees either.",
    meritsTitle: "Why list with us",
    merits: [
      { title: "Basic listing is free", body: "There is no cost for a basic event listing." },
      {
        title: "Dedicated to street dance",
        body: "We reach users searching specifically for POPPING, LOCKING, BREAKING, HIP HOP, HOUSE and more.",
      },
      {
        title: "Dancers in Japan and abroad",
        body: "We list events worldwide, helping overseas dancers find Japanese events and vice versa.",
      },
      {
        title: "Traffic to your official entry page",
        body: "Event pages link users directly to your official entry page, Instagram, and website.",
      },
      {
        title: "Multilingual listings",
        body: "Japanese, English, Korean, Chinese and French supported — expanding your reach to international users.",
      },
    ],
    typesTitle: "Events we list",
    types: [
      "DANCE BATTLE",
      "WORKSHOP",
      "CONTEST",
      "SHOWCASE",
      "CYPHER / SESSION",
      "PARTY",
      "DANCE CAMP",
      "Other street dance events",
    ],
    infoTitle: "Information we can publish",
    info: [
      "Event name",
      "Flyer",
      "Date",
      "Time",
      "Venue",
      "Genres",
      "Entry fee",
      "Entry deadline",
      "Judges / DJs / MCs / Guests",
      "Official Instagram",
      "Official website",
      "Entry URL",
    ],
    existingTitle: "Already listed?",
    existingBody:
      "WORLD Cypher. may list events based on public information. For events already listed, we accept:",
    existingItems: ["Corrections", "Additional info", "Flyer updates", "Entry URL updates"],
    flowTitle: "How it works",
    steps: [
      "Submit your event via the form",
      "We review the details",
      "Your event page goes live",
      "Users are sent to your official entry page and SNS",
    ],
    ctaTitle: "EVENT LISTING",
    ctaPrice: "Basic listing ¥0",
    ctaButton: "Submit your event",
  },
  ko: {
    eyebrow: "EVENT LISTING",
    title: "댄스 이벤트를 무료로 전 세계에.",
    lead: [
      "WORLD Cypher.는 스트리트 댄스 이벤트 등재를 무료로 받고 있습니다.",
      "배틀, 워크숍, 쇼케이스, 콘테스트, 세션 등 규모에 관계없이 등재할 수 있습니다.",
    ],
    priceFree: "기본 등재 0원",
    priceNote:
      "엔트리는 WORLD Cypher. 내에서 받지 않고, 주최자의 공식 엔트리 페이지·공식 SNS로 사용자를 직접 안내합니다. 따라서 엔트리 수수료도 발생하지 않습니다.",
    meritsTitle: "등재 메리트",
    merits: [
      { title: "기본 등재 무료", body: "이벤트 기본 등재에 비용이 들지 않습니다." },
      {
        title: "댄스 이벤트 특화",
        body: "POPPING, LOCKING, BREAKING, HIP HOP, HOUSE 등 스트리트 댄스 이벤트를 찾는 사용자에게 정보를 전달합니다.",
      },
      {
        title: "국내외 댄서에게",
        body: "국내외 이벤트를 등재하고 있어, 해외 댄서가 일본 이벤트를 찾거나 일본 댄서가 해외 이벤트를 찾을 수 있습니다.",
      },
      {
        title: "공식 엔트리 페이지로 송객",
        body: "이벤트 상세 페이지에서 주최자의 공식 엔트리 페이지·Instagram·공식 사이트로 직접 유도합니다.",
      },
      {
        title: "다국어 등재",
        body: "일본어·영어·한국어·중국어·프랑스어를 지원하여 해외 사용자에게도 발견될 가능성을 넓힙니다.",
      },
    ],
    typesTitle: "등재 가능한 이벤트",
    types: [
      "DANCE BATTLE",
      "WORKSHOP",
      "CONTEST",
      "SHOWCASE",
      "CYPHER / SESSION",
      "PARTY",
      "DANCE CAMP",
      "기타 스트리트 댄스 관련 이벤트",
    ],
    infoTitle: "등재 가능한 정보",
    info: [
      "이벤트명",
      "플라이어",
      "개최일",
      "개최 시간",
      "장소",
      "장르",
      "엔트리 요금",
      "엔트리 마감",
      "Judge / DJ / MC / Guest",
      "공식 Instagram",
      "공식 사이트",
      "엔트리 URL",
    ],
    existingTitle: "이미 등재되어 있는 경우",
    existingBody:
      "WORLD Cypher.는 공개 정보를 바탕으로 이벤트를 등재하는 경우가 있습니다. 이미 등재된 이벤트에 대해서도 다음을 접수합니다.",
    existingItems: ["정보 수정", "정보 추가", "플라이어 변경", "엔트리 URL 변경"],
    flowTitle: "등재까지의 흐름",
    steps: [
      "등재 폼으로 이벤트 정보 전송",
      "WORLD Cypher.에서 내용 확인",
      "이벤트 페이지 공개",
      "공식 엔트리 페이지·SNS로 송객",
    ],
    ctaTitle: "EVENT LISTING",
    ctaPrice: "기본 등재 ¥0",
    ctaButton: "이벤트 등재 신청하기",
  },
  zh: {
    eyebrow: "EVENT LISTING",
    title: "让你的舞蹈活动免费走向世界。",
    lead: [
      "WORLD Cypher. 免费接受街舞活动的刊登。",
      "Battle、Workshop、Showcase、Contest、Session 等，无论规模大小均可刊登。",
    ],
    priceFree: "基础刊登 0 元",
    priceNote:
      "报名不在 WORLD Cypher. 内进行，我们会将用户直接引导至主办方的官方报名页面和官方社交账号，因此也不产生报名手续费。",
    meritsTitle: "刊登的优势",
    merits: [
      { title: "基础刊登免费", body: "活动的基础刊登不收取费用。" },
      {
        title: "专注于舞蹈活动",
        body: "将信息传递给正在寻找 POPPING、LOCKING、BREAKING、HIP HOP、HOUSE 等街舞活动的用户。",
      },
      {
        title: "面向国内外舞者",
        body: "刊登日本及海外的活动，帮助海外舞者发现日本活动，也帮助日本舞者寻找海外活动。",
      },
      {
        title: "引流至官方报名页面",
        body: "从活动详情页直接引导用户前往主办方的官方报名页面、Instagram 和官方网站。",
      },
      {
        title: "多语言刊登",
        body: "支持日语、英语、韩语、中文、法语，扩大被海外用户发现的可能性。",
      },
    ],
    typesTitle: "可刊登的活动",
    types: [
      "DANCE BATTLE",
      "WORKSHOP",
      "CONTEST",
      "SHOWCASE",
      "CYPHER / SESSION",
      "PARTY",
      "DANCE CAMP",
      "其他街舞相关活动",
    ],
    infoTitle: "可刊登的信息",
    info: [
      "活动名称",
      "海报",
      "举办日期",
      "举办时间",
      "会场",
      "舞种",
      "报名费用",
      "报名截止日期",
      "Judge / DJ / MC / Guest",
      "官方 Instagram",
      "官方网站",
      "报名 URL",
    ],
    existingTitle: "已被刊登的活动",
    existingBody:
      "WORLD Cypher. 有时会根据公开信息刊登活动。对于已刊登的活动，我们也接受以下申请。",
    existingItems: ["信息修正", "信息补充", "更换海报", "更换报名 URL"],
    flowTitle: "刊登流程",
    steps: [
      "通过表单提交活动信息",
      "WORLD Cypher. 确认内容",
      "活动页面公开",
      "引导用户前往官方报名页面和 SNS",
    ],
    ctaTitle: "EVENT LISTING",
    ctaPrice: "基础刊登 ¥0",
    ctaButton: "申请刊登活动",
  },
  fr: {
    eyebrow: "EVENT LISTING",
    title: "Faites connaître votre événement de danse au monde entier, gratuitement.",
    lead: [
      "WORLD Cypher. référence gratuitement les événements de street dance.",
      "Battles, workshops, showcases, contests, sessions — tous les événements sont les bienvenus, quelle que soit leur taille.",
    ],
    priceFree: "Référencement de base : gratuit",
    priceNote:
      "Les inscriptions ne se font pas sur WORLD Cypher. — nous dirigeons les utilisateurs directement vers votre page d'inscription officielle et vos réseaux sociaux. Aucun frais d'inscription n'est donc prélevé.",
    meritsTitle: "Pourquoi être référencé",
    merits: [
      { title: "Référencement de base gratuit", body: "Le référencement de base est sans frais." },
      {
        title: "Spécialisé street dance",
        body: "Nous touchons les utilisateurs qui cherchent des événements POPPING, LOCKING, BREAKING, HIP HOP, HOUSE et plus.",
      },
      {
        title: "Danseurs du Japon et d'ailleurs",
        body: "Nous référençons des événements du monde entier, aidant les danseurs étrangers à découvrir les événements japonais et inversement.",
      },
      {
        title: "Trafic vers votre page officielle",
        body: "Les pages événement dirigent les utilisateurs vers votre page d'inscription officielle, Instagram et votre site.",
      },
      {
        title: "Référencement multilingue",
        body: "Japonais, anglais, coréen, chinois et français pris en charge — élargissez votre visibilité internationale.",
      },
    ],
    typesTitle: "Événements référencés",
    types: [
      "DANCE BATTLE",
      "WORKSHOP",
      "CONTEST",
      "SHOWCASE",
      "CYPHER / SESSION",
      "PARTY",
      "DANCE CAMP",
      "Autres événements street dance",
    ],
    infoTitle: "Informations publiables",
    info: [
      "Nom de l'événement",
      "Flyer",
      "Date",
      "Horaires",
      "Lieu",
      "Styles",
      "Frais d'inscription",
      "Date limite d'inscription",
      "Judges / DJs / MCs / Guests",
      "Instagram officiel",
      "Site officiel",
      "URL d'inscription",
    ],
    existingTitle: "Déjà référencé ?",
    existingBody:
      "WORLD Cypher. peut référencer des événements à partir d'informations publiques. Pour les événements déjà référencés, nous acceptons :",
    existingItems: [
      "Corrections",
      "Ajouts d'informations",
      "Changement de flyer",
      "Changement d'URL d'inscription",
    ],
    flowTitle: "Comment ça marche",
    steps: [
      "Envoyez les informations via le formulaire",
      "WORLD Cypher. vérifie le contenu",
      "Votre page événement est publiée",
      "Les utilisateurs sont dirigés vers votre page officielle et vos réseaux",
    ],
    ctaTitle: "EVENT LISTING",
    ctaPrice: "Référencement de base ¥0",
    ctaButton: "Proposer un événement",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (params.locale as AppLocale) in COPY ? (params.locale as AppLocale) : "ja";
  const c = COPY[locale];
  return {
    title: `${c.eyebrow} | ${SITE_NAME}`,
    description: c.lead[0],
    alternates: {
      canonical: `${SITE_URL}/${params.locale}/listing`,
    },
  };
}

export default function ListingPage({ params }: PageProps) {
  setRequestLocale(params.locale);
  const locale = (params.locale as AppLocale) in COPY ? (params.locale as AppLocale) : "ja";
  const c = COPY[locale];

  return (
    <div>
      {/* ヒーロー: 全幅写真+中央タイトル(サイファーサークルの文字無し部分を使用) */}
      <section className="relative flex h-[300px] w-full items-center justify-center overflow-hidden bg-ink md:h-[420px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/listing-hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="relative px-6 text-center text-paper">
          <div className="text-xs font-bold uppercase tracking-[0.4em] text-cypher-yellow">
            {c.eyebrow}
          </div>
          <h1 className="display mt-4 text-4xl font-black leading-tight md:text-6xl">
            {c.title}
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 py-14">
      {/* リード文+料金 */}
      <section className="text-center">
        {c.lead.map((p) => (
          <p key={p} className="mx-auto mt-3 max-w-2xl text-base text-ink/80">
            {p}
          </p>
        ))}
        <div className="mt-8 inline-block rounded-2xl border-2 border-cypher-red px-8 py-4">
          <div className="display text-3xl font-black text-cypher-red">{c.priceFree}</div>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-ink/60">{c.priceNote}</p>
      </section>

      {/* メリット */}
      <section className="mt-14">
        <h2 className="display text-2xl font-black uppercase tracking-tight">
          {c.meritsTitle}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {c.merits.map((m, i) => (
            <div
              key={m.title}
              className="rounded-2xl border border-ink/10 bg-paper p-6 shadow-card"
            >
              <div className="display text-sm font-black text-cypher-red">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="display mt-1 text-lg font-black">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 掲載できるイベント / 情報 */}
      <section className="mt-14 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="display text-xl font-black uppercase tracking-tight">
            {c.typesTitle}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {c.types.map((t) => (
              <span key={t} className="chip-outline">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h2 className="display text-xl font-black uppercase tracking-tight">
            {c.infoTitle}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {c.info.map((t) => (
              <span key={t} className="chip-outline">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* すでに掲載されている場合 */}
      <section className="mt-14 rounded-2xl border border-ink/10 bg-paper p-8 shadow-card">
        <h2 className="display text-xl font-black uppercase tracking-tight">
          {c.existingTitle}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">{c.existingBody}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {c.existingItems.map((t) => (
            <span key={t} className="chip-outline">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* 掲載までの流れ */}
      <section className="mt-14">
        <h2 className="display text-2xl font-black uppercase tracking-tight">
          {c.flowTitle}
        </h2>
        <ol className="mt-6 flex flex-col gap-3">
          {c.steps.map((s, i) => (
            <li
              key={s}
              className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-paper p-5 shadow-card"
            >
              <span className="display shrink-0 text-2xl font-black text-cypher-red">
                {i + 1}
              </span>
              <span className="text-sm font-bold">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section className="mt-14 overflow-hidden rounded-3xl bg-ink p-10 text-center text-paper md:p-14">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-cypher-yellow">
          {c.ctaTitle}
        </div>
        <div className="display mt-3 text-4xl font-black text-cypher-red">{c.ctaPrice}</div>
        <div className="mt-8">
          <Link href="/contact" className="btn-primary inline-block">
            {c.ctaButton}
          </Link>
        </div>
      </section>
      </div>
    </div>
  );
}
