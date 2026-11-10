import { Badge, Card, Group, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { ArrowUpRight, Lightbulb, Navigation } from 'lucide-react';
import type { Device } from '../shared/types';

const positions = [
  { room: '主卧', x: 26, y: 25 }, { room: '书房', x: 72, y: 25 },
  { room: '客厅', x: 29, y: 61 }, { room: '厨房', x: 73, y: 61 }, { room: '阳台', x: 36, y: 89 },
];
export function FloorPlan({ devices, selected, onRoom }: { devices: Device[]; selected: string; onRoom: (room: string) => void }) {
  return <Card className="floor-card">
    <Group justify="space-between"><div><Text size="xs" c="dimmed" className="eyebrow">YOUR HOME, CONNECTED</Text><Text size="lg" fw={500} mt={3}>家的每一处，尽在掌握</Text></div><Badge variant="light" color="mint" size="sm">示例户型</Badge></Group>
    <div className="floor-plan">
      <svg className="floor-art" viewBox="0 0 600 570" fill="none" aria-label="示例户型：主卧、书房、客厅、厨房和阳台" role="img">
        <defs>
          <pattern id="wood" width="35" height="140" patternUnits="userSpaceOnUse"><rect width="35" height="140" fill="#665e4f"/><path d="M0 0v140M35 70H0" stroke="#766c58" strokeWidth="1"/><path d="M8 0v55m15 30v55" stroke="#716651" strokeWidth=".7"/></pattern>
          <pattern id="tile" width="35" height="35" patternUnits="userSpaceOnUse"><rect width="35" height="35" fill="#5a605b"/><path d="M0 35V0h35" stroke="#71766e" strokeWidth="1"/></pattern>
          <filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity=".35"/></filter>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#87aa9d" stopOpacity=".7"/><stop offset="1" stopColor="#3c5148" stopOpacity=".5"/></linearGradient>
          <radialGradient id="light"><stop stopColor="#ffe3a0" stopOpacity=".28"/><stop offset="1" stopColor="#ffe3a0" stopOpacity="0"/></radialGradient>
        </defs>
        <g filter="url(#shadow)">
          <path d="M38 44H554V438H355V538H38Z" fill="#161f1c" stroke="#121a17" strokeWidth="15"/>
          <path d="M42 46H550V433H350V532H42Z" fill="url(#wood)"/>
          <path d="M337 46H550V222H337Z" fill="url(#wood)"/>
          <path d="M337 237H550V433H337Z" fill="url(#tile)"/>
          <path d="M42 452H350V532H42Z" fill="url(#tile)"/>
          <path d="M44 48H550V433H350V532H44Z" stroke="#a0aaa4" strokeWidth="11"/>
          <path d="M44 230H228m56 0h266M329 48V160m0 50v141m0 55v27M44 446h127m65 0h114" stroke="#a0aaa4" strokeWidth="10"/>
          <path d="M228 230v-52a52 52 0 0 1 52 52M329 160h-50a50 50 0 0 0 0 50M171 446v-60a60 60 0 0 1 60 60" stroke="#b4b7a9" strokeOpacity=".5" strokeWidth="1"/>
          <path d="M65 48H210M391 48H514M44 273v122M72 532h227" stroke="url(#glass)" strokeWidth="7"/>
          {/* Bedroom: bed, linen, nightstands and a rug. */}
          <rect x="83" y="92" width="195" height="110" rx="5" fill="#777367"/>
          <rect x="98" y="69" width="144" height="125" rx="5" fill="#a59f8b"/>
          <rect x="103" y="75" width="134" height="115" rx="4" fill="#dbd8c7"/>
          <rect x="108" y="82" width="58" height="29" rx="6" fill="#eeecdf"/><rect x="174" y="82" width="56" height="29" rx="6" fill="#eeecdf"/>
          <path d="M103 119h134v71H103Z" fill="#9dafa4"/><path d="M104 126h132M119 132v51" stroke="#b6c3b8" strokeWidth="2"/>
          <rect x="69" y="73" width="23" height="31" rx="3" fill="#8e806a"/><rect x="250" y="73" width="23" height="31" rx="3" fill="#8e806a"/>
          <circle cx="80" cy="83" r="8" fill="#e1c994"/><circle cx="261" cy="83" r="8" fill="#e1c994"/>
          <rect x="289" y="75" width="21" height="112" rx="2" fill="#807767"/>
          {/* Study. */}
          <rect x="366" y="67" width="157" height="38" rx="3" fill="#aca28b"/>
          <rect x="416" y="72" width="58" height="21" rx="2" fill="#273b35" stroke="#809487" strokeWidth="2"/>
          <rect x="426" y="96" width="39" height="5" rx="1" fill="#d3cdbb"/>
          <rect x="426" y="119" width="40" height="42" rx="15" fill="#444e47" stroke="#737c70" strokeWidth="3"/>
          <rect x="365" y="177" width="145" height="24" rx="2" fill="#8b7d67"/>
          <path d="M377 180v18m13-18v18m8-18v18m18-18v18m14-18v18m19-18v18m12-18v18m16-18v18" stroke="#b8aa8c" strokeWidth="5"/>
          {/* Living room. */}
          <rect x="82" y="265" width="205" height="145" rx="3" fill="#999586"/>
          <path d="M91 280h164v44H91Z" fill="#b9b9a5"/>
          <rect x="87" y="276" width="172" height="13" rx="5" fill="#c8c9b4"/><rect x="84" y="279" width="16" height="53" rx="5" fill="#c8c9b4"/><rect x="246" y="279" width="16" height="53" rx="5" fill="#c8c9b4"/>
          <path d="M149 289v33m49-33v33" stroke="#969d8c" strokeWidth="2"/>
          <rect x="104" y="293" width="25" height="23" rx="4" fill="#ddd2b5"/><rect x="216" y="292" width="23" height="25" rx="4" fill="#708c79"/>
          <ellipse cx="175" cy="363" rx="44" ry="27" fill="#6d634f" stroke="#a39375" strokeWidth="3"/><ellipse cx="175" cy="359" rx="44" ry="27" fill="#897b62"/>
          <rect x="160" y="346" width="18" height="20" rx="1" fill="#c5bea6" transform="rotate(-12 160 346)"/><circle cx="191" cy="360" r="6" fill="#ded8c3"/>
          <rect x="98" y="416" width="165" height="16" rx="2" fill="#726b5b"/><rect x="116" y="411" width="130" height="6" rx="2" fill="#243831"/>
          {/* Kitchen and dining area. */}
          <path d="M355 252h177v44H488v-21H355Z" fill="#c0bdab"/>
          <rect x="364" y="259" width="38" height="12" rx="3" fill="#7f8e83"/><rect x="460" y="257" width="30" height="14" rx="2" fill="#444c43"/>
          <circle cx="468" cy="263" r="4" stroke="#c1c3b0"/><circle cx="481" cy="264" r="4" stroke="#c1c3b0"/>
          <rect x="403" y="342" width="92" height="49" rx="8" fill="#b1a58b"/>
          <rect x="411" y="327" width="26" height="11" rx="3" fill="#767d6e"/><rect x="461" y="327" width="26" height="11" rx="3" fill="#767d6e"/><rect x="411" y="395" width="26" height="11" rx="3" fill="#767d6e"/><rect x="461" y="395" width="26" height="11" rx="3" fill="#767d6e"/>
          <circle cx="449" cy="366" r="9" fill="#d8d2b9"/><path d="M449 364v-12m0 6-7-4m7 2 7-7" stroke="#64836a" strokeWidth="3"/>
          {/* Balcony and plants. */}
          <rect x="68" y="474" width="57" height="35" rx="7" fill="#a5ac98"/><circle cx="158" cy="494" r="16" fill="#b4a58a"/>
          {[ [296,492], [514,397], [286,391], [379,126] ].map(([x,y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="14" fill="#3e5e49"/><ellipse cx={x-7} cy={y-5} rx="8" ry="13" fill="#6f8a5c" transform={`rotate(-35 ${x} ${y})`}/><ellipse cx={x+6} cy={y+2} rx="7" ry="12" fill="#829667" transform={`rotate(40 ${x} ${y})`}/></g>)}
        </g>
        {positions.map((p) => {
          const lit = devices.some((d) => d.room === p.room && d.kind === 'light' && d.state.power && d.online);
          return lit ? <ellipse key={p.room} cx={p.x * 6} cy={p.y * 5.7} rx="110" ry="85" fill="url(#light)" /> : null;
        })}
      </svg>
      {positions.map((position) => {
        const roomDevices = devices.filter((d) => d.room === position.room);
        const active = roomDevices.some((d) => d.online && d.state.power);
        return <Tooltip key={position.room} label={`${position.room} · ${roomDevices.length} 个设备`}><UnstyledButton className={`room-hotspot ${active ? 'active' : ''} ${selected === position.room ? 'selected' : ''}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} onClick={() => onRoom(position.room)} aria-label={`查看${position.room}设备`}><Lightbulb size={14} /><span>{position.room}</span></UnstyledButton></Tooltip>;
      })}
      <div className="compass"><Navigation size={15} /><span>N</span></div>
    </div>
    <Group justify="space-between" className="floor-footer"><Text size="xs" c="dimmed"><span className="status-dot" /> 点击房间，查看与控制设备</Text><ArrowUpRight size={16} color="#7c9388" /></Group>
  </Card>;
}
