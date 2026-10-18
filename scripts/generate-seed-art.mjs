// Draws the cute placeholder product pictures (public/images/seed/*.svg).
// Run: node scripts/generate-seed-art.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const INK = '#3A1631'
const OUT = new URL('../public/images/seed/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const S = `stroke="${INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"`

const sparkle = (x, y, s, fill) =>
  `<path d="M${x},${y - s} C${x + s * 0.15},${y - s * 0.15} ${x + s * 0.15},${y - s * 0.15} ${x + s},${y} C${x + s * 0.15},${y + s * 0.15} ${x + s * 0.15},${y + s * 0.15} ${x},${y + s} C${x - s * 0.15},${y + s * 0.15} ${x - s * 0.15},${y + s * 0.15} ${x - s},${y} C${x - s * 0.15},${y - s * 0.15} ${x - s * 0.15},${y - s * 0.15} ${x},${y - s} Z" fill="${fill}"/>`

const heart = (cx, cy, s, fill, extra = '') =>
  `<path d="M${cx},${cy + s * 0.9} C${cx - s * 1.6},${cy - s * 0.2} ${cx - s * 0.6},${cy - s * 1.3} ${cx},${cy - s * 0.45} C${cx + s * 0.6},${cy - s * 1.3} ${cx + s * 1.6},${cy - s * 0.2} ${cx},${cy + s * 0.9} Z" fill="${fill}" ${extra}/>`

const patterns = {
  dots: (c) => `<pattern id="p" width="56" height="56" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r="5" fill="${c}"/><circle cx="42" cy="42" r="5" fill="${c}"/></pattern>`,
  gingham: (c) => `<pattern id="p" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="30" height="60" fill="${c}"/><rect width="60" height="30" fill="${c}"/></pattern>`,
  stripes: (c) => `<pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="16" height="48" fill="${c}"/></pattern>`,
}

function frame({ bg, pattern = 'dots', patternColor = 'rgba(255,255,255,0.55)', shadowY = 760, shadowW = 230, body, title }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img" aria-label="${title}">
<defs>${patterns[pattern](patternColor)}</defs>
<rect width="800" height="1000" fill="${bg}"/>
<rect width="800" height="1000" fill="url(#p)"/>
<ellipse cx="400" cy="${shadowY}" rx="${shadowW}" ry="26" fill="${INK}" opacity="0.12"/>
${body}
${sparkle(150, 190, 34, '#FFFFFF')}${sparkle(660, 260, 24, '#FF4FA0')}${sparkle(640, 860, 30, '#FFFFFF')}${sparkle(170, 820, 18, '#FF4FA0')}
</svg>
`
}

const shine = (d, w = 14) => `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="${w}" stroke-linecap="round" opacity="0.55"/>`

function beadsAlong(p0, p1, p2, n, r, colors) {
  let out = ''
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${colors[i % colors.length]}" stroke="${INK}" stroke-width="4"/>`
  }
  return out
}

function butterfly(x, y, s, fill) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
<ellipse cx="-16" cy="-12" rx="18" ry="14" fill="${fill}" stroke="${INK}" stroke-width="4"/>
<ellipse cx="16" cy="-12" rx="18" ry="14" fill="${fill}" stroke="${INK}" stroke-width="4"/>
<ellipse cx="-12" cy="12" rx="12" ry="10" fill="${fill}" stroke="${INK}" stroke-width="4"/>
<ellipse cx="12" cy="12" rx="12" ry="10" fill="${fill}" stroke="${INK}" stroke-width="4"/>
<rect x="-3" y="-20" width="6" height="40" rx="3" fill="${INK}"/></g>`
}

const art = {
  'satin-bow-cami': frame({
    title: 'Satin Bow Cami', bg: '#E9DDFF', shadowY: 770,
    body: `<path d="M335,250 L318,420 M465,250 L482,420" fill="none" ${S}/>
<path d="M300,420 Q400,455 500,420 L545,720 Q400,755 255,720 Z" fill="#FFC2D9" ${S}/>
${shine('M330,470 Q352,580 318,690')}${shine('M470,500 Q480,560 470,620', 9)}
<g transform="translate(400 445)"><path d="M0,0 C-40,-40 -80,-10 -60,20 C-45,40 -15,15 0,0 Z" fill="#FF4FA0" ${S}/><path d="M0,0 C40,-40 80,-10 60,20 C45,40 15,15 0,0 Z" fill="#FF4FA0" ${S}/><path d="M-6,4 L-26,60 M6,4 L26,60" fill="none" ${S}/><circle r="13" fill="#FF7EB6" ${S}/></g>`,
  }),
  'pleated-tennis-skort': frame({
    title: 'Pleated Tennis Skort', bg: '#FFF0A6', pattern: 'gingham', patternColor: 'rgba(255,255,255,0.45)', shadowY: 735,
    body: `<path d="M285,420 L515,420 L590,690 L210,690 Z" fill="#FFD1E3" ${S}/>
<path d="M330,420 L275,690 M368,420 L338,690 M400,420 L400,690 M432,420 L462,690 M470,420 L525,690" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
<rect x="280" y="370" width="240" height="55" rx="16" fill="#FF9EC7" ${S}/>
<path d="M215,672 L585,672" fill="none" stroke="#FFFFFF" stroke-width="10" opacity="0.8"/>
${shine('M300,470 L265,640', 10)}`,
  }),
  'cloud-knit-cardigan': frame({
    title: 'Cloud Knit Cardigan', bg: '#FFE8F0', shadowY: 760, shadowW: 260,
    body: `<path d="M330,300 L262,322 L190,575 L250,592 L305,450 L305,725 L495,725 L495,450 L550,592 L610,575 L538,322 L470,300 Q400,340 330,300 Z" fill="#D9C7FF" ${S}/>
<path d="M330,300 L400,520 L470,300 Q400,340 330,300 Z" fill="#FFF8F2" ${S}/>
<path d="M400,520 L400,725" fill="none" ${S}/>
<path d="M305,700 L495,700 M196,555 L248,571 M604,555 L552,571" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
<g fill="#FFFFFF" stroke="${INK}" stroke-width="4"><circle cx="420" cy="560" r="11"/><circle cx="420" cy="610" r="11"/><circle cx="420" cy="660" r="11"/></g>
<g fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.7"><path d="M330,380 q8,10 0,20 q-8,10 0,20 q8,10 0,20 q-8,10 0,20 q8,10 0,20"/><path d="M470,560 q8,10 0,20 q-8,10 0,20 q8,10 0,20"/></g>`,
  }),
  'heart-charm-hoops': frame({
    title: 'Heart Charm Hoops', bg: '#FFD1E3', shadowY: 740,
    body: `<path d="M300,330 A100,100 0 1 0 330,335" fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round"/>
<path d="M300,330 A100,100 0 1 0 330,335" fill="none" stroke="#F2C24E" stroke-width="14" stroke-linecap="round"/>
<path d="M500,330 A100,100 0 1 0 530,335" fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round"/>
<path d="M500,330 A100,100 0 1 0 530,335" fill="none" stroke="#F2C24E" stroke-width="14" stroke-linecap="round"/>
<path d="M300,530 L300,575 M500,530 L500,575" fill="none" ${S}/>
${heart(300, 630, 52, '#FF4FA0', S)}${heart(500, 630, 52, '#FF4FA0', S)}
${shine('M282,612 q-6,-14 6,-22', 8)}${shine('M482,612 q-6,-14 6,-22', 8)}`,
  }),
  'sweetheart-baby-tee': frame({
    title: 'Sweetheart Baby Tee', bg: '#FFF0A6', pattern: 'stripes', patternColor: 'rgba(255,255,255,0.5)', shadowY: 735, shadowW: 250,
    body: `<path d="M320,320 Q400,365 480,320 L585,375 L548,470 L500,452 L500,695 L300,695 L300,452 L252,470 L215,375 Z" fill="#FFFFFF" ${S}/>
<path d="M330,326 Q400,372 470,326" fill="none" stroke="#FF9EC7" stroke-width="12" stroke-linecap="round"/>
${heart(400, 545, 62, '#FF4FA0', S)}${shine('M372,520 q-6,-18 12,-28', 9)}
<path d="M300,672 L500,672" fill="none" stroke="#FFD1E3" stroke-width="10"/>`,
  }),
  'pearl-mini-shoulder-bag': frame({
    title: 'Pearl Mini Shoulder Bag', bg: '#E9DDFF', pattern: 'gingham', patternColor: 'rgba(255,255,255,0.45)', shadowY: 720, shadowW: 210,
    body: `${beadsAlong([292, 492], [400, 160], [508, 492], 18, 13, ['#FFFFFF', '#FFF8F2'])}
<rect x="265" y="480" width="270" height="210" rx="44" fill="#FFF8F2" ${S}/>
<path d="M268,500 Q268,482 290,482 L510,482 Q532,482 532,500 Q532,570 400,600 Q268,570 268,500 Z" fill="#FFE8F0" ${S}/>
<circle cx="400" cy="592" r="16" fill="#F2C24E" ${S}/>${shine('M300,620 L300,660', 10)}`,
  }),
  'vintage-lace-slip-dress': frame({
    title: 'Vintage Lace Slip Dress', bg: '#FFE8F0', shadowY: 905, shadowW: 220,
    body: `<path d="M345,230 L330,360 M455,230 L470,360" fill="none" ${S}/>
<path d="M318,360 Q400,392 482,360 L500,500 Q522,700 585,860 Q400,895 215,860 Q278,700 300,500 Z" fill="#F7E4CB" ${S}/>
<path d="M322,372 Q400,404 478,372" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-dasharray="2 14" stroke-linecap="round"/>
<g fill="#FFFFFF" stroke="${INK}" stroke-width="4">${Array.from({ length: 10 }, (_, i) => `<circle cx="${232 + i * 37.5}" cy="${866 + Math.sin(i / 9 * Math.PI) * 10}" r="16"/>`).join('')}</g>
${shine('M335,440 Q350,640 290,820')}${shine('M460,520 Q480,640 500,720', 8)}`,
  }),
  'y2k-butterfly-denim-jacket': frame({
    title: 'Y2K Butterfly Denim Jacket', bg: '#FFF0A6', shadowY: 760, shadowW: 270,
    body: `<path d="M330,300 L258,325 L185,585 L250,602 L305,455 L305,725 L495,725 L495,455 L550,602 L615,585 L542,325 L470,300 Q400,330 330,300 Z" fill="#A9C7EE" ${S}/>
<path d="M330,300 L362,392 L400,330 L438,392 L470,300 Q400,330 330,300 Z" fill="#8FB3E3" ${S}/>
<path d="M400,345 L400,725" fill="none" ${S}/>
<rect x="320" y="440" width="62" height="56" rx="10" fill="#8FB3E3" ${S}/><rect x="418" y="440" width="62" height="56" rx="10" fill="#8FB3E3" ${S}/>
<path d="M305,690 L495,690" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-dasharray="10 10" stroke-linecap="round"/>
${butterfly(352, 590, 1.25, '#FF9EC7')}${butterfly(452, 640, 0.9, '#FFC2D9')}`,
  }),
  'thrifted-mary-jane-platforms': frame({
    title: 'Thrifted Mary Jane Platforms', bg: '#E9DDFF', pattern: 'dots', shadowY: 700, shadowW: 280,
    body: `<g transform="translate(110 -55)"><path d="M235,560 Q245,470 345,468 L430,478 Q482,498 490,560 Z" fill="#E85C9C" ${S}/><rect x="222" y="556" width="280" height="66" rx="22" fill="#FFF8F2" ${S}/></g>
<path d="M200,600 Q210,505 310,503 L395,513 Q447,533 455,600 Z" fill="#FF7EB6" ${S}/>
<path d="M285,512 Q330,540 372,516" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
<circle cx="372" cy="518" r="8" fill="#F2C24E" stroke="${INK}" stroke-width="3"/>
<rect x="186" y="596" width="282" height="70" rx="22" fill="#FFF8F2" ${S}/>
${shine('M240,560 Q260,530 300,525', 10)}`,
  }),
  'hand-beaded-phone-charm': frame({
    title: 'Hand-Beaded Phone Charm', bg: '#FFD1E3', pattern: 'stripes', patternColor: 'rgba(255,255,255,0.45)', shadowY: 830, shadowW: 140,
    body: `<circle cx="400" cy="230" r="34" fill="none" ${S}/>
<path d="M400,264 L400,680" fill="none" stroke="${INK}" stroke-width="5"/>
${beadsAlong([400, 290], [400, 450], [400, 640], 9, 19, ['#FFFFFF', '#FF9EC7', '#E9DDFF', '#FFF0A6', '#B8F0D8'])}
${heart(400, 730, 46, '#FF4FA0', S)}`,
  }),
  'butter-yellow-ballet-flats': frame({
    title: 'Butter Yellow Ballet Flats', bg: '#FFE8F0', pattern: 'gingham', patternColor: 'rgba(255,158,199,0.25)', shadowY: 780, shadowW: 250,
    body: `<g transform="rotate(-8 320 520)"><path d="M320,290 C395,290 405,420 398,560 C392,690 370,760 320,760 C270,760 248,690 242,560 C235,420 245,290 320,290 Z" fill="#FFE57A" ${S}/><path d="M320,450 C368,450 372,520 368,600 C364,680 350,720 320,720 C290,720 276,680 272,600 C268,520 272,450 320,450 Z" fill="#FFF8F2" ${S}/><path d="M298,420 q22,-22 44,0 q-22,22 -44,0 Z" fill="#FFF8F2" ${S}/></g>
<g transform="rotate(8 480 520)"><path d="M480,290 C555,290 565,420 558,560 C552,690 530,760 480,760 C430,760 408,690 402,560 C395,420 405,290 480,290 Z" fill="#FFE57A" ${S}/><path d="M480,450 C528,450 532,520 528,600 C524,680 510,720 480,720 C450,720 436,680 432,600 C428,520 432,450 480,450 Z" fill="#FFF8F2" ${S}/><path d="M458,420 q22,-22 44,0 q-22,22 -44,0 Z" fill="#FFF8F2" ${S}/></g>`,
  }),
  'glossy-lip-trio': frame({
    title: 'Glossy Lip Trio', bg: '#E9DDFF', shadowY: 770, shadowW: 230,
    body: [
      { x: 255, top: 330, c: '#FF7EB6' },
      { x: 365, top: 270, c: '#FFB38A' },
      { x: 475, top: 350, c: '#C2185B' },
    ].map(({ x, top, c }) => `<rect x="${x}" y="${top}" width="70" height="120" rx="18" fill="#FFF8F2" ${S}/>
<rect x="${x}" y="${top + 110}" width="70" height="${760 - top - 120}" rx="20" fill="#FFFFFF" fill-opacity="0.85" ${S}/>
<rect x="${x + 10}" y="${top + 150}" width="50" height="${760 - top - 190}" rx="14" fill="${c}"/>
${shine(`M${x + 22},${top + 175} L${x + 22},${top + 300}`, 8)}`).join('\n'),
  }),
}

for (const [slug, svg] of Object.entries(art)) {
  writeFileSync(new URL(`${slug}.svg`, OUT), svg)
}
console.log(`wrote ${Object.keys(art).length} images`)
