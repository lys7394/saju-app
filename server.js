const express = require('express');
const cors = require('cors');
const KoreanLunarCalendar = require('korean-lunar-calendar');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(__dirname));

const CHEONGAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const JIJI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const CHEONGAN_HANJA = { "갑": "甲", "을": "乙", "병": "丙", "정": "丁", "무": "戊", "기": "己", "경": "庚", "신": "辛", "임": "壬", "계": "癸" };
const JIJI_HANJA = { "자": "子", "축": "丑", "인": "寅", "묘": "卯", "진": "辰", "사": "巳", "오": "午", "미": "未", "신": "申", "유": "酉", "술": "戌", "해": "亥" };
const ELEMENT_HANJA = { "목": "木", "화": "火", "토": "土", "금": "金", "수": "水" };
const TEN_GOD_HANJA = { "비견": "比肩", "겁재": "劫財", "식신": "食神", "상관": "傷官", "편재": "偏財", "정재": "正財", "편관": "偏官", "정관": "正官", "편인": "偏印", "정인": "正印" };

function stemText(stem) { return stem === "-" ? "-" : `${stem}(${CHEONGAN_HANJA[stem]})`; }
function branchText(branch) { return branch === "-" ? "-" : `${branch}(${JIJI_HANJA[branch]})`; }
function pillarText(stem, branch) {
    if (stem === "-" || branch === "-") return "-";
    return `${stem}${branch}(${CHEONGAN_HANJA[stem]}${JIJI_HANJA[branch]})`;
}
function tenGodText(god) { return `${god}(${TEN_GOD_HANJA[god] || god})`; }
function applyHaoche(text) {
    return text
    .replace(/있을 수 있습니다\./g, "있을 수 있소.")
    .replace(/만들어갑니다\./g, "만들어 가오.")
    .replace(/살펴봅니다\./g, "살펴보오.")
    .replace(/알려줍니다\./g, "알려 주오.")
    .replace(/나타납니다\./g, "나타나오.")
    .replace(/나타냅니다\./g, "드러내오.")
    .replace(/만듭니다\./g, "만드오.")
    .replace(/읽을 수 있습니다\./g, "읽을 수 있소.")
    .replace(/읽습니다\./g, "읽는 것이오.")
    .replace(/봅니다\./g, "보는 것이오.")
    .replace(/뜻합니다\./g, "뜻하오.")
    .replace(/생깁니다\./g, "생기오.")
    .replace(/필요합니다\./g, "필요하오.")
    .replace(/중요합니다\./g, "중요하오.")
    .replace(/확인해야 합니다\./g, "확인해야 하오.")
    .replace(/보셔야 합니다\./g, "보셔야 하오.")
    .replace(/있습니다\./g, "있소.")
    .replace(/없습니다\./g, "없소.")
    .replace(/좋습니다\./g, "좋소.")
    .replace(/됩니다\./g, "되오.")
    .replace(/합니다\./g, "하오.")
    .replace(/입니다\./g, "이오.")
    .replace(/해주세요/g, "해 주시오")
    .replace(/보세요/g, "보시오")
        .replace(/은\(는\)/g, "은")
        .replace(/이\(가\)/g, "이");
}
function parseBirthDate(value) {
    const input = String(value).trim();
    if (/^\d{8}$/.test(input)) return [input.slice(0, 4), input.slice(4, 6), input.slice(6, 8)].map(Number);
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(input)) return input.split('-').map(Number);
    return null;
}
function formatDetailNarrative(text, dayStem, dayBranch) {
    return text
        .replace(new RegExp(`일지 ${dayBranch}`, 'g'), `일지 ${branchText(dayBranch)}`)
        .replace(new RegExp(`지장간 ${HIDDEN_STEMS[dayBranch].join(', ')}`, 'g'), `지장간 ${HIDDEN_STEMS[dayBranch].map(stemText).join(', ')}`)
        .replace(new RegExp(` ${ELEMENTS[dayBranch]}의`, 'g'), ` ${ELEMENTS[dayBranch]}(${ELEMENT_HANJA[ELEMENTS[dayBranch]]})의`)
        .replace(new RegExp(` ${dayStem} 일간`, 'g'), ` ${stemText(dayStem)} 일간`);
}

const ELEMENTS = {
    "갑": "목", "을": "목", "인": "목", "묘": "목",
    "병": "화", "정": "화", "사": "화", "오": "화",
    "무": "토", "기": "토", "진": "토", "술": "토", "축": "토", "미": "토",
    "경": "금", "신": "금", "유": "금",
    "임": "수", "계": "수", "해": "수", "자": "수"
};

const SAMHAP = {
    "인": "화", "오": "화", "술": "화",
    "신": "수", "자": "수", "진": "수",
    "사": "금", "유": "금", "축": "금",
    "해": "목", "묘": "목", "미": "목"
};

const SHINSAL_12_MAP = {
    "화": { "해": "겁살", "자": "재살", "축": "천살", "인": "지살", "묘": "년살(도화)", "진": "월살", "사": "망신살", "오": "장성살", "미": "반안살", "신": "역마살", "유": "육해살", "술": "화개살" },
    "수": { "사": "겁살", "오": "재살", "미": "천살", "신": "지살", "유": "년살(도화)", "술": "월살", "해": "망신살", "자": "장성살", "축": "반안살", "인": "역마살", "묘": "육해살", "진": "화개살" },
    "금": { "인": "겁살", "묘": "재살", "진": "천살", "사": "지살", "오": "년살(도화)", "미": "월살", "신": "망신살", "유": "장성살", "술": "반안살", "해": "역마살", "자": "육해살", "축": "화개살" },
    "목": { "신": "겁살", "유": "재살", "술": "천살", "해": "지살", "자": "년살(도화)", "축": "월살", "인": "망신살", "묘": "장성살", "진": "반안살", "사": "역마살", "오": "육해살", "미": "화개살" }
};

const SHINSAL_MEANINGS = {
    "겁살": "예상 밖의 변화와 경쟁 속에서 결단을 요구하는 기운",
    "재살": "외부 자극과 압박을 계기로 집중력이 높아지는 기운",
    "천살": "내 뜻만으로 통제하기 어려운 큰 흐름을 겪으며 시야가 넓어지는 기운",
    "지살": "이동과 활동 반경의 확장, 새로운 환경에 적응하는 기운",
    "년살(도화)": "사람의 시선을 끌고 매력과 표현력을 드러내는 기운",
    "월살": "계획이 지연되거나 속도를 조절하며 내실을 다지는 기운",
    "망신살": "감춰둔 모습이 드러나며 말과 행동의 영향력이 커지는 기운",
    "장성살": "주도권, 승부욕, 책임감이 강해져 앞에 나서게 하는 기운",
    "반안살": "자리를 잡고 성과를 인정받으며 한 단계 올라서는 기운",
    "역마살": "이동, 변화, 출장과 새로운 경험을 통해 운이 움직이는 기운",
    "육해살": "관계의 미세한 긴장과 손실을 점검하며 신중함을 배우는 기운",
    "화개살": "혼자 깊이 몰입하고 예술·연구·정신적 세계를 탐구하는 기운",
    "천을귀인": "어려운 때 도움을 주는 사람이나 보호의 기회가 생기는 기운",
    "문창귀인": "배움, 글, 말, 기획과 표현에서 재능이 드러나는 기운",
    "금여성": "품위와 생활의 안정, 좋은 인연과 대우를 끌어당기는 기운",
    "백호대살": "강한 추진력과 위기 대응력을 주지만 무리함을 경계해야 하는 기운",
    "괴강살": "강한 자존심과 카리스마로 어려움을 돌파하는 기운",
    "양인살": "경쟁에서 물러서지 않는 결단력과 실행력을 주는 기운",
    "천문성": "사물의 본질과 사람의 속마음을 꿰뚫어 보는 직관",
    "현침살": "예리한 관찰력과 손끝의 정밀함, 날카로운 말의 힘"
};

const TWELVE_STAGE_MEANINGS = {
    "장생": "새 기운이 태어나 가능성과 시작이 열리는 단계",
    "목욕": "감각과 표현이 살아나고 사람의 시선을 의식하는 단계",
    "관대": "자신감과 활동성이 자라 사회에 모습을 드러내는 단계",
    "건록": "자기 힘으로 자리를 잡고 독립적으로 실행하는 단계",
    "제왕": "기운이 가장 왕성해 성취와 주도권이 커지는 단계",
    "쇠": "정점 뒤의 속도 조절과 경험의 지혜가 필요한 단계",
    "병": "기운이 약해져 휴식과 내면 점검이 필요한 단계",
    "사": "한 흐름을 정리하고 다음 변화를 준비하는 단계",
    "묘": "겉보다 내면에 힘이 모이고 깊이 저장되는 단계",
    "절": "기존 방식이 끊기고 새로운 방향을 찾아야 하는 단계",
    "태": "아직 드러나지 않은 가능성이 자라나는 준비 단계",
    "양": "안에서 힘을 기르며 때를 기다리는 축적의 단계"
};
const TEN_GOD_MEANINGS = {
    "비견": "자기 기준과 독립심, 동료와 나란히 서는 힘",
    "겁재": "경쟁심과 승부욕, 사람과 자원을 빠르게 움직이는 힘",
    "식신": "재능을 꾸준히 생산하고 삶을 즐기는 힘",
    "상관": "기존 틀을 깨고 날카롭게 표현하는 힘",
    "편재": "기회를 포착하고 사람과 자원을 넓게 운용하는 힘",
    "정재": "현실적인 책임과 계획으로 결과를 축적하는 힘",
    "편관": "압박을 돌파하고 위기에서 실행력을 내는 힘",
    "정관": "규칙과 신뢰를 지키며 사회적 역할을 완성하는 힘",
    "편인": "독특한 관점과 직관으로 본질을 파고드는 힘",
    "정인": "배움과 보호, 깊은 이해를 통해 기반을 다지는 힘"
};

const YANG_GAN = new Set(["갑", "병", "무", "경", "임"]);
const GENERATING = { "목": "화", "화": "토", "토": "금", "금": "수", "수": "목" };
const CONTROLLING = { "목": "토", "토": "수", "수": "화", "화": "금", "금": "목" };
const HIDDEN_STEMS = {
    "자": ["임"], "축": ["계", "신", "기"], "인": ["무", "병", "갑"],
    "묘": ["갑", "을"], "진": ["을", "계", "무"], "사": ["무", "경", "병"],
    "오": ["병", "기", "정"], "미": ["정", "을", "기"], "신": ["무", "임", "경"],
    "유": ["경", "신"], "술": ["신", "정", "무"], "해": ["무", "갑", "임"]
};
const TWELVE_STAGES = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"];
const JIEOL_DATES = [5, 4, 6, 5, 6, 6, 7, 7, 7, 8, 7, 7];

const STEM_ELEMENT = { "갑": "목", "을": "목", "병": "화", "정": "화", "무": "토", "기": "토", "경": "금", "신": "금", "임": "수", "계": "수" };

function isYang(stem) { return YANG_GAN.has(stem); }

function tenGod(dayStem, targetStem) {
    const dayElement = STEM_ELEMENT[dayStem];
    const targetElement = STEM_ELEMENT[targetStem];
    const samePolarity = isYang(dayStem) === isYang(targetStem);
    if (dayElement === targetElement) return samePolarity ? "비견" : "겁재";
    if (GENERATING[dayElement] === targetElement) return samePolarity ? "식신" : "상관";
    if (CONTROLLING[dayElement] === targetElement) return samePolarity ? "편재" : "정재";
    if (CONTROLLING[targetElement] === dayElement) return samePolarity ? "편관" : "정관";
    return samePolarity ? "편인" : "정인";
}

function getTwelveStage(dayStem, branch) {
    const start = { "갑": 2, "을": 5, "병": 2, "정": 5, "무": 2, "기": 5, "경": 8, "신": 11, "임": 8, "계": 11 }[dayStem];
    const index = JIJI.indexOf(branch);
    if (index < 0) return "-";
    const offset = isYang(dayStem) ? index - start : start - index;
    return TWELVE_STAGES[(offset % 12 + 12) % 12];
}

function getLuckDirection(gender, yearStem) {
    return (gender === "남성" && isYang(yearStem)) || (gender === "여성" && !isYang(yearStem)) ? "순행" : "역행";
}

function addMonthsToPillar(gan, ji, count, direction) {
    const ganIndex = (CHEONGAN.indexOf(gan) + count * direction + 100) % 10;
    const jiIndex = (JIJI.indexOf(ji) + count * direction + 120) % 12;
    return CHEONGAN[ganIndex] + JIJI[jiIndex];
}

function getSolarTermDate(year, month) {
    return new Date(year, month - 1, JIEOL_DATES[(month - 1) % 12]);
}

function calculateDaeun(year, month, day, gender, yearStem, monthGan, monthJi) {
    const directionName = getLuckDirection(gender, yearStem);
    const direction = directionName === "순행" ? 1 : -1;
    const termMonth = direction === 1 ? month : month - 1;
    const termDate = getSolarTermDate(year, ((termMonth - 1 + 12) % 12) + 1);
    if (direction === -1 && termDate > new Date(year, month - 1, day)) termDate.setFullYear(year - 1);
    const birthDate = new Date(year, month - 1, day);
    const daysToTerm = Math.max(1, Math.round(Math.abs(termDate - birthDate) / 86400000));
    const startAge = Math.max(1, Math.min(10, Math.round(daysToTerm / 3)));
    const periods = Array.from({ length: 8 }, (_, index) => {
        const ageStart = startAge + index * 10;
        return { order: index + 1, ageStart, ageEnd: ageStart + 9, ganji: addMonthsToPillar(monthGan, monthJi, index + 1, direction) };
    });
    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - year;
    const active = periods.find(period => currentAge >= period.ageStart && currentAge <= period.ageEnd) || null;
        return { direction: directionName, startAge, basedOn: "절입일 기준(절입일 날짜 테이블)", periods, currentAge, active };
}

function calculateStrength(dayStem, monthJi, stems, branches) {
    const dayElement = STEM_ELEMENT[dayStem];
    const monthElement = ELEMENTS[monthJi];
    const rooted = branches.some(branch => branch !== "-" && (ELEMENTS[branch] === dayElement || HIDDEN_STEMS[branch]?.some(stem => STEM_ELEMENT[stem] === dayElement)));
    const supported = stems.filter(stem => stem !== "-" && (STEM_ELEMENT[stem] === dayElement || STEM_ELEMENT[stem] === Object.keys(GENERATING).find(key => GENERATING[key] === dayElement))).length;
    const score = (monthElement === dayElement ? 40 : 0) + (rooted ? 30 : 0) + supported * 10;
    return { score: Math.min(100, score), deukryeong: monthElement === dayElement, deukji: rooted, deukse: supported > 0, status: score >= 60 ? "신강" : "신약" };
}

app.post('/api/saju', (req, res) => {
    try {
        const { name, gender, birthDate, birthTime, calType } = req.body;
        if (!birthDate) return res.status(400).json({ success: false, error: "생년월일 누락" });

        const parsedBirthDate = parseBirthDate(birthDate);
        if (!parsedBirthDate) return res.status(400).json({ success: false, error: "생년월일은 8자리 숫자(예: 19940326)로 입력해 주시오." });
        let [y, m, d] = parsedBirthDate;

        const calendar = new KoreanLunarCalendar();
        const isLunar = calType ? calType.includes('음력') : false;
        const isLeap = calType ? calType.includes('윤달') : false;

        let dateSet;
        if (isLunar) {
            dateSet = calendar.setLunarDate(y, m, d, isLeap);
            if (!dateSet) return res.status(400).json({ success: false, error: "유효하지 않은 음력 날짜입니다." });
            const solar = calendar.getSolarCalendar();
            y = solar.year; m = solar.month; d = solar.day;
        } else {
            dateSet = calendar.setSolarDate(y, m, d);
            if (!dateSet) return res.status(400).json({ success: false, error: "유효하지 않은 양력 날짜입니다." });
        }

        const gapja = calendar.getKoreanGapja();
        const getGapjaChars = (value, fallbackGan, fallbackJi) => {
            const chars = typeof value === "string" ? value.slice(0, 2) : "";
            return [chars[0] || fallbackGan, chars[1] || fallbackJi];
        };
        const [yGan, yJi] = getGapjaChars(gapja.year, "갑", "술");
        const [mGan, mJi] = getGapjaChars(gapja.month, "정", "묘");
        const [dGan, dJi] = getGapjaChars(gapja.day, "신", "해");

        let tGan = "-";
        let tJi = "-";

        if (birthTime && birthTime !== "none") {
            const hour = parseInt(birthTime, 10);
            if (!isNaN(hour)) {
                const tJiIdx = Math.floor((hour + 1) / 2) % 12;
                const dGanIdx = CHEONGAN.indexOf(dGan);
                if (dGanIdx !== -1) {
                    const tGanIdx = ((dGanIdx % 5) * 2 + tJiIdx) % 10;
                    tGan = CHEONGAN[tGanIdx];
                    tJi = JIJI[tJiIdx];
                }
            }
        }

        const allChars = [yGan, yJi, mGan, mJi, dGan, dJi];
        if (tGan !== "-") allChars.push(tGan, tJi);

        const stems = [yGan, mGan, dGan, tGan];
        const branches = [yJi, mJi, dJi, tJi];
        const tenGods = [
            { position: "연간", char: yGan, label: tenGod(dGan, yGan) },
            { position: "월간", char: mGan, label: tenGod(dGan, mGan) },
            { position: "시간", char: tGan, label: tGan === "-" ? "-" : tenGod(dGan, tGan) },
            { position: "연지", char: yJi, hidden: HIDDEN_STEMS[yJi], labels: HIDDEN_STEMS[yJi].map(stem => tenGod(dGan, stem)) },
            { position: "월지", char: mJi, hidden: HIDDEN_STEMS[mJi], labels: HIDDEN_STEMS[mJi].map(stem => tenGod(dGan, stem)) },
            { position: "일지", char: dJi, hidden: HIDDEN_STEMS[dJi], labels: HIDDEN_STEMS[dJi].map(stem => tenGod(dGan, stem)) },
            { position: "시지", char: tJi, hidden: tJi === "-" ? [] : HIDDEN_STEMS[tJi], labels: tJi === "-" ? [] : HIDDEN_STEMS[tJi].map(stem => tenGod(dGan, stem)) }
        ];
        const twelveStages = branches.map((branch, index) => ({ position: ["연지", "월지", "일지", "시지"][index], branch, stage: getTwelveStage(dGan, branch) }));
        const hiddenStems = branches.map((branch, index) => ({ position: ["연지", "월지", "일지", "시지"][index], branch, stems: branch === "-" ? [] : HIDDEN_STEMS[branch] }));
        const strength = calculateStrength(dGan, mJi, stems, branches);
        const pattern = tenGod(dGan, HIDDEN_STEMS[mJi][HIDDEN_STEMS[mJi].length - 1]);
        const usefulElements = strength.status === "신강" ? [CONTROLLING[STEM_ELEMENT[dGan]], GENERATING[STEM_ELEMENT[dGan]]] : [GENERATING[STEM_ELEMENT[dGan]], STEM_ELEMENT[dGan]];
        const today = new Date();
        const todayCalendar = new KoreanLunarCalendar();
        todayCalendar.setSolarDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
        const todayGapja = todayCalendar.getKoreanGapja();
        const todayDateText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const currentYearText = todayGapja.year.replace(/[년]/g, '').slice(0, 2);
        const currentDayText = todayGapja.day.replace(/[일]/g, '').slice(0, 2);
        const currentYearStems = [currentYearText[0]];
        const currentYearBranches = [currentYearText[1]];
        const currentDayStems = [currentDayText[0]];
        const currentDayBranches = [currentDayText[1]];
        const currentDayGanji = currentDayText;
        const currentYear = today.getFullYear();
        const daeun = calculateDaeun(y, m, d, gender, yGan, mGan, mJi);
        const currentYearRelation = {
            ganElement: ELEMENTS[currentYearStems[0]],
            jiElement: ELEMENTS[currentYearBranches[0]],
            relationToDayMaster: tenGod(dGan, currentYearStems[0]),
            support: GENERATING[STEM_ELEMENT[dGan]] === ELEMENTS[currentYearStems[0]] || STEM_ELEMENT[dGan] === ELEMENTS[currentYearStems[0]],
            control: CONTROLLING[STEM_ELEMENT[dGan]] === ELEMENTS[currentYearStems[0]] || CONTROLLING[STEM_ELEMENT[dGan]] === ELEMENTS[currentYearBranches[0]]
        };
        const currentDayRelation = {
            ganElement: ELEMENTS[currentDayStems[0]],
            jiElement: ELEMENTS[currentDayBranches[0]],
            relationToDayMaster: tenGod(dGan, currentDayStems[0])
        };
        const dailyScore = Math.max(45, Math.min(95, 70 + (usefulElements.includes(currentDayRelation.ganElement) ? 15 : 0) + (currentDayRelation.ganElement === STEM_ELEMENT[dGan] ? 8 : 0)));
        const dailyFortune = {
            "비견": "내 뜻을 세우고 주변과 보조를 맞추면 일이 빠르게 풀리는 날이오.",
            "겁재": "사람과 기회가 활발히 움직이니 경쟁보다 협력에서 실마리를 찾는 날이오.",
            "식신": "준비해 온 재능을 편안하게 드러내면 작은 성과가 결과로 이어지는 날이오.",
            "상관": "익숙한 방식에 새 생각을 더하기 좋은 날이나, 말의 날카로움은 조절해야 하오.",
            "편재": "뜻밖의 제안과 현실적인 기회가 들어올 수 있으니 움직이되 조건을 살피는 날이오.",
            "정재": "돈과 일의 순서를 정리하고 꾸준히 처리할수록 신뢰와 실속이 쌓이는 날이오.",
            "편관": "긴장되는 일이 생겨도 회피하지 않고 핵심부터 처리하면 오히려 힘을 얻는 날이오.",
            "정관": "약속과 책임을 지키는 모습이 좋은 평가로 돌아오는 날이오.",
            "편인": "남들과 다른 관점이 해답을 주는 날이니 혼자 생각할 시간을 아끼지 마시오.",
            "정인": "배움과 도움의 인연이 들어오니 조언을 받아 기반을 다지기 좋은 날이오."
        }[currentDayRelation.relationToDayMaster];
        const dailyCaution = {
            "비견": "자기 방식만 고집하거나 사소한 주도권 다툼에 힘을 쓰지 않도록 하시오.",
            "겁재": "충동적인 지출과 경쟁심으로 인한 말다툼을 경계하시오.",
            "식신": "편안함에 머물러 해야 할 일을 미루지 않도록 마감 시간을 정하시오.",
            "상관": "옳은 말을 하더라도 상대의 자존심을 건드리지 않게 표현을 한 번 고르시오.",
            "편재": "좋아 보이는 제안이라도 계약과 비용을 확인하기 전에는 약속하지 마시오.",
            "정재": "돈과 일의 책임을 혼자 떠안아 몸과 마음을 소진시키지 마시오.",
            "편관": "압박감에 몰려 성급한 결론을 내리지 말고 순서를 나누어 처리하시오.",
            "정관": "규칙을 지키려다 타인에게 지나치게 엄격해지지 않도록 하시오.",
            "편인": "생각만 깊어져 실행을 미루지 않도록 오늘 할 한 가지를 정하시오.",
            "정인": "누군가의 조언을 그대로 따르기보다 자신의 판단과 함께 살피시오."
        }[currentDayRelation.relationToDayMaster];

        const elemCount = { "목": 0, "화": 0, "토": 0, "금": 0, "수": 0 };
        allChars.forEach(c => { if (ELEMENTS[c]) elemCount[ELEMENTS[c]]++; });

        const shinsals = [];
        const jiPositions = [
            { name: "연지", char: yJi },
            { name: "월지", char: mJi },
            { name: "일지", char: dJi },
            { name: "시지", char: tJi }
        ];

        const daySamhapGroup = SAMHAP[dJi];
        if (daySamhapGroup && SHINSAL_12_MAP[daySamhapGroup]) {
            jiPositions.forEach(pos => {
                if (pos.char && pos.char !== "-") {
                    const salName = SHINSAL_12_MAP[daySamhapGroup][pos.char];
                    if (salName) shinsals.push(`${salName}(${pos.name})`);
                }
            });
        }

        const allJiStr = [yJi, mJi, dJi, tJi].filter(j => j && j !== "-").join('');
        const pillars = [
            { name: "연주", str: yGan + yJi },
            { name: "월주", str: mGan + mJi },
            { name: "일주", str: dGan + dJi },
            { name: "시주", str: tGan + tJi }
        ];

        jiPositions.forEach(pos => {
            if (pos.char && pos.char !== "-") {
                if ((dGan === "갑" || dGan === "무" || dGan === "경") && (pos.char === "축" || pos.char === "미")) shinsals.push(`천을귀인(${pos.name})`);
                if ((dGan === "을" || dGan === "기") && (pos.char === "자" || pos.char === "신")) shinsals.push(`천을귀인(${pos.name})`);
                if ((dGan === "병" || dGan === "정") && (pos.char === "해" || pos.char === "유")) shinsals.push(`천을귀인(${pos.name})`);
                if (dGan === "신" && (pos.char === "인" || pos.char === "오")) shinsals.push(`천을귀인(${pos.name})`);
                if ((dGan === "임" || dGan === "계") && (pos.char === "사" || pos.char === "묘")) shinsals.push(`천을귀인(${pos.name})`);
            }
        });

        jiPositions.forEach(pos => {
            if (pos.char && pos.char !== "-") {
                if (dGan === "갑" && pos.char === "사") shinsals.push(`문창귀인(${pos.name})`);
                if (dGan === "을" && pos.char === "오") shinsals.push(`문창귀인(${pos.name})`);
                if ((dGan === "병" || dGan === "무") && pos.char === "신") shinsals.push(`문창귀인(${pos.name})`);
                if ((dGan === "정" || dGan === "기") && pos.char === "유") shinsals.push(`문창귀인(${pos.name})`);
                if (dGan === "경" && pos.char === "해") shinsals.push(`문창귀인(${pos.name})`);
                if (dGan === "신" && pos.char === "자") shinsals.push(`문창귀인(${pos.name})`);
                if (dGan === "임" && pos.char === "인") shinsals.push(`문창귀인(${pos.name})`);
                if (dGan === "계" && pos.char === "묘") shinsals.push(`문창귀인(${pos.name})`);
            }
        });

        jiPositions.forEach(pos => {
            if (pos.char && pos.char !== "-") {
                if (dGan === "갑" && pos.char === "진") shinsals.push(`금여성(${pos.name})`);
                if (dGan === "을" && pos.char === "사") shinsals.push(`금여성(${pos.name})`);
                if ((dGan === "병" || dGan === "무") && pos.char === "미") shinsals.push(`금여성(${pos.name})`);
                if ((dGan === "정" || dGan === "기") && pos.char === "신") shinsals.push(`금여성(${pos.name})`);
                if (dGan === "경" && pos.char === "술") shinsals.push(`금여성(${pos.name})`);
                if (dGan === "신" && pos.char === "해") shinsals.push(`금여성(${pos.name})`);
                if (dGan === "임" && pos.char === "축") shinsals.push(`금여성(${pos.name})`);
                if (dGan === "계" && pos.char === "인") shinsals.push(`금여성(${pos.name})`);
            }
        });

        const BAEKHO = ["갑진", "을미", "병진", "정축", "무진", "임진", "계축"];
        pillars.forEach(p => {
            if (p.str && BAEKHO.includes(p.str)) shinsals.push(`백호대살(${p.name})`);
        });

        if (dGan === "무" && dJi === "술") shinsals.push("괴강살(일주)");
        if (dGan === "경" && dJi === "진") shinsals.push("괴강살(일주)");
        if (dGan === "경" && dJi === "술") shinsals.push("괴강살(일주)");
        if (dGan === "임" && dJi === "진") shinsals.push("괴강살(일주)");

        if (dGan === "갑" && allJiStr.includes("묘")) shinsals.push("양인살");
        if (dGan === "병" && allJiStr.includes("오")) shinsals.push("양인살");
        if (dGan === "경" && allJiStr.includes("유")) shinsals.push("양인살");
        if (dGan === "임" && allJiStr.includes("자")) shinsals.push("양인살");

        if (allJiStr.includes("술") || allJiStr.includes("해")) shinsals.push("천문성");
        if (allChars.filter(c => ["갑", "신", "묘", "오", "미"].includes(c)).length >= 3) shinsals.push("현침살");

        const uniqueShinsals = Array.from(new Set(shinsals));

        let sortedElems = Object.keys(elemCount).sort((a,b) => elemCount[b] - elemCount[a]);
        let maxElem = sortedElems[0];
        let maxCount = elemCount[maxElem];
        let zeroElems = Object.keys(elemCount).filter(e => elemCount[e] === 0);

        const visibleTenGods = tenGods.filter(item => item.label && item.label !== "-").map(item => `${item.position}의 ${stemText(item.char)}에는 ${tenGodText(item.label)} 기운`).join(', ');
        const hiddenDescription = hiddenStems.filter(item => item.stems.length > 0).map(item => `${item.position} ${branchText(item.branch)}에는 ${item.stems.map(stemText).join(', ')}의 기운이 감추어져 있소`).join(', ');
        const stageDescription = twelveStages.filter(item => item.stage !== "-").map(item => `${item.position} ${branchText(item.branch)}의 ${item.stage}`).join(', ');
        const stageMeaning = twelveStages.filter(item => item.stage !== "-").map(item => `${item.position} ${branchText(item.branch)}의 ${item.stage}은(는) ${TWELVE_STAGE_MEANINGS[item.stage]}`).join('\n');
        const shinsalMeaning = uniqueShinsals.map(item => {
            const baseName = SHINSAL_MEANINGS[item] ? item : item.split('(')[0];
            const location = item.includes('(') ? item.slice(item.indexOf('(')) : '';
            const meaning = SHINSAL_MEANINGS[baseName] || '특정 상황에서 성향을 강하게 드러내는 보조 기운';
            return `${baseName}${location}은 ${meaning}을 뜻하오. 이 명식에서는 ${location ? `${location.slice(1, -1)} 자리에서` : '전체 흐름에서'} 드러나므로, ${baseName === '장성살' ? '주도권을 잡을 때 책임까지 함께 맡는 성향' : baseName === '목욕' ? '감각과 표현이 풍부해지는 성향' : '상황에 따라 장점과 주의점이 함께 드러나는 성향'}으로 살피는 것이 옳소.`;
        }).join('\n');
        const tenGodMeaning = tenGods.filter(item => item.label && item.label !== '-').map(item => `${item.position}의 ${stemText(item.char)} ${tenGodText(item.label)}은 ${TEN_GOD_MEANINGS[item.label]}을 뜻하오`).join('\n');
        const patternText = tenGodText(pattern);
        const dayStemText = stemText(dGan);
        const dayBranchText = branchText(dJi);
        const usefulText = `${usefulElements[0]}(${ELEMENT_HANJA[usefulElements[0]]})과 ${usefulElements[1]}(${ELEMENT_HANJA[usefulElements[1]]})`;
        const daeunFlow = daeun.periods.slice(0, 4).map(period => `${period.ageStart}세 무렵부터 ${period.ganji}`).join(', ');
        const dayMasterImage = {
            "갑": "곧게 뻗은 큰 나무", "을": "유연하게 뻗어가는 넝쿨", "병": "세상을 비추는 태양", "정": "어둠을 밝히는 등불",
            "무": "넓고 묵직한 산과 언덕", "기": "생명을 품는 기름진 들판", "경": "단단하게 벼린 쇠", "신": "차갑고 섬세하게 제련된 보석",
            "임": "끝을 가늠하기 어려운 큰 강과 바다", "계": "조용히 스며드는 맑은 빗물"
        }[dGan];
        const elementNarrative = [
            `목(木)은 ${elemCount['목']}개입니다. 목은 씨앗이 땅을 뚫고 올라오듯 성장과 시작, 목표를 향해 방향을 세우는 힘입니다. ${elemCount['목'] >= 2 ? '목의 기세가 충분하므로 새로운 일을 두려워하기보다 먼저 판을 짜고 사람과 기회를 연결하는 추진력이 살아 있습니다. 다만 방향이 너무 많아지면 한 가지를 끝까지 키우기 전에 다음 가능성으로 옮겨갈 수 있으므로, 시작한 일에 마감과 결실의 기준을 세우는 것이 중요합니다.' : '목이 약하므로 장기적인 계획을 세우고 관계와 기회를 천천히 넓히는 힘을 의식적으로 키울 필요가 있습니다. 작은 시작을 기록하고 매일 조금씩 확장하는 습관이 부족한 목의 기운을 보완해 줍니다.'}`,
            `화(火)는 ${elemCount['화']}개입니다. 화는 마음속에 있는 생각을 밖으로 드러내고 사람들의 시선을 모으는 열정과 표현의 불꽃입니다. ${elemCount['화'] >= 2 ? '화가 강하면 말과 행동에 온기가 있고 분위기를 움직이는 힘이 큽니다. 성과를 빠르게 만들어내는 장점이 있지만, 감정이 달아오른 순간의 결정이 오래 남을 수 있으니 중요한 선택에는 하루의 간격을 두는 지혜가 필요합니다.' : '화가 약하면 실력과 성과가 있어도 그것을 세상에 알리는 속도가 늦을 수 있습니다. 발표, 운동, 햇빛, 따뜻한 사람들과의 교류처럼 자신을 밖으로 꺼내는 활동이 잠재력을 현실의 결과로 바꾸는 데 도움이 됩니다.'}`,
            `토(土)는 ${elemCount['토']}개입니다. 토는 모든 기운이 머물러 결과로 쌓이는 땅이며 현실감, 책임감, 인내와 생활의 기반을 뜻합니다. ${elemCount['토'] >= 2 ? '토가 두터워 쉽게 흔들리지 않는 끈기와 실무 감각이 있습니다. 한 번 맡은 일을 끝까지 책임지는 신뢰를 주지만, 남의 문제까지 자신의 책임처럼 품거나 걱정을 오래 저장하면 마음이 무거워질 수 있습니다. 책임질 것과 내려놓을 것을 구분해야 토의 장점이 빛납니다.' : '토가 약하면 생각과 재능은 있어도 일정한 루틴과 마무리의 힘이 부족하게 느껴질 수 있습니다. 수면, 식사, 일정 관리처럼 반복되는 생활의 틀을 단단히 만드는 것이 큰 운을 담아내는 그릇이 됩니다.'}`,
            `금(金)은 ${elemCount['금']}개입니다. 금은 복잡한 것에서 핵심을 골라내는 판단력, 기준을 세우는 냉정함, 끝맺음과 완성도의 기운입니다. ${elemCount['금'] >= 2 ? '금의 힘이 뚜렷해 불필요한 것을 정리하고 문제의 약점을 정확히 짚는 능력이 강합니다. 이 날카로움이 자신과 타인을 향한 지나친 평가가 되지 않도록, 완벽함보다 개선의 방향을 기준으로 삼으면 사람을 살리는 판단력이 됩니다.' : '금이 약할 때는 타인의 요구와 분위기에 맞추느라 자신의 기준을 뒤로 미룰 수 있습니다. 거절해야 할 것은 거절하고, 해야 할 일의 우선순위를 숫자로 정하는 연습이 삶의 선명도를 높여 줍니다.'}`,
            `수(水)는 ${elemCount['수']}개입니다. 수는 보이지 않는 정보를 읽는 직관, 깊이 생각하는 지혜, 말과 관계가 흐르는 소통의 기운입니다. ${elemCount['수'] >= 2 ? '수의 흐름이 살아 있어 관찰력이 좋고 상황의 이면을 빠르게 읽으며, 정해진 방식이 막히면 다른 길을 찾는 유연성이 있습니다. 다만 생각이 깊어질수록 결정을 미루거나 감정을 안으로만 흘려보낼 수 있으므로, 떠오른 통찰을 글과 행동으로 꺼내는 과정이 필요합니다.' : '수의 기운이 약하므로 충분한 휴식과 혼자 생각할 시간이 부족하면 판단력이 쉽게 소진될 수 있습니다. 조용한 산책, 기록, 깊이 있는 대화처럼 마음의 물길을 회복하는 시간이 새로운 해답을 가져옵니다.'}`
        ].join('\n\n');
        const practicalReading = `${ELEMENT_HANJA[ELEMENTS[dGan]] ? `${ELEMENTS[dGan]}(${ELEMENT_HANJA[ELEMENTS[dGan]]})` : ELEMENTS[dGan]} 일간을 중심으로 보면, ${patternText}의 장점은 자신의 방식으로 기준을 세우고 그것을 현실의 결과로 연결하는 데 있소. 반대로 주변의 기대를 모두 맞추려 하거나 한 번에 너무 많은 일을 책임지면 원국의 균형이 흐트러질 수 있소. 일을 선택할 때는 단순히 편하고 익숙한가보다 ${usefulElements[0]}(${ELEMENT_HANJA[usefulElements[0]]})과 ${usefulElements[1]}(${ELEMENT_HANJA[usefulElements[1]]})의 흐름을 살릴 수 있는가를 기준으로 삼는 것이 좋소. 사람을 대할 때도 즉각적인 호감이나 부담감만으로 결론 내리기보다 서로의 역할과 경계를 먼저 분명히 하면 장점은 오래가고 소모는 줄어들 것이오.`;
        const elementBalance = `목 ${elemCount['목']}개, 화 ${elemCount['화']}개, 토 ${elemCount['토']}개, 금 ${elemCount['금']}개, 수 ${elemCount['수']}개가 서로 생하고 극하며 전체 흐름을 만듭니다. ${maxElem} 기운이 중심을 잡고 ${zeroElems.length ? `${zeroElems.join(', ')}의 빈자리는 의식적인 보완이 필요합니다.` : '다섯 기운이 모두 존재해 서로 순환할 바탕이 있습니다.'}`;
        const elementOverview = `목 ${elemCount['목']}개는 성장과 방향, 화 ${elemCount['화']}개는 표현과 열정, 토 ${elemCount['토']}개는 현실과 책임, 금 ${elemCount['금']}개는 기준과 결단, 수 ${elemCount['수']}개는 직관과 흐름을 나타냅니다. ${maxElem}이 중심을 이루며 ${zeroElems.length ? `${zeroElems.join(', ')}의 빈자리는 생활 속에서 보완할 부분입니다.` : '다섯 기운이 서로 이어질 바탕도 갖추고 있습니다.'}`;
        const chartText = `${pillarText(yGan, yJi)}년 ${pillarText(mGan, mJi)}월 ${pillarText(dGan, dJi)}일${tGan !== '-' ? ` ${pillarText(tGan, tJi)}시` : ''}`;
        const healthElementDetails = [
            `목 ${elemCount['목']}개는 간·근육의 활력과 연결해 보며, 부족하면 스트레칭과 규칙적인 활동을 챙기고 과하면 긴장을 풀어주는 것이 좋습니다.`,
            `화 ${elemCount['화']}개는 심혈관 활력과 수면 리듬의 상징으로 보며, 부족하면 햇빛과 가벼운 유산소 운동을, 과하면 과로와 흥분을 줄여야 합니다.`,
            `토 ${elemCount['토']}개는 소화와 생활 안정의 이미지로 보며, 과하면 생각과 부담을 오래 쌓지 않도록 식사와 휴식 시간을 지켜야 합니다.`,
            `금 ${elemCount['금']}개는 호흡과 피부, 경계의 감각과 연결해 보며, 부족하면 생활 기준을 세우고 과하면 긴장과 완벽주의를 완화해야 합니다.`,
            `수 ${elemCount['수']}개는 회복력과 수면, 신장 계통의 전통적 상징으로 보며, 부족하면 수분과 휴식을 챙기고 과하면 생각을 몸의 활동으로 풀어야 합니다.`
        ].join('\n');
        const personalityReport = `${name}님은 ${dayMasterImage}처럼 ${ELEMENTS[dGan]}의 본질을 지닌 ${pillarText(dGan, dJi)} 일주이오. ${branchText(dJi)}의 환경은 일간의 힘을 ${strength.deukji ? '받쳐 주는 뿌리' : '쉽게 흔들릴 수 있는 외부 환경'}로 작용하오. ${practicalReading}\n\n${elementBalance}\n\n[성격의 강점]\n${strength.deukse ? '자신이 가진 생각과 재능을 실제 행동으로 옮길 수 있는 추진력이 있소.' : '혼자 깊이 관찰하고 준비한 뒤 움직이는 신중함이 있소.'} ${strength.deukji ? '어려운 상황에서도 쉽게 중심을 잃지 않고 버티는 힘이 있소.' : '환경에 민감하기 때문에 상대의 마음과 분위기를 섬세하게 읽는 장점이 있소.'} ${pattern === '상관' || pattern === '식신' ? '새로운 방식으로 문제를 풀고 자신의 결과물을 만들어내는 창의성도 강점이오.' : pattern === '정관' || pattern === '편관' ? '책임을 회피하지 않고 목표와 규칙을 현실의 성과로 바꾸는 신뢰감이 장점이오.' : '배운 것을 자기 방식으로 소화해 전문성으로 만드는 힘이 장점이오.'}\n\n[성격의 주의점]\n반대로 ${strength.status === '신강' ? '자신의 판단이 맞다고 확신한 뒤 타인의 속도나 사정을 기다리지 못할 때가 있을 수 있소.' : '주변의 기대를 먼저 살피느라 자신의 욕구와 기준을 뒤로 미룰 때가 있을 수 있소.'} 마음속에서 이미 결론을 내린 뒤 설명을 생략하면 차갑거나 고집스럽게 보일 수 있으므로, 결론뿐 아니라 그 과정과 감정도 말로 나누는 것이 관계에 도움이 되오. ${visibleTenGods || '시간을 제외한 천간의 십성'}은 겉으로 드러나는 사고와 행동의 방향을 보여주고, 지장간에는 ${hiddenDescription} 가까운 사람만 알아차리는 내면의 재능과 반응이 담겨 있소.\n\n[십성이 보여주는 나]\n${tenGodMeaning || '태어난 시간을 제외한 십성 흐름을 중심으로 해석하오.'}\n\n자신의 속도를 믿되 모든 것을 혼자 감당하려는 습관만 조절하면, 날카로운 판단력과 섬세한 감각이 사람을 밀어내는 힘이 아니라 신뢰를 쌓는 능력으로 바뀔 수 있소.`;
        const loveReport = `애정운은 일지 ${dJi}와 그 안의 지장간 ${HIDDEN_STEMS[dJi].join(', ')}을 중심으로 읽습니다. ${dJi}에 담긴 기운은 가까운 관계에서 ${ELEMENTS[dJi]}의 방식으로 반응하게 하며, ${strength.deukji ? '관계 안에서도 자신의 중심을 잃지 않는 힘' : '상대의 분위기와 말에 영향을 많이 받는 섬세함'}으로 나타납니다. ${tenGods.filter(item => item.position === '일지')[0]?.labels?.join(', ') || '일지의 십성'}의 기질 때문에 마음을 표현할 때도 단순한 호감보다 신뢰와 행동의 일관성을 중요하게 보는 편입니다.\n\n좋은 인연은 ${usefulElements.join('과 ')}의 기운처럼 ${usefulElements[0]}의 성장성과 ${usefulElements[1]}의 안정감을 함께 주는 사람입니다. 관계가 깊어질수록 상대를 시험하거나 혼자 결론을 내리기보다 원하는 것을 구체적인 말로 전달해야 오해가 줄어듭니다. 결혼운은 한 번의 강한 끌림보다 생활 리듬, 책임 분담, 서로의 독립성을 존중할 수 있는지가 더 중요하게 작용합니다. 2026년 병오년에는 감정과 만남의 속도가 빨라질 수 있으므로, 빠른 확신보다 시간을 두고 상대의 태도를 확인하는 것이 좋습니다.`;
        const moneyReport = `재물운은 ${dGan} 일간이 감당할 수 있는 현실의 크기와 재성의 흐름으로 살펴봅니다. 원국의 ${elementBalance} 구조에서 돈은 단순히 많이 버는 것보다 어떤 방식으로 벌고 어디에 쌓아두는지가 핵심입니다. ${elemCount['토'] >= 2 ? '토 기운의 책임감은 자산을 쌓는 힘이지만, 가족이나 주변의 부담까지 떠안아 지출이 커지지 않도록 경계를 세워야 합니다.' : '토 기운이 많지 않으므로 수입과 지출을 눈에 보이게 기록하고 자동 저축처럼 구조를 만드는 것이 도움이 됩니다.'}\n\n${visibleTenGods || '드러난 십성'}의 흐름은 기회를 포착하는 방식과 연결됩니다. 재물은 한 번의 승부보다 ${usefulElements[0]}과 ${usefulElements[1]}의 장점을 살려 전문성, 신뢰, 반복 가능한 수입원으로 바꿀 때 오래갑니다. 2026년 병오년은 ${currentYearRelation.relationToDayMaster} 기운이 움직이므로 제안과 활동이 늘어날 수 있지만, 충동적인 투자와 과도한 확장은 피하고 계약 조건과 현금 흐름을 먼저 확인해야 합니다.`;
        const healthReport = `건강운은 오행의 균형을 의학적 진단으로 단정하는 것이 아니라 생활 리듬을 점검하는 참고로 봅니다. ${elementBalance}\n\n${healthElementDetails}\n\n현재 원국에서는 ${zeroElems.length ? `${zeroElems.join(', ')} 기운의 공백이 있어 그와 연결된 생활 영역을 우선 점검하는 편이 좋습니다.` : '다섯 오행이 모두 있어 특정 기운의 공백보다 과로와 불균형을 조심하는 편이 중요합니다.'} ${elemCount['화'] === 0 ? '화가 비어 있어 활동량, 체온 관리, 햇빛과 규칙적인 수면으로 몸의 순환을 깨우는 습관이 중요합니다.' : '화의 기운이 있어도 무리하게 몰아붙이면 소진으로 이어질 수 있으므로 활동과 회복의 간격을 두어야 합니다.'} ${elemCount['수'] <= 1 ? '수 기운이 약한 편이므로 충분한 수면과 조용히 회복하는 시간을 확보해야 합니다.' : '수 기운의 관찰력은 좋지만 생각을 오래 끌지 않도록 몸을 움직여 긴장을 풀어주는 것이 좋습니다.'}\n\n용신 ${usefulElements[0]}과 희신 ${usefulElements[1]}을 생활로 옮긴다면 ${usefulElements[0]}에 해당하는 활동과 ${usefulElements[1]}에 해당하는 휴식·환경을 꾸준히 반복하는 방식이 적절합니다. 다만 특정 장기나 질환을 사주만으로 판단할 수는 없으며, 불편한 증상이나 지속되는 변화는 운세 해석보다 의료 전문가의 진료를 우선해야 합니다.`;
        const careerReport = `취업과 직업운에서는 ${pattern}격의 방향성과 십성의 쓰임을 함께 봅니다. ${pattern}은(는) ${pattern === '정관' ? '규칙과 조직 안에서 책임을 맡고 신뢰를 쌓는 능력' : pattern === '편관' ? '경쟁과 압박 속에서 문제를 해결하는 능력' : pattern === '식신' || pattern === '상관' ? '아이디어와 표현을 결과물로 만드는 능력' : pattern === '정재' || pattern === '편재' ? '자원과 사람을 움직여 현실적인 성과를 만드는 능력' : '배우고 분석해 자신만의 전문성을 만드는 능력'}으로 드러납니다. ${visibleTenGods || '천간의 십성'}이 보여주는 방식대로 자신의 강점을 설명할 수 있어야 면접과 협업에서 설득력이 생깁니다.\n\n${elementBalance} 취업을 준비할 때는 부족한 오행을 약점으로만 보지 말고, ${usefulElements[0]}과 ${usefulElements[1]}의 장점을 직무 선택에 연결하세요. 2026년에는 활동 반경을 넓히는 시도가 유리하지만, 여러 곳에 흩어지기보다 한 분야의 결과물과 경력을 선명하게 쌓는 전략이 좋습니다.`;
        const temperamentReport = `사주에 나타난 기질은 신살과 12운성, 지장간이 겹쳐지며 입체적으로 드러나오. ${uniqueShinsals.length ? `${uniqueShinsals.join(', ')}이 포착되어 ${name}님은 특정 상황에서 남들이 놓치는 기회를 감지하거나 반응의 강도가 높아질 수 있소.` : '뚜렷하게 반복되는 신살은 적지만 원국의 오행 균형 자체가 성향의 중심을 이루오.'}\n\n[신살의 뜻과 작용]\n${shinsalMeaning || '현재 뚜렷하게 포착된 신살은 없소.'}\n\n[12운성의 뜻과 작용]\n${stageMeaning || '태어난 시간을 제외한 지지만 산출되오.'}\n\n지지 속에 감추어진 ${hiddenDescription}은 겉으로 보이는 성격 뒤에 잠재된 재능과 반응을 보여주오. 신살은 정해진 길흉이 아니라 이미 가진 성향이 특정 환경에서 어떻게 드러나는지를 알려주는 보조 신호요. 강한 신살은 과신하지 않고 재능으로 쓰며, 불편한 신살은 두려워하기보다 반복되는 상황을 기록해 대응 방식을 바꾸는 것이 좋소.`;
        const detailExpansions = {
            personality: `성격을 조금 더 깊이 들여다보면, ${name}님은 처음부터 모든 모습을 드러내기보다 상황을 관찰하면서 자신이 움직일 때와 멈출 때를 구분하는 편입니다. 이것은 우유부단함이라기보다 손해와 가능성을 빠르게 비교하는 감각에 가깝습니다. 다만 머릿속에서 정리한 판단을 말로 설명하는 과정을 건너뛰면 주변에서는 마음이 닫혀 있다고 오해할 수 있습니다. 중요한 관계에서는 결론을 전달하기 전에 왜 그렇게 느꼈는지 한 문장만 덧붙여도 훨씬 부드러운 인상을 남길 수 있습니다.\n\n강점은 압박이 생겼을 때 오히려 핵심을 찾는 능력입니다. ${strength.deukji ? '버티는 힘이 뿌리에 있어 한 번 결정한 일은 쉽게 포기하지 않습니다.' : '환경을 세밀하게 읽는 힘이 있어 혼란스러운 상황에서도 분위기와 사람의 의도를 감지합니다.'} 약점은 그 강점이 과해질 때 생깁니다. 책임감이 지나치면 모든 일을 혼자 해결하려 하고, 예민한 판단력이 과해지면 시작하기 전에 부족한 점부터 찾게 됩니다. 완벽하게 준비된 뒤 움직이기보다 중간 결과를 공유하고 도움을 요청하는 것이 성격의 장점을 더 크게 살리는 방법입니다.`,
            love: `연애에서 ${name}님이 원하는 것은 단순히 자주 연락하는 관계보다 마음을 놓을 수 있는 일관성입니다. 말이 화려해도 행동이 달라지면 금방 거리를 두게 되고, 반대로 표현이 서툴러도 약속을 지키고 생활 속에서 배려하는 사람에게는 시간이 갈수록 마음을 열 수 있습니다. ${strength.deukji ? '자신의 중심이 비교적 분명하므로 상대에게 휩쓸리기보다 서로의 생활을 존중하는 관계가 잘 맞습니다.' : '상대의 표정과 말투에 민감할 수 있으므로 혼자 의미를 확대 해석하기보다 확인하는 대화가 필요합니다.'}\n\n갈등이 생겼을 때의 장점은 문제의 본질을 빠르게 알아채는 것이고, 주의할 점은 이미 마음속에서 결론을 내린 뒤 상대에게 설명할 기회를 적게 주는 것입니다. 서운함을 참았다가 한꺼번에 말하기보다 그날 느낀 감정을 짧게 표현하면 관계가 오래 안정됩니다. 결혼 후에는 애정만큼 역할 분담과 경제관념, 혼자 있는 시간의 보장이 중요합니다. ${usefulElements[0]}과 ${usefulElements[1]}의 기운을 가진 사람처럼 함께 성장하면서도 서로의 영역을 존중하는 인연이 좋은 배우자상으로 읽힙니다.`,
            money: `재물에서 가장 중요한 장점은 돈의 흐름을 자신의 실력과 연결할 수 있다는 점입니다. 한 번의 행운을 기다리기보다 잘하는 일을 반복 가능한 서비스나 결과물로 만들 때 수입의 안정성이 높아집니다. ${strength.status === '신강' ? '자신감과 추진력이 강해 기회를 잡는 속도는 빠르지만, 확신이 커질수록 위험을 작게 보는 경향을 경계해야 합니다.' : '신중하게 확인하는 힘이 있어 큰 실수를 줄일 수 있지만, 지나치게 안전한 선택만 하면 좋은 기회를 놓칠 수 있습니다.'}\n\n돈을 쓰는 방식에서는 관계와 책임이 변수로 작용할 수 있습니다. 주변 사람을 돕는 마음이 크더라도 빌려주는 돈과 선물, 공동 지출의 기준을 미리 정해두는 것이 좋습니다. 투자나 이직처럼 큰 결정을 할 때는 기대 수익보다 최악의 경우 감당할 수 있는지를 먼저 확인해야 합니다. 2026년에는 활동과 제안이 늘어날 수 있지만, 여러 기회를 동시에 벌이는 것보다 하나의 전문성을 가격과 계약으로 명확히 만드는 편이 장기적으로 유리합니다.`,
            health: `오행으로 보는 건강의 장점은 현재 어떤 생활 리듬이 나를 살리고 소모시키는지 점검할 수 있다는 점입니다. ${elemCount['목'] >= 2 ? '목의 활력이 있어 몸을 움직이기 시작하면 회복 속도가 좋아질 수 있지만, 긴장된 상태로 오래 버티지 않도록 목과 어깨를 자주 풀어주는 것이 좋습니다.' : '목이 약하므로 오래 앉아 있는 생활보다 가벼운 산책과 전신 스트레칭을 일정하게 반복하는 것이 도움이 됩니다.'} ${elemCount['토'] >= 2 ? '토가 두터운 편은 소화와 생활 안정이 장점이 될 수 있지만, 스트레스를 먹는 일이나 참는 일로 처리하지 않도록 주의해야 합니다.' : '토가 약한 편은 식사와 수면 시간이 흔들릴 때 컨디션 변화가 커질 수 있어 규칙성이 특히 중요합니다.'}\n\n${elemCount['금'] >= 2 ? '금의 정리하는 힘은 몸 상태를 관리하고 나쁜 습관을 끊는 데 도움이 되지만, 지나친 긴장과 완벽주의는 호흡을 얕게 만들 수 있습니다.' : '금이 약하면 경계를 세우는 일이 늦어질 수 있으므로 과로 신호를 무시하지 말고 쉬는 시간을 먼저 일정에 넣으셔야 합니다.'} 건강에서 가장 조심할 부분은 특정 질환을 예언하는 것이 아니라, 불편함을 참고 계속 밀어붙이는 패턴입니다. 반복되는 통증이나 수면·소화·호흡의 변화가 있다면 사주보다 의료진의 검진을 우선하시고, 여기의 내용은 생활을 돌아보는 참고로 활용해 주세요.`,
            career: `직업을 선택할 때 ${name}님에게 중요한 것은 남들이 좋다고 하는 직업보다 자신의 강점이 매일 사용되는 자리인지 확인하는 것입니다. ${pattern === '정관' ? '정관의 질서는 조직과 제도 안에서 책임을 맡고 신뢰를 쌓는 일과 잘 맞습니다. 업무 기준이 분명하고 성장 경로가 있는 환경에서 실력이 안정적으로 드러날 수 있습니다.' : pattern === '편관' ? '편관의 긴장감은 위기 대응, 경쟁, 문제 해결이 필요한 자리에서 강점이 됩니다. 다만 지나치게 통제적인 조직에서는 능력보다 스트레스가 먼저 커질 수 있습니다.' : pattern === '식신' || pattern === '상관' ? '식상은 아이디어와 표현을 실제 결과물로 만드는 힘입니다. 기획, 콘텐츠, 교육, 디자인, 영업처럼 결과가 눈에 보이는 일이 동기를 살려줍니다.' : '인성과 재성의 흐름은 배우고 정리한 것을 실무와 성과로 연결하는 힘입니다. 전문성을 쌓을수록 경력의 가치가 커지는 분야가 유리합니다.'}\n\n면접에서는 자신이 열심히 했다는 말보다 어떤 문제를 발견했고 어떻게 해결했으며 결과가 무엇이었는지를 구체적으로 말하는 것이 좋습니다. 협업에서는 혼자 빠르게 끝내는 능력뿐 아니라 다른 사람이 따라올 수 있도록 과정을 공유하는 능력이 중요합니다. 2026년에는 새로운 제안을 검토할 수 있지만, 직함이나 단기 보상만 보지 말고 배울 수 있는 기술, 함께 일할 사람, 다음 경력으로 이어질 기록이 남는지를 기준으로 선택하시면 좋습니다.`,
            temperament: `신살과 12운성은 ${name}님에게 일어날 일을 단정하는 목록이 아니라, 같은 사건을 어떤 방식으로 경험하는지 보여주는 지도입니다. 예를 들어 목욕은 단순히 좋다거나 나쁘다는 뜻이 아니라 감각과 표현이 예민해지고 사람의 시선과 관계를 의식하는 단계입니다. 이 기운이 강하게 느껴질 때는 매력과 창의성이 살아나지만, 분위기에 흔들리거나 감정적인 반응을 후회할 수 있으므로 표현하기 전에 한 번 정리하는 습관이 도움이 됩니다. 장성살은 주도권과 승부욕, 책임감이 커져 앞에 나서는 기운입니다. 조직에서 중심 역할을 맡는 장점이 있지만 모든 일을 자기 방식대로 통제하려 하면 관계의 피로가 생길 수 있습니다.\n\n지장간은 겉으로 드러난 천간만으로는 보이지 않는 내면의 층입니다. 연지와 월지에 있는 기운은 가족과 사회 속에서 익힌 반응을, 일지와 시지의 기운은 가까운 관계와 미래의 관심사를 해석하는 재료가 됩니다. 12운성에서 장생과 관대가 나타나는 자리는 시작과 표현의 힘을, 쇠·병·묘처럼 쉬어가는 자리는 혼자 회복하고 경험을 정리하는 힘을 뜻합니다. 따라서 기운이 약해 보이는 운성도 결함이 아니라 속도를 조절하는 능력으로 활용할 수 있습니다. 신살의 강점은 재능으로 쓰고, 주의점은 행동 전에 알아차리는 것, 이것이 ${name}님에게 가장 현실적인 활용법입니다.`
        };
        const detailMinimums = {
            love: `인연을 판단할 때는 상대가 나를 얼마나 강하게 끌어당기는지뿐 아니라, 내 생활을 존중하고 약속을 지키는지를 함께 보셔야 합니다. ${dGan} 일간은 관계 안에서 자신의 방식이 분명한 편이라, 사랑하는 마음이 있어도 지나친 간섭이나 일방적인 희생이 반복되면 빠르게 지칠 수 있습니다. 반대로 감정을 표현하는 방식이 다르다는 이유만으로 마음이 없다고 단정하지 않으시면 좋습니다. 상대에게 필요한 표현과 내가 원하는 배려를 구체적으로 말하는 것이 애정운을 실제 행복으로 바꾸는 열쇠입니다.\n\n결혼을 생각할 때는 감정의 크기보다 갈등을 해결하는 방식, 돈과 가족에 대한 기준, 각자의 혼자 있는 시간을 확인해 보세요. 좋은 배우자는 ${name}님의 장점을 인정하면서도 무조건 맞춰주기만 하는 사람이 아니라, 서로의 약속과 경계를 건강하게 지킬 수 있는 사람입니다. 만남이 시작되거나 관계가 깊어지는 시기에는 서두르기보다 세 번 이상 반복되는 행동을 관찰하면 말보다 정확한 판단을 할 수 있습니다.`,
            money: `재물의 흐름을 안정시키려면 버는 능력과 지키는 습관을 분리해서 살펴야 합니다. ${name}님은 기회를 발견하는 감각이 있더라도, 좋은 기회라는 이유만으로 조건 확인을 생략하면 수입이 늘어도 실제로 남는 것은 적을 수 있습니다. 계약서, 세금, 고정비, 비상금처럼 재미없어 보이는 부분을 먼저 챙기는 것이 오히려 재성의 흐름을 오래 유지하는 방법입니다.\n\n돈과 자존심을 연결하지 않는 것도 중요합니다. 주변 사람에게 능력을 증명하기 위해 무리한 소비를 하거나, 이미 투자한 시간과 비용이 아까워 손실을 더 키우는 선택은 피하셔야 합니다. 월 단위로 꼭 필요한 지출과 선택 가능한 지출을 나누고, 큰돈은 하루 이상 숙려한 뒤 결정해 보세요. ${usefulElements[0]} 용신의 장점인 성장과 ${usefulElements[1]} 희신의 장점인 안정성을 함께 사용할 때, 재물은 일시적인 행운이 아니라 신뢰받는 실력의 결과로 쌓일 수 있습니다.`,
            health: `생활에서 특히 점검할 것은 컨디션이 떨어졌는데도 평소의 의지로 계속 밀어붙이는 습관입니다. 좋은 날에는 활동량이 많아도 괜찮다고 느끼지만, 회복이 늦어지는 순간에는 수면의 질과 식사 시간, 목과 어깨의 긴장, 호흡의 깊이를 차례로 살펴보세요. 몸의 신호를 기록하면 어떤 환경과 감정에서 소모가 커지는지 알 수 있습니다.\n\n건강의 장점은 생활을 규칙적으로 만들었을 때 회복 기반이 빠르게 좋아질 수 있다는 점입니다. 아침의 햇빛, 가벼운 걷기, 충분한 물, 정해진 취침 시간처럼 작고 반복 가능한 방법을 먼저 선택하시고, 갑자기 강한 운동이나 극단적인 식단을 시작하지 않는 편이 좋습니다.`,
            career: `직업에서 성과를 오래 유지하려면 잘하는 일과 소모되는 일을 구분해야 합니다. ${name}님은 문제를 해결하는 능력만큼 문제를 발견하는 감각도 강하게 활용할 수 있으므로, 단순 반복 업무보다는 개선점이 있고 결과를 확인할 수 있는 환경에서 동기가 살아날 가능성이 큽니다. 다만 능력이 있다는 이유로 역할이 계속 추가되면 어느 순간 책임은 커지고 권한은 부족한 상태가 될 수 있습니다. 업무 범위와 마감, 보상을 처음부터 문서로 확인하는 태도가 필요합니다.\n\n취업 준비에서는 사주를 자기소개서의 근거로 쓰기보다 실제 경험의 언어로 번역해야 합니다. 예를 들어 관찰력은 문제를 발견한 사례로, 추진력은 끝까지 완료한 결과로, 섬세함은 오류를 줄인 과정으로 보여주세요. 면접에서 모든 약점을 숨기기보다 현재 보완 중인 방법까지 함께 말하면 신뢰도가 높아집니다. ${usefulElements[0]}과 ${usefulElements[1]}의 기운을 살리는 직무를 고르되, 직장 이름보다 함께 일하는 방식과 성장할 기술을 우선 기준으로 삼으시면 좋습니다.`
        };
        const detailFinals = {
            love: `연애에서 자신의 마음을 지키는 일과 상대에게 마음을 여는 일은 서로 반대가 아닙니다. 오히려 기준을 분명히 말할수록 건강한 인연은 더 오래 남습니다. 연락 빈도, 돈을 쓰는 방식, 가족과의 거리, 다툰 뒤 화해하는 방법처럼 사소해 보이는 생활의 합의가 결혼의 안정성을 결정합니다. 인연이 잘 풀리지 않을 때 자신을 탓하거나 상대를 단정하기보다, 내가 반복해서 선택하는 관계의 패턴을 돌아보시면 다음 만남은 훨씬 달라질 수 있습니다.`,
            money: `재물운을 키우는 실천은 거창한 결심보다 숫자를 외면하지 않는 태도에서 시작됩니다. 매달 순수하게 남는 금액을 확인하고, 기회가 생겼을 때 사용할 자금과 절대 건드리지 않을 안전 자금을 나누어 두세요. 사람의 추천이나 분위기보다 내가 이해할 수 있는 상품과 계약만 선택하고, 모르는 내용은 질문한 뒤 결정하셔야 합니다. 이렇게 쌓은 작은 안정감이 ${dGan} 일간의 재능을 실제 자산으로 바꾸는 기반이 됩니다.`,
            career: `이직이나 취업의 시기를 판단할 때는 불안해서 도망치는 선택인지, 준비된 성장인지 구분해야 합니다. 현재 자리에서 얻을 수 있는 기술과 증거가 충분히 쌓였다면 새로운 환경에 도전할 수 있지만, 단순히 사람이나 감정을 피하기 위한 이동이라면 비슷한 문제가 반복될 수 있습니다. 지원 분야를 좁힌 뒤 포트폴리오와 경력 기술을 한 방향으로 맞추고, 주변의 평가보다 실제 채용 조건과 업무 내용을 확인하는 것이 ${name}님에게 맞는 전략입니다.`
        };
        const detailReports = Object.fromEntries(Object.entries({ personality: personalityReport, love: loveReport, money: moneyReport, health: healthReport, career: careerReport, temperament: temperamentReport }).map(([key, report]) => [key, applyHaoche(`${report}\n\n${detailExpansions[key]}\n\n${detailMinimums[key] || ''}\n\n${detailFinals[key] || ''}`)]));

        Object.keys(detailReports).forEach(key => {
            detailReports[key] = formatDetailNarrative(detailReports[key], dGan, dJi);
            detailReports[key] = detailReports[key].replace(/2026년 병오년/g, `${currentYear}년 ${currentYearText}년`).replace(/2026년/g, `${currentYear}년`);
        });
        let reportText = `[${name}님 명리학 정밀 분석 보고서]\n\n`;
        reportText += `■ 일주와 격국을 중심으로 본 기본 기질\n${name}님의 사주는 ${chartText}로 이루어져 있소. 그 중심에 선 ${stemText(dGan)} 일간은 ${dayMasterImage}에 비유할 수 있소. 일지 ${branchText(dJi)}의 자리가 그 아래를 이루므로, ${pillarText(dGan, dJi)} 일주는 ${dayMasterImage}의 본질이 ${branchText(dJi)}의 환경을 만나 드러나는 모습이라 할 수 있소. 겉으로 보이는 성격 하나만으로 단정하기보다는, 마음속 본질과 그것을 둘러싼 환경이 어떻게 맞물리는지 살펴야 하오.\n\n월지 ${branchText(mJi)}의 지장간 가운데 본기인 ${stemText(HIDDEN_STEMS[mJi][HIDDEN_STEMS[mJi].length - 1])}가 ${tenGodText(pattern)}을 이루오. 이 격국은 ${pattern === '정관' ? '규칙과 책임, 사회의 기준을 현실에서 구현하려는 힘' : pattern === '편관' ? '압박과 경쟁을 돌파하며 스스로 단련되는 힘' : pattern === '정재' || pattern === '편재' ? '현실의 성과와 자원을 관리하고 움직이는 힘' : pattern === '식신' || pattern === '상관' ? '자신의 재능과 표현을 세상에 내놓는 힘' : '배움과 관찰로 내면의 기준을 세우는 힘'}으로 읽을 수 있소. ${strength.status}에 가까운 ${strength.score}점 구조이며, ${strength.deukryeong ? '계절의 도움을 받고' : '계절의 도움은 약하나'}, ${strength.deukji ? '일지와 지지에 뿌리를 두고' : '뿌리가 약한 가운데'} ${strength.deukse ? '천간의 지원도 일부 갖춘' : '천간의 지원이 제한된'} 명식이오. 그러므로 ${usefulElements[0]}(${ELEMENT_HANJA[usefulElements[0]]}) 기운을 용신으로 삼아 균형을 회복하고, ${usefulElements[1]}(${ELEMENT_HANJA[usefulElements[1]]}) 기운을 희신으로 보태는 것이 좋소. 용신은 부족한 것을 무조건 많이 채운다는 뜻이 아니라, 이미 가진 힘이 막히지 않고 좋은 결과로 흘러가게 하는 조절점이오.\n\n`;
        reportText += `■ 오행과 십성에서 드러나는 성향\n${elementOverview}\n\n천간에는 ${visibleTenGods}의 흐름이 자리하오. 이는 사고방식과 관계 맺기, 현실적인 선택에서 ${patternText}의 색채를 더하는 바요. 지지 속에는 ${hiddenDescription}. 그러므로 겉으로 보이는 모습보다 내면에 잠재된 재능과 반응이 더 풍부하다고 보오. 다섯 오행은 서로 생하고 극하면서 선택의 속도와 감정의 깊이를 함께 만드오. ${practicalReading}\n\n`;
        reportText += `■ 신살과 12운성이 만드는 작용\n${uniqueShinsals.length ? `현재 원국에서 ${uniqueShinsals.join(', ')}이(가) 포착됩니다. ` : '뚜렷하게 중복되는 신살은 많지 않습니다. '}신살은 이름만으로 길흉을 단정하는 표식이 아니라, 특정 상황에서 성향이 어떤 방식으로 드러나는지를 보여주는 보조 신호입니다. ${shinsalMeaning || '현재 뚜렷하게 포착된 신살은 없습니다.'}\n\n12운성은 일간의 기운이 각 지지에서 태어나고 자라고 왕성해졌다가 쉬어가는 과정을 보여줍니다. ${stageMeaning || '시간을 제외한 지지의 운성만 산출됩니다.'} 신살과 운성은 단독으로 판단하지 않고 오행과 십성, 실제 생활의 반복 패턴을 함께 보아야 합니다.\n\n`;
        reportText += `■ 대운과 2026년의 흐름\n대운은 ${daeun.direction}으로 ${daeun.startAge}세 전후에 시작하며, ${daeunFlow}의 순서로 흐릅니다. 현재 나이 ${daeun.currentAge}세에는 ${daeun.active ? `${daeun.active.ganji} 대운(${daeun.active.ageStart}~${daeun.active.ageEnd}세)` : '대운 전환기'}의 영향을 받고 있습니다. 대운은 한 해의 기분처럼 지나가는 신호가 아니라 10년 동안 반복해서 만나는 사람, 일, 책임의 무대에 가깝습니다. 지금의 대운에서 무엇이 편하고 무엇이 계속 막히는지를 기록하면 다음 흐름을 준비하는 실질적인 단서가 됩니다.\n\n2026년 병오년의 병화는 ${dGan} 일간에게 ${currentYearRelation.relationToDayMaster}으로 작용하고, 오화의 열기는 원국의 부족한 화 기운을 자극합니다. 활동과 기회를 넓히는 힘이 들어오는 만큼 모든 제안을 동시에 잡으려 하기보다 오래 남길 한 가지 결과를 정해 집중하는 편이 좋습니다. 말과 감정이 빠르게 달아오르는 순간에는 계약과 관계의 결론을 늦추고, ${usefulElements[0]}과 ${usefulElements[1]}에 해당하는 환경과 습관을 꾸준히 선택하는 것이 이 사주에 맞는 현실적인 방향입니다. 결국 이 명식의 좋은 운은 밖에서 갑자기 떨어지는 행운이라기보다 자신의 날카로운 재능을 꾸준히 다듬어 다른 사람이 신뢰할 수 있는 결과로 바꾸는 과정에서 완성됩니다.`;
        reportText = applyHaoche(reportText);
        reportText = reportText.replace(/2026년 병오년/g, `${currentYear}년 ${currentYearText}년`).replace(/2026년/g, `${currentYear}년`);
        reportText += `\n\n■ 당일 일진(日辰)\n오늘은 ${currentDayText}일(${currentDayRelation.relationToDayMaster})의 기운이 들어오는 날이오. ${ELEMENTS[currentDayBranches[0]]}(${ELEMENT_HANJA[ELEMENTS[currentDayBranches[0]]]})의 흐름이 ${dGan}(${CHEONGAN_HANJA[dGan]}) 일간과 만나는 날이므로, 오늘의 중요한 결정은 평소보다 한 번 더 살피고 ${usefulText}의 균형을 의식하는 것이 좋소.`;

        return res.json({
            success: true,
            saju: {
                yGan, yJi, mGan, mJi, dGan, dJi, tGan, tJi,
                elemCount, shinsals: uniqueShinsals, reportText,
                tenGods, pattern: { name: `${pattern}격`, monthBranchMainQi: HIDDEN_STEMS[mJi][HIDDEN_STEMS[mJi].length - 1] },
                strength, usefulGod: usefulElements[0], favorableGod: usefulElements[1],
                twelveStages, hiddenStems, daeun,
                currentYear: { year: currentYear, ganji: currentYearText, ...currentYearRelation },
                currentDay: { date: todayDateText, ganji: currentDayGanji, ...currentDayRelation, score: dailyScore, fortune: dailyFortune, caution: dailyCaution },
                detailReports
            }
        });
    } catch (err) {
        console.error("서버 연산 에러:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`정밀 만세력 백엔드 서버가 ${PORT}번 포트에서 작동 중입니다.`));