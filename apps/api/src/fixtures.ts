import type { ScriptShot } from "@canvasflow/shared";

/** Mock shot data — "凤回巢" historical drama */
const FIXTURE_FENG: Omit<ScriptShot, "id">[] = [
  {
    index: 1, duration: 4,
    description: "@宋人府死牢 环境展示，@萧宇轩 与 @沈若雪 凄惨落魄的现状。",
    characters: [
      { id: "c1", name: "萧宇轩", desc: "[萧宇轩: 25岁男性, 废太子]" },
      { id: "c2", name: "沈若雪", desc: "[沈若雪: 18岁女性, 昔日白莲花庶妹]" },
    ],
    shotType: "全景", action: "萧宇轩戴着重铜镯坐，沈若雪蜷缩在角落",
    emotion: "绝望，恐惧", sceneTags: "宋人府死牢，干草堆，铁栅栏",
    lighting: "阴暗潮湿，墙上插着忽明忽暗的火把",
    sound: "沉闷的滴水声，铁链拖拽的微弱摩擦声", dialogue: "无", cameraMove: "",
    imagePrompt: "[画面构图：低位仰角，局部构图] + [萧宇轩: 25岁男性, 废太子]",
    videoPrompt: "[缓慢的水平横移追镜] + [沈婉清: 20岁女性]",
    finalPrompt: "", finalPromptStatus: "pending",
  },
  {
    index: 2, duration: 4,
    description: "@沈婉清 身着华贵凤袍，宛如神明降临般走入 @宋人府死牢。",
    characters: [
      { id: "c3", name: "沈婉清", desc: "[沈婉清: 20岁女性, 面容冷艳威严]" },
    ],
    shotType: "中景跟拍转特写", action: "步履从容地走入牢房",
    emotion: "威严，冷酷，睥睨", sceneTags: "牢门，廊院远离",
    lighting: "逆光照耀，凤冠珠帘如流光", sound: "沉稳威严的脚步声",
    dialogue: "无", cameraMove: "",
    imagePrompt: "[画面构图：低位仰角] + [沈婉清: 20岁女性]",
    videoPrompt: "[斯坦尼康跟踪镜头] + [沈婉清: 20岁女性]",
    finalPrompt: "", finalPromptStatus: "pending",
  },
  {
    index: 3, duration: 3.5,
    description: "@萧宇轩 看到 @沈婉清，像抓住救命稻草般扑向栅栏求救。",
    characters: [
      { id: "c1", name: "萧宇轩", desc: "[萧宇轩: 25岁男性, 废太子]" },
    ],
    shotType: "特写", action: "挣扎着冲手向木栅栏",
    emotion: "不可置信，疯狂，祈求", sceneTags: "粗糙的木栅栏，生锈铁链",
    lighting: "火光在他脸上跳动", sound: "铁链碰撞声",
    dialogue: "婉清……婉清你来了！", cameraMove: "",
    imagePrompt: "[手持摇影感镜头，快速向前推入]",
    videoPrompt: "[轻微晃动的手持镜头，快速向前推入]",
    finalPrompt: "", finalPromptStatus: "pending",
  },
  {
    index: 4, duration: 3,
    description: "@沈若雪 跌向栏杆，痛哭涕淋淋地向 @沈婉清 求饶。",
    characters: [
      { id: "c2", name: "沈若雪", desc: "[沈若雪: 18岁女性]" },
    ],
    shotType: "近景", action: "在地上匍匐，死死抓住栏杆痛哭",
    emotion: "声泪俱下", sceneTags: "肮脏的牢房地面",
    lighting: "微弱的余光照亮她面庞", sound: "凄厉的哭腔",
    dialogue: "长姐！长姐我错了！", cameraMove: "",
    imagePrompt: "[画面构图：俯拍角度] + [沈若雪: 18岁女性]",
    videoPrompt: "[镜头慢下移的低角度] + [沈若雪]",
    finalPrompt: "", finalPromptStatus: "pending",
  },
  {
    index: 5, duration: 4.5,
    description: "@沈婉清 缓缓踱步，眼神冰冷地直视 @萧宇轩。",
    characters: [
      { id: "c3", name: "沈婉清", desc: "[沈婉清: 20岁女性, 面容冷艳威严]" },
      { id: "c1", name: "萧宇轩", desc: "[萧宇轩: 25岁男性, 废太子]" },
    ],
    shotType: "双人过肩镜头", action: "沈婉清靠下身，隔着栅栏平视萧宇轩",
    emotion: "古井无波，充满压制力", sceneTags: "栅栏内外",
    lighting: "逆面打亮冷酷的下额线", sound: "丝绸摩擦声",
    dialogue: "皇兄记忆不太好", cameraMove: "",
    imagePrompt: "[双人入面构图，如同毒蛇逼近] + [沈婉清]",
    videoPrompt: "[极其缓慢的推拉镜头，过肩] + [沈婉清]",
    finalPrompt: "", finalPromptStatus: "pending",
  },
];

/** "夏日初晴晚风" — slice-of-life fixture */
const FIXTURE_SUMMER: Omit<ScriptShot, "id">[] = [
  {
    index: 1, duration: 3,
    description: "雨后的 @小镇街道，阳光穿过云层，@少女 撑着 @透明雨伞 走来。",
    characters: [
      { id: "c1", name: "少女", desc: "十七岁，短发，白衬衫配牛仔裙" },
    ],
    shotType: "全景", action: "收起雨伞，仰头看天",
    emotion: "清新、期待", sceneTags: "外景/小镇街道/雨后",
    lighting: "丁达尔效应", sound: "雨滴滴落声，远处蝉鸣",
    dialogue: "", cameraMove: "",
    imagePrompt: "[全景开场，雨后青石板街道，丁达尔光线]",
    videoPrompt: "[广角开场镜头，缓慢下降摇臂]",
    finalPrompt: "", finalPromptStatus: "pending",
  },
  {
    index: 2, duration: 2,
    description: "@少女 蹲下来看路边水洼中的倒影。",
    characters: [
      { id: "c1", name: "少女", desc: "十七岁，短发，白衬衫配牛仔裙" },
    ],
    shotType: "近景", action: "蹲下，指尖轻触水面",
    emotion: "好奇、童趣", sceneTags: "外景/路边水洼",
    lighting: "自然光，水面反光", sound: "水波声",
    dialogue: "", cameraMove: "",
    imagePrompt: "[低角度近景，水洼边指尖轻触水面]",
    videoPrompt: "[低角度拍摄，微距对焦涟漪扩散]",
    finalPrompt: "", finalPromptStatus: "pending",
  },
  {
    index: 3, duration: 4,
    description: "傍晚，@少女 坐在 @河堤 上，晚风吹起她的头发。",
    characters: [
      { id: "c1", name: "少女", desc: "十七岁，短发，白衬衫配牛仔裙" },
    ],
    shotType: "中景", action: "双腿悬空晃动，闭眼感受晚风",
    emotion: "宁静、自由", sceneTags: "外景/河堤/黄昏",
    lighting: "金色黄昏光", sound: "晚风声，流水声",
    dialogue: "今天的风好舒服啊……", cameraMove: "",
    imagePrompt: "[侧面中景，河堤上少女剪影，橙红色晚霞]",
    videoPrompt: "[侧面轮廓中景，轻柔缓慢向右平移]",
    finalPrompt: "", finalPromptStatus: "pending",
  },
  {
    index: 4, duration: 3,
    description: "@少女 从书包里掏出一台 @胶片相机，对着晚霞按下快门。",
    characters: [
      { id: "c1", name: "少女", desc: "十七岁，短发，白衬衫配牛仔裙" },
    ],
    shotType: "近景", action: "举起相机，按下快门",
    emotion: "专注、珍惜", sceneTags: "外景/河堤/黄昏",
    lighting: "暖光，镜头光晕", sound: "快门咔嚓声",
    dialogue: "", cameraMove: "",
    imagePrompt: "[过肩近景，举起胶片相机对准晚霞]",
    videoPrompt: "[过肩镜头，焦点从相机过渡到晚霞]",
    finalPrompt: "", finalPromptStatus: "pending",
  },
];

export function pickFixture(sourceText: string): Omit<ScriptShot, "id">[] {
  if (/凤回巢|重生|权倾|古风|死牢/.test(sourceText)) return FIXTURE_FENG;
  return FIXTURE_SUMMER;
}
