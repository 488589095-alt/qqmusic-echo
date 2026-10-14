'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  Heart,
  Home,
  Library,
  Mail,
  ListMusic,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  MousePointer2,
  Music2,
  Pause,
  Play,
  Radio,
  RefreshCcw,
  Repeat2,
  Route,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Video,
  Volume2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import hereCover from './assets/here-demo-cover.svg?inline';
import loveCover from './assets/love-demo-cover.svg?inline';
import seoulPhoto from './assets/seoul-window-memory.webp?inline';
import herePreview from './assets/here-preview.m4a?url';
import lovePreview from './assets/love-lee-preview.m4a?url';

type SceneId = 0 | 1 | 2 | 3 | 4 | 5;
type TrackKey = 'here' | 'love';
type IntroAnswer = 'felt' | 'curious' | null;
type IntroStep = 0 | 1 | 2 | 3 | 4;
type Guide = { id: string; target: string; cue: string; title: string; reason: string; alternate?: string };
type CardStyle = 'rain' | 'cinema' | 'pulse';

const EXAMPLE_NOTE = '那天从机场进城，雨停了，车窗里的首尔还亮着。';
const CARD_STYLES: CardStyle[] = ['rain', 'cinema', 'pulse'];
const CARD_STYLE_LABELS: Record<CardStyle, string> = { rain: '雨夜光影', cinema: '车窗胶片', pulse: '旋律光轨' };
const SONG_MOOD_STYLES: Record<TrackKey, CardStyle> = { here: 'pulse', love: 'cinema' };

function suggestCardStyle(track: TrackKey, note: string, photoAdded: boolean): CardStyle {
  if (photoAdded) return 'cinema';
  if (/雨|夜|灯|路|城市|街/.test(note)) return 'rain';
  return SONG_MOOD_STYLES[track];
}

type ToolDefinition = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute(input: unknown): unknown | Promise<unknown>;
};

declare global {
  interface Document {
    modelContext?: {
      registerTool(tool: ToolDefinition, options?: { signal?: AbortSignal }): void | Promise<void>;
    };
  }
}

const TRACKS: Record<TrackKey, {
  title: string;
  artist: string;
  cover: string;
  preview: string;
  sourceUrl: string;
}> = {
  here: {
    title: 'Here',
    artist: 'Alessia Cara',
    cover: hereCover,
    preview: herePreview,
    sourceUrl: 'https://music.apple.com/us/album/here/1440845616?i=1440845747',
  },
  love: {
    title: 'Love Lee',
    artist: 'AKMU',
    cover: loveCover,
    preview: lovePreview,
    sourceUrl: 'https://music.apple.com/us/album/love-lee/1702810041?i=1702810042',
  },
};

const scenes: Array<{ no: string; title: string; detail: string; stageNote: string }> = [
  { no: '01', title: '回声轻提示', detail: '先询问是否愿意留下', stageNote: '一次连续听歌中反复主动重播，才可能提出待确认候选。' },
  { no: '02', title: '查看回声候选', detail: '先看收听线索', stageNote: '播放行为提出候选；回忆中的路线不是识别前提。' },
  { no: '03', title: 'AI回忆卡', detail: '歌曲、留言与照片决定视觉', stageNote: '点击生成后，卡片才进入个人回声；可换一种视觉，不另开地图应用。' },
  { no: '04', title: '重听时轻提示', detail: '播放器底部', stageNote: '歌曲继续播放；从底部打开同一张卡片。' },
  { no: '05', title: '听新歌时再次经过', detail: 'Love Lee 正在播，Here 的回声回来', stageNote: '用户选择开启地点提醒后，听另一首歌经过旧地点，仍能轻轻遇见已保存的回声。' },
  { no: '06', title: '播放器内回听', detail: '回到 Here，音乐继续', stageNote: '从卡片回听后留在播放器；卡片仍可打开，但体验在这里自然结束。' },
];

const sceneNames = scenes.map((scene) => scene.title);

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function PhoneStatus() {
  return (
    <div className="phone-status">
      <strong>10:52</strong>
      <span className="status-glyphs" aria-label="5G网络，电量91%">▮▮▮ 5G&nbsp; 91</span>
    </div>
  );
}

function QQPill() {
  return <div className="qq-pill"><Radio />QQ音乐</div>;
}

function SongCover({ track, className = '' }: { track: TrackKey; className?: string }) {
  const item = TRACKS[track];
  return <img className={`song-cover ${className}`} src={item.cover} alt={`${item.title} 的抽象示意封面`} />;
}

function PlaybackProgress({ current, duration }: { current: number; duration: number }) {
  const ratio = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  return (
    <div className="playback-progress" aria-label="歌曲预览播放进度">
      <div className="progress-rail"><span style={{ width: `${ratio}%` }} /></div>
      <div className="progress-time"><span>{formatTime(current)}</span><span>{formatTime(duration || 30)}</span></div>
    </div>
  );
}

function BottomNav({ active = 'home', onMine }: { active?: 'home' | 'mine'; onMine?(): void }) {
  const items = [
    { id: 'home', label: '首页', icon: Home },
    { id: 'video', label: '视频', icon: Video },
    { id: 'radio', label: '刷歌', icon: Radio },
    { id: 'star', label: '星光', icon: Star },
    { id: 'mine', label: '我的', icon: UserRound },
  ];
  return (
    <nav className="phone-bottom-nav" aria-label="QQ音乐底部导航">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.id} className={active === item.id ? 'is-active' : ''} type="button" onClick={item.id === 'mine' ? onMine : undefined}>
            <Icon /><span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function MiniPlayer({ playing, onToggle }: { playing: boolean; onToggle(): void }) {
  return (
    <div className="mini-player">
      <SongCover track="here" />
      <div><strong>Here</strong><span>Alessia Cara</span></div>
      <button type="button" aria-label={playing ? '暂停Here试听' : '播放Here试听'} onClick={onToggle}>
        {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
      </button>
      <button type="button" aria-label="播放列表"><ListMusic /></button>
    </div>
  );
}

function HomeRevealScreen({ promptVisible, playing, hasPlaceContext, onToggle, onOpen, onDismiss, onMine }: {
  promptVisible: boolean; playing: boolean; hasPlaceContext: boolean; onToggle(): void; onOpen(): void; onDismiss(): void; onMine(): void;
}) {
  return (
    <div className="phone-screen home-screen">
      <PhoneStatus />
      <div className="home-search-row">
        <div className="home-search"><Search /><span>搜你想听的音乐</span></div>
        <Radio /><span className="coin-mark">¥</span>
      </div>
      <div className="home-tabs"><strong>推荐</strong><span>乐馆</span><span>儿童</span><span>刷歌</span><span>AI作歌</span></div>
      <section className="home-hero">
        <div className="hero-disc"><Music2 /></div>
        <div><span>每日私享</span><strong>让音乐跟着今天走</strong><p>根据你的收藏与最近播放更新</p></div>
        <button type="button" aria-label="播放每日私享"><Play fill="currentColor" /></button>
      </section>
      <section className="home-section">
        <header><h3>大家都在听</h3><button type="button"><Play fill="currentColor" /></button></header>
        <article><SongCover track="love" /><div><strong>Love Lee</strong><span>AKMU · 近期热门</span></div><Heart /></article>
        <article><SongCover track="here" /><div><strong>Here</strong><span>Alessia Cara · 我的常听</span></div><Heart /></article>
      </section>
      {promptVisible && (
        <div className="latent-toast" data-guide-id="echo-open" role="status">
          <button className="latent-toast-main" type="button" onClick={onOpen}>
            <span className="echo-dot"><Route /></span>
            <span><small>{hasPlaceContext ? '刚才这段路，你反复听了《Here》' : '刚才这一阵，你反复听了《Here》'}</small><strong>要把这一刻留成回声吗？</strong></span>
            <ChevronRight />
          </button>
          <button className="toast-dismiss" type="button" aria-label="忽略这次提示" onClick={onDismiss}><X /></button>
        </div>
      )}
      <MiniPlayer playing={playing} onToggle={onToggle} />
      <BottomNav active="home" onMine={onMine} />
    </div>
  );
}

function SeoulRouteMap({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`route-map ${compact ? 'is-compact' : ''}`} aria-label="首尔机场至望远洞路线示意">
      <span className="street street-a" /><span className="street street-b" /><span className="street street-c" />
      <svg viewBox="0 0 320 360" aria-hidden="true">
        <path className="route-halo" d="M25 300 C70 288 68 235 116 219 C169 201 151 145 214 122 C257 106 253 71 294 42" />
        <path className="route-line" d="M25 300 C70 288 68 235 116 219 C169 201 151 145 214 122 C257 106 253 71 294 42" />
      </svg>
      <span className="route-start"><i />仁川机场</span>
      <span className="route-end"><MapPin />望远洞</span>
      {!compact && <span className="route-context">回忆路线示意</span>}
      {!compact && <span className="route-duration"><Clock3 />42分钟</span>}
    </div>
  );
}

function RouteCandidateScreen({ note, onNoteChange, noteOpen, onToggleNote, photoAdded, onTogglePhoto, onSave, onDismiss, onBack, menuOpen, onToggleMenu, onCancel }: {
  note: string; onNoteChange(value: string): void; noteOpen: boolean; onToggleNote(): void; photoAdded: boolean;
  onTogglePhoto(): void; onSave(): void; onDismiss(): void; onBack(): void; menuOpen: boolean; onToggleMenu(): void; onCancel(): void;
}) {
  return (
    <div className="phone-screen route-detail-screen">
      <PhoneStatus />
      <header className="subpage-header">
        <button type="button" aria-label="返回" onClick={onBack}><ArrowLeft /></button>
        <div><strong>可能属于你的回声</strong><span>尚未保存 · 30天后自动删除</span></div>
        <button type="button" data-guide-id="candidate-more" aria-label="更多与撤回候选" aria-expanded={menuOpen} onClick={onToggleMenu}><MoreHorizontal /></button>
      </header>
      {menuOpen && <div className="candidate-menu"><strong>这段回声由你决定</strong><button type="button" data-guide-id="candidate-cancel" onClick={onCancel}><Trash2 />撤回并清除这次候选</button><p>清除后不会进入「我的」，也不会为这条候选继续提醒。</p></div>}
      <SeoulRouteMap />
      <section className="route-summary-card">
        <div className="route-song-row"><SongCover track="here" /><div><small>2026年10月 · 首尔</small><h3>首尔的第一段路</h3><p>机场 → 望远洞</p></div></div>
        <div className="fact-row">
          <span><Clock3 /><b>连续听歌42分钟</b></span><span><Repeat2 /><b>完整听完4次</b></span><span><Headphones /><b>主动重播过</b></span>
        </div>
        <p className="ai-boundary"><Sparkles />歌曲气质、你写的话和照片，会成为回忆卡的视觉线索。</p>
      </section>
      <div className="optional-tools">
        <button className={noteOpen ? 'is-active' : ''} data-guide-id="candidate-note" type="button" onClick={onToggleNote}><MessageCircle />留一句话 <small>可选</small></button>
        <button className={photoAdded ? 'is-active' : ''} data-guide-id="candidate-photo" type="button" onClick={onTogglePhoto}>{photoAdded ? <Check /> : <Camera />}{photoAdded ? '已添加示意照片' : '模拟添加照片'} <small>可选</small></button>
      </div>
      {noteOpen && <Textarea className="memory-note" value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="这一段路，对你来说是什么？" maxLength={80} />}
      {photoAdded && <div className="demo-photo-preview"><img src={seoulPhoto} alt="AI 生成的首尔雨夜车窗示意照片" /><span><strong>车窗外的首尔</strong><small>AI 生成示意图 · 未读取你的照片</small></span></div>}
      <div className="route-actions">
        <Button className="qq-primary-button" data-guide-id="candidate-save" onClick={onSave}><Sparkles />AI 生成回忆卡</Button>
        <Button className="quiet-button" data-guide-id="candidate-listen" variant="ghost" onClick={onDismiss}>只是普通听歌</Button>
      </div>
    </div>
  );
}

function EchoCard({ note = '', photoAdded = false, style = 'rain', compact = false, guideId }: { note?: string; photoAdded?: boolean; style?: CardStyle; compact?: boolean; guideId?: string }) {
  return (
    <div className={`echo-art-card style-${style} ${compact ? 'is-compact' : ''}`} data-guide-id={guideId}>
      <span className="echo-card-orbit orbit-one" /><span className="echo-card-orbit orbit-two" />
      <div className="echo-card-top"><span>QQ MUSIC / ECHO</span><span className="echo-card-style-label"><Sparkles />{CARD_STYLE_LABELS[style]}</span></div>
      <div className="echo-card-visual"><span className="echo-card-seoul">SEOUL</span>{photoAdded && <img className="echo-card-photo" src={seoulPhoto} alt="" />}<span className="echo-card-pulse" aria-hidden="true" /><svg viewBox="0 0 300 190" aria-hidden="true"><path d="M16 153 C52 146 74 108 113 119 S158 91 186 77 S239 62 279 24" /><circle cx="16" cy="153" r="5" /><circle cx="279" cy="24" r="6" /></svg><i className="echo-card-disc"><SongCover track="here" /></i></div>
      <div className="echo-card-bottom"><div><small>2026.10.04 · 首尔</small><strong>首尔的第一段路</strong><span>机场 → 望远洞 · Here</span></div><Mail /></div>
      {note && <p className="echo-card-note">“{note}”</p>}
    </div>
  );
}

function EchoLibraryScreen({ note, photoAdded, cardStyle, onRegenerate, onOpenMemory, onOpenSettings }: { note: string; photoAdded: boolean; cardStyle: CardStyle; onRegenerate(): void; onOpenMemory(): void; onOpenSettings(): void }) {
  return (
    <div className="phone-screen echo-library-screen">
      <PhoneStatus />
      <header className="echo-header">
        <div><span>我的 · 听歌回忆</span><h3>回声卡片</h3></div>
        <button type="button" data-guide-id="library-settings" aria-label="回声隐私设置" onClick={onOpenSettings}><Settings2 /></button>
      </header>
      <p className="library-intro">只收起你亲手留住的时刻。</p>
      <div className="library-style-row"><span><Sparkles />专属视觉 · {CARD_STYLE_LABELS[cardStyle]}</span><button type="button" data-guide-id="library-style" onClick={onRegenerate}>换一种样式 <RefreshCcw /></button></div>
      <button className="library-card-button" type="button" onClick={onOpenMemory} aria-label="打开首尔的第一段路回忆卡"><EchoCard note={note} photoAdded={photoAdded} style={cardStyle} guideId="library-card" /></button>
      <div className="library-meta"><span><ShieldCheck />仅你可见</span><span>01 / 01</span></div>
      <BottomNav active="mine" />
    </div>
  );
}

function PlayerControls({ playing, onToggle, onPrevious, onNext }: {
  playing: boolean; onToggle(): void; onPrevious?(): void; onNext?(): void;
}) {
  return (
    <div className="player-controls">
      <button type="button" aria-label="循环播放"><Repeat2 /></button>
      <button type="button" aria-label="上一首" onClick={onPrevious}><SkipBack fill="currentColor" /></button>
      <button className="main-play" type="button" aria-label={playing ? '暂停试听' : '播放试听'} onClick={onToggle}>
        {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
      </button>
      <button type="button" aria-label="下一首" onClick={onNext}><SkipForward fill="currentColor" /></button>
      <button type="button" aria-label="播放列表"><ListMusic /></button>
    </div>
  );
}

function MusicPlayerScreen({ track, playing, current, duration, hint, caption, onHint, onToggle, onOpenSettings }: {
  track: TrackKey; playing: boolean; current: number; duration: number; hint?: { eyebrow: string; title: string };
  caption?: string | null; onHint?(): void; onToggle(): void; onOpenSettings(): void;
}) {
  const item = TRACKS[track];
  return (
    <div className={`phone-screen music-player-screen player-${track}`}>
      <PhoneStatus /><QQPill />
      <header className="music-player-header">
        <button type="button" aria-label="收起"><ChevronDown /></button><span>•••</span>
        <div><button type="button" aria-label="播放器皮肤"><Sparkles /></button><button type="button" aria-label="分享"><Share2 /></button></div>
      </header>
      <div className={`record-stage ${playing ? 'is-playing' : ''}`}><div className="record-disc"><SongCover track={track} /></div><span className="tonearm" /></div>
      <section className="player-song-meta">
        <div><h3>{item.title}</h3><p>{item.artist} <span>关注</span> <span>标准</span> <span>VIP</span></p></div><Heart />
      </section>
      {caption !== null && <p className="player-lyric-placeholder">{caption ?? '歌词随播放缓慢浮现'}</p>}
      {hint && (
        <button className="player-echo-hint" data-guide-id="player-hint" type="button" onClick={onHint}>
          <span><Radio /></span><span><small>{hint.eyebrow}</small><strong>{hint.title}</strong></span><ChevronRight />
        </button>
      )}
      <div className="player-action-row"><span><MessageCircle /><small>8</small></span><span><Volume2 /><small>音效</small></span><span><Bell /><small>铃声</small></span><span><ListMusic /><small>队列</small></span><button type="button" data-guide-id="player-settings" aria-label="更多与回声隐私设置" onClick={onOpenSettings}><MoreHorizontal /></button></div>
      <PlaybackProgress current={current} duration={duration} />
      <PlayerControls playing={playing} onToggle={onToggle} />
      <button className="preview-source preview-source-button" type="button" onClick={onToggle}>《{item.title}》30 秒原曲预览 · 在此播放/暂停</button>
    </div>
  );
}

function SavedMemorySheet({ note, photoAdded, cardStyle, onRegenerate, onClose, onReplay }: { note: string; photoAdded: boolean; cardStyle: CardStyle; onRegenerate(): void; onClose(): void; onReplay(): void }) {
  return (
    <div className="phone-sheet-backdrop">
      <section className="memory-sheet" role="dialog" aria-modal="true" aria-labelledby="saved-memory-title">
        <div className="sheet-handle" /><button className="sheet-close" data-guide-id="memory-close" type="button" aria-label="关闭回忆卡" onClick={onClose}><X /></button>
        <div className="saved-memory-heading"><span>你的回声卡片</span><h3 id="saved-memory-title">首尔的第一段路</h3><p>在那时与今天之间，轻轻打开。</p></div>
        <EchoCard note={note} photoAdded={photoAdded} style={cardStyle} compact />
        <button className="sheet-restyle" type="button" onClick={onRegenerate}><Sparkles />再换一种卡片样式 <RefreshCcw /></button>
        <div className="saved-fact"><SongCover track="here" /><span><strong>《Here》· 从机场驶向望远洞</strong><small>从车窗看见首尔的那天</small></span></div>
        <Button className="qq-primary-button" data-guide-id="memory-replay" onClick={onReplay}><Play fill="currentColor" />听回那段路</Button>
      </section>
    </div>
  );
}

function SettingsSheet({ locationReminder, onChange, onClose, latentEnabled, onLatentChange, onClear, blurLocationEnabled, onBlurLocationChange }: { locationReminder: boolean; onChange(value: boolean): void; onClose(): void; latentEnabled: boolean; onLatentChange(value: boolean): void; onClear(): void; blurLocationEnabled: boolean; onBlurLocationChange(value: boolean): void }) {
  return (
    <div className="phone-sheet-backdrop settings-backdrop">
      <section className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="sheet-handle" /><button className="sheet-close" data-guide-id="settings-close" type="button" aria-label="关闭隐私设置" onClick={onClose}><X /></button>
        <div className="settings-title"><span><ShieldCheck /></span><div><small>由你决定</small><h3 id="settings-title">回声设置</h3></div></div>
        <label><span><strong>发现新的回声</strong><small>{latentEnabled ? '从听过的歌里发现值得留住的片段' : '已暂停发现新的回声'}</small></span><Switch checked={latentEnabled} onCheckedChange={onLatentChange} aria-label="发现新的回声" /></label>
        <label data-guide-id="settings-blur"><span><strong>仅保留模糊位置</strong><small>{blurLocationEnabled ? '只使用大致地点，不保存精确路线' : '已关闭地点线索'}</small></span><Switch checked={blurLocationEnabled} onCheckedChange={onBlurLocationChange} aria-label="仅保留模糊位置" /></label>
        <label data-guide-id="settings-reminder"><span><strong>地点回声提醒</strong><small>{blurLocationEnabled ? '再次经过时提醒我' : '开启地点线索后才可使用'}</small></span><Switch checked={locationReminder && blurLocationEnabled} disabled={!blurLocationEnabled} onCheckedChange={onChange} aria-label="地点回声提醒" /></label>
        <button className="clear-data-button" type="button" onClick={onClear}><Trash2 />清除未保存的回声</button>
        <p>你保存的回声卡片会留在「我的」里。</p>
      </section>
    </div>
  );
}

function GuidePointer({ guide, containerRef }: { guide: Guide | null; containerRef: React.RefObject<HTMLElement | null> }) {
  const [anchor, setAnchor] = useState<{ left: number; top: number; width: number; height: number; cueTop: number } | null>(null);
  useEffect(() => {
    if (!guide?.target) { setAnchor(null); return; }
    const frame = containerRef.current;
    const target = frame?.querySelector<HTMLElement>(`[data-guide-id="${guide.target}"]`);
    if (!frame || !target) { setAnchor(null); return; }
    target.setAttribute('data-guide-active', 'true');
    const measure = () => {
      const frameBox = frame.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      const left = box.left - frameBox.left - frame.clientLeft;
      const top = box.top - frameBox.top - frame.clientTop;
      const rationale = frame.classList.contains('story-panel') ? target.closest('.guide-rationale') : null;
      const rationaleTop = rationale ? rationale.getBoundingClientRect().top - frameBox.top : 0;
      const cueTop = rationale ? Math.max(0, rationaleTop - 39) : top > 83 ? top - 42 : top + box.height + 10;
      setAnchor((previous) => previous && Math.abs(previous.left - left) < .2 && Math.abs(previous.top - top) < .2 && Math.abs(previous.width - box.width) < .2 && Math.abs(previous.height - box.height) < .2 && Math.abs(previous.cueTop - cueTop) < .2
        ? previous : { left, top, width: box.width, height: box.height, cueTop });
    };
    let animationFrame = 0;
    const follow = () => { measure(); animationFrame = window.requestAnimationFrame(follow); };
    follow();
    return () => { target.removeAttribute('data-guide-active'); window.cancelAnimationFrame(animationFrame); };
  }, [guide?.id, guide?.target, containerRef]);
  if (!guide || !anchor) return null;
  const cueLeft = Math.min(Math.max(anchor.left + anchor.width / 2 - 82, 12), Math.max(12, (containerRef.current?.clientWidth ?? 378) - 176));
  return <div key={guide.id} className="guide-pointer" aria-hidden="true">
    <span className="guide-pointer-cue" style={{ left: cueLeft, top: anchor.cueTop }}><MousePointer2 />{guide.cue}</span>
  </div>;
}

function GuideRationale({ guide, scene, onTryCancel, onTryListen, onResume, onShowSettingsEntry, onReturnToCard, onNextScenario, onRestart }: { guide: Guide | null; scene: SceneId; onTryCancel(): void; onTryListen(): void; onResume(): void; onShowSettingsEntry(): void; onReturnToCard(): void; onNextScenario(): void; onRestart(): void }) {
  if (scene === 5 && guide?.id === 'complete-restart') return <div className="guide-rationale guide-complete" role="status"><span className="guide-rationale-kicker"><Check /> 第 6 页 · 点按绿色高亮</span><strong>回声留在这里，音乐继续。</strong><p>你已体验从发现候选到播放器内回听的完整链路。回忆卡仍可随时打开。</p><button className="guide-complete-button" data-guide-id="complete-restart" type="button" onClick={onRestart}>从头体验 <RefreshCcw /></button></div>;
  if (!guide) return <div className="guide-rationale" role="status"><span className="guide-rationale-kicker">体验提示</span><strong>这次提示已收起</strong><p>回声不会占据听歌界面。点击左侧「重置」可重新体验完整链路。</p></div>;
  return <div key={guide.id} className="guide-rationale" role="status" aria-live="polite">
    <span className="guide-rationale-kicker"><Sparkles /> 第 {scene + 1} 页 · 点按绿色高亮</span>
    <strong>{guide.title}</strong>
    <span className="guide-rationale-why">为什么这样设计</span>
    <p>{guide.reason}</p>
    {guide.id === 'stage-next' && <button className="guide-next-scenario" data-guide-id="stage-next" type="button" onClick={onNextScenario}>继续：听新歌时再次经过 <ChevronRight /></button>}
    {scene === 2 && !guide.id.startsWith('settings-') && <div className="guide-rationale-alternates"><button type="button" onClick={guide.id === 'library-settings' ? onReturnToCard : onShowSettingsEntry}>{guide.id === 'library-settings' ? '返回回忆卡' : '地点提醒与隐私设置'} <ChevronRight /></button></div>}
    {scene === 1 && <div className="guide-rationale-alternates">
      {guide.id !== 'candidate-more' && guide.id !== 'candidate-cancel' && <button type="button" onClick={onTryCancel}>查看如何撤回 <ChevronRight /></button>}
      {guide.id !== 'candidate-listen' && <button type="button" onClick={onTryListen}>只听歌的选择 <ChevronRight /></button>}
      {(guide.id === 'candidate-more' || guide.id === 'candidate-listen') && <button type="button" onClick={onResume}>继续生成流程 <ChevronRight /></button>}
    </div>}
  </div>;
}

const competitors = [
  { name: 'Spotify Time Capsule', category: '怀旧歌单', source: 'https://newsroom.spotify.com/2020-09-28/spotifys-refreshed-time-capsule-playlist-gives-listeners-a-dose-of-nostalgia/', summary: '用个性化旧歌唤起怀旧感，入口是一张歌单。', visual: 'playlist', gap: '擅长找回熟悉的歌；没有把某次聆听的个人地点与片段做成卡片。' },
  { name: 'Music Memory', category: '手写音乐日记', source: 'https://musicmemory.app/', summary: '手动选歌，补上时间、地点、文字和照片。官网标注尚未正式上线。', visual: 'journal', gap: '能细致保存记忆，但需要用户主动写下每一段。' },
  { name: 'HearThere', category: '地点音乐地图', source: 'https://play.google.com/store/apps/details?id=com.mindgearsoftware.hearthere', summary: '把听过的歌记在地点上，提供时间线、地图与重访提醒。', visual: 'map', gap: '地点线索清晰；启发我们把回访做得更轻，并让确认权始终在用户手里。' },
] as const;

function EchoIntro({ step, answer, competitorIndex, onCompetitor, onAnswer, onNext, onGoToStep, onEnter, onSkip }: {
  step: IntroStep; answer: IntroAnswer; competitorIndex: number; onCompetitor(index: number): void;
  onAnswer(value: Exclude<IntroAnswer, null>): void; onNext(): void; onGoToStep(step: IntroStep): void; onEnter(): void; onSkip(): void;
}) {
  const competitor = competitors[competitorIndex];
  const introSections = ['问题', '研究', '机会', '竞品', '方案'] as const;
  return <section className={`intro-experience intro-step-${step}`} aria-label="回声概念引导">
    <header className="intro-header"><div className="intro-brand"><span><Radio /></span><div><small>QQ音乐 · 音乐记忆实验</small><strong>回声</strong></div></div><div className="intro-header-actions">{step > 0 && <button className="intro-back" type="button" onClick={() => onGoToStep((step - 1) as IntroStep)}><ChevronLeft />上一页</button>}<button className="intro-skip" type="button" onClick={onSkip}><Play fill="currentColor" />直接体验 Demo <ChevronRight /></button></div></header>
    <nav className="intro-progress" aria-label="概念引导目录">{introSections.map((label, index) => <button key={label} type="button" className={step === index ? 'is-current' : step > index ? 'is-visited' : ''} aria-current={step === index ? 'step' : undefined} aria-label={`第 ${index + 1} 页：${label}`} onClick={() => onGoToStep(index as IntroStep)}><span>0{index + 1}</span><strong>{label}</strong></button>)}</nav>
    <div className="intro-layout">
      <div key={step} className="intro-copy">
        {step === 0 && <><span className="intro-kicker">先从一个人人都可能遇到的瞬间开始</span><h1>有没有一首歌，<br />让你突然回到<br /><em>某个地方？</em></h1><p>旋律一响，连同当时的光、空气和身边的人，也像被一并唤回。你有过这样的体验吗？</p><div className="intro-answer-row"><button type="button" onClick={() => onAnswer('felt')}>有，我想起过这样的瞬间 <ChevronRight /></button><button type="button" onClick={() => onAnswer('curious')}>还没有，带我了解一下 <ChevronRight /></button></div></>}
        {step === 1 && <><span className="intro-kicker">01 / 研究线索</span><h1>{answer === 'felt' ? <>这种瞬间，<br /><em>有一个名字。</em></> : <>这样的联想，<br /><em>并非只是想象。</em></>}</h1><p>研究称之为「音乐唤起的自传体记忆」（MEAM）：一段熟悉的音乐，可以成为取回个人经历与当时情境的线索。Janata 等人的实验中，约三成歌曲片段唤起了自传体记忆；这是研究样本中的结果，不代表每个人每首歌都会如此。</p><a className="intro-source" href="https://pubmed.ncbi.nlm.nih.gov/17965981/" target="_blank" rel="noreferrer">查看 Janata 等人（2007）研究摘要 ↗</a><button className="intro-primary" type="button" onClick={onNext}>为什么值得做成产品 <ChevronRight /></button></>}
        {step === 2 && <><span className="intro-kicker">02 / 从感受到机会</span><h1>让音乐走出歌单，<br /><em>连上真实世界。</em></h1><p>播放记录能告诉你听过什么，却很难带你回到那一刻。回声把歌曲与时间、大致地点连起来：在日常听歌中发现记忆线索，由你决定是否留住。这样，音乐不只被播放，也能成为你重新感受一座城、一段生活的入口。</p><div className="intro-mechanism"><span>听歌中发现</span><ChevronRight /><span>连接现实场景</span><ChevronRight /><span>轻轻再次相遇</span></div><button className="intro-primary" type="button" onClick={onNext}>先看看已有产品怎么做 <ChevronRight /></button></>}
        {step === 3 && <><span className="intro-kicker">03 / 竞品观察 · 点选查看</span><h1>有人留住歌，<br />有人留住地点。<br /><em>还可以更自然。</em></h1><p>点击三个产品，看看各自如何保存或唤回音乐记忆。右侧界面是根据官方功能说明绘制的动态示意，并非产品截图。</p><div className="intro-competitor-tabs">{competitors.map((item,index) => <button key={item.name} className={index===competitorIndex?'is-active':''} type="button" onClick={() => onCompetitor(index)}>{item.name}<ChevronRight /></button>)}</div><button className="intro-primary" type="button" onClick={onNext}>看「回声」的设计答案 <ChevronRight /></button></>}
        {step === 4 && <><span className="intro-kicker">04 / 回声的设计答案</span><h1>让记忆回来，<br /><em>但音乐继续。</em></h1><p>一次连续听歌中，只有出现反复完整播放和主动重播等明显线索，才在稍后询问是否留住。用户确认后，AI 才整理成私人回忆卡；地点是可选线索，无需追踪完整路线。再次听见或经过时，从播放器底部轻轻打开。</p><div className="intro-mechanism"><span>发现收听线索</span><ChevronRight /><span>确认成卡</span><ChevronRight /><span>播放器里重逢</span></div><button className="intro-primary" type="button" onClick={onEnter}>进入交互体验 <ChevronRight /></button><small className="intro-audio-note">接下来用创作者的首尔故事与《Here》做虚构化演示；每个人的回声应来自自己的经历。</small></>}
      </div>
      <div className="intro-visual" aria-label={step === 3 ? `${competitor.name}的功能示意` : '音乐和个人记忆的关系示意'}>
        {step === 3 ? <div key={competitor.name} className={`competitor-visual is-${competitor.visual}`}><span className="competitor-visual-kicker">{competitor.category} · 功能示意</span><div className="competitor-mock"><span className="mock-top"><i />{competitor.name}<i /></span>{competitor.visual === 'playlist' && <><div className="mock-art"><Music2 /></div><strong>Time Capsule</strong><span className="mock-row"><Music2 />熟悉的旧歌 <Play /></span><span className="mock-row"><Music2 />属于那个年代的歌 <Play /></span></>}{competitor.visual === 'journal' && <><div className="mock-art"><Mail /></div><strong>一首歌 · 一个时刻</strong><span className="mock-row"><Music2 />选一首歌 <Check /></span><span className="mock-row"><MapPin />添加时间与地点 <Check /></span><span className="mock-row"><MessageCircle />写下一句话 <Check /></span></>}{competitor.visual === 'map' && <><div className="mock-map"><i /><i /><i /><span className="mock-route-line" /></div><strong>听过的歌，在地图上</strong><span className="mock-row"><MapPin />重访某个地点 <Bell /></span></>}</div><p>{competitor.summary}</p><span className="competitor-gap">回声的思考：{competitor.gap}</span><a href={competitor.source} target="_blank" rel="noreferrer">查看官方介绍 ↗</a></div> : <><span className="intro-halo intro-halo-one" /><span className="intro-halo intro-halo-two" /><div className="intro-disc"><span className="intro-disc-label">MUSIC / MEMORY</span><Music2 /><i /></div><div className="intro-sensory sensory-a"><MapPin />地点</div><div className="intro-sensory sensory-b"><Clock3 />时间</div><div className="intro-sensory sensory-c"><Heart />感受</div><div className="intro-visual-caption"><small>{['QUESTION','RESEARCH','OPPORTUNITY','COMPARE','ECHO'][step]}</small><strong>{step === 0 ? '一首歌，打开一段记忆' : step === 1 ? '声音可以成为记忆线索' : step === 2 ? '从播放记录到个人情境' : '在音乐里轻轻重逢'}</strong></div></>}
      </div>
      {step === 3 && <button className="intro-primary intro-competitor-next-mobile" type="button" onClick={onNext}>看「回声」的设计答案 <ChevronRight /></button>}
    </div>
    <footer className="intro-footer"><span>回声 · 让音乐唤回当时的世界</span><span>研究与竞品均附来源；示意图非官方截图</span></footer>
  </section>;
}

export default function HomePage() {
  const [introStep, setIntroStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [introAnswer, setIntroAnswer] = useState<IntroAnswer>(null);
  const [competitorIndex, setCompetitorIndex] = useState(0);
  const [scene, setScene] = useState<SceneId>(0);
  const [promptVisible, setPromptVisible] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [photoAdded, setPhotoAdded] = useState(false);
  const [cardStyle, setCardStyle] = useState<CardStyle>('rain');
  const [stylePreviewed, setStylePreviewed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsEntryGuide, setSettingsEntryGuide] = useState(false);
  const [settingsVisited, setSettingsVisited] = useState(false);
  const [settingsGuideStep, setSettingsGuideStep] = useState(0);
  const [blurLocationEnabled, setBlurLocationEnabled] = useState(true);
  const [candidateMenuOpen, setCandidateMenuOpen] = useState(false);
  const [candidateGuideMode, setCandidateGuideMode] = useState<'main' | 'more' | 'listen'>('main');
  const [locationReminder, setLocationReminder] = useState(false);
  const [latentEnabled, setLatentEnabled] = useState(true);
  const [playingTrack, setPlayingTrack] = useState<TrackKey | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const hereAudioRef = useRef<HTMLAudioElement>(null);
  const loveAudioRef = useRef<HTMLAudioElement>(null);
  const activeTrackRef = useRef<TrackKey | null>(null);
  const playRequestRef = useRef(0);
  const phoneRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const generationTimerRef = useRef<number | null>(null);

  const stopAudio = useCallback(() => {
    playRequestRef.current += 1;
    hereAudioRef.current?.pause();
    loveAudioRef.current?.pause();
    activeTrackRef.current = null;
    setPlayingTrack(null);
  }, []);

  const playTrack = useCallback((track: TrackKey, restart = false) => {
    const audio = (track === 'here' ? hereAudioRef : loveAudioRef).current;
    const otherAudio = (track === 'here' ? loveAudioRef : hereAudioRef).current;
    if (!audio) return;
    if (!audio.paused && playingTrack === track && !restart) {
      playRequestRef.current += 1;
      audio.pause();
      setPlayingTrack(null);
      return;
    }
    otherAudio?.pause();
    activeTrackRef.current = track;
    if (restart) audio.currentTime = 0;
    setCurrentTime(audio.currentTime);
    setDuration(Number.isFinite(audio.duration) ? audio.duration : 30);
    const requestId = ++playRequestRef.current;
    void audio.play().then(() => {
      if (playRequestRef.current === requestId) setPlayingTrack(track);
    }).catch(() => {
      if (playRequestRef.current === requestId) setPlayingTrack(null);
    });
  }, [playingTrack]);

  const goToScene = useCallback((next: SceneId) => {
    setIntroStep(5);
    setScene(next);
    if (next === 0) setPromptVisible(true);
    setMemoryOpen(false);
    setSettingsOpen(false);
    setSettingsEntryGuide(false);
    setCandidateMenuOpen(false);
    setCandidateGuideMode('main');
    if (next === 0 || next === 3 || next === 5) playTrack('here', true);
    if (next === 4) playTrack('love', true);
  }, [playTrack]);

  const saveEcho = useCallback(() => {
    if (generationTimerRef.current !== null) window.clearTimeout(generationTimerRef.current);
    setCardStyle(suggestCardStyle('here', note, photoAdded));
    setStylePreviewed(false);
    setGenerating(true);
    generationTimerRef.current = window.setTimeout(() => {
      generationTimerRef.current = null;
      setIntroStep(5);
      setGenerating(false);
      setSaved(true);
      setPromptVisible(false);
      setScene(2);
    }, 950);
  }, [note, photoAdded]);

  const regenerateCardStyle = useCallback(() => {
    setCardStyle((previous) => {
      const alternatives = CARD_STYLES.filter((style) => style !== previous);
      return alternatives[Math.floor(Math.random() * alternatives.length)];
    });
    setStylePreviewed(true);
  }, []);

  const clearCandidate = useCallback(() => {
    setLatentEnabled(false);
    setPromptVisible(false);
    setSettingsOpen(false);
    setCandidateMenuOpen(false);
    setCandidateGuideMode('main');
    setNoteOpen(false); setNote(''); setPhotoAdded(false);
    setScene(0);
  }, []);

  const openSettings = useCallback(() => { setSettingsEntryGuide(false); setSettingsGuideStep(scene === 4 && blurLocationEnabled ? 1 : 0); setSettingsOpen(true); }, [scene, blurLocationEnabled]);
  const closeSettings = useCallback(() => { setSettingsOpen(false); setSettingsEntryGuide(false); setSettingsVisited(true); }, []);

  const beginReplay = useCallback(() => {
    setIntroStep(5);
    setMemoryOpen(false);
    setScene(scene === 4 ? 5 : scene === 2 ? 3 : scene);
    playTrack('here', true);
  }, [playTrack, scene]);

  const resetExperience = useCallback((showIntro: boolean) => {
    if (generationTimerRef.current !== null) { window.clearTimeout(generationTimerRef.current); generationTimerRef.current = null; }
    stopAudio();
    if (hereAudioRef.current) hereAudioRef.current.currentTime = 0;
    if (loveAudioRef.current) loveAudioRef.current.currentTime = 0;
    setIntroStep(showIntro ? 0 : 5); setIntroAnswer(null); setCompetitorIndex(0);
    setScene(0); setPromptVisible(true); setNoteOpen(false); setNote(''); setPhotoAdded(false); setCardStyle('rain'); setStylePreviewed(false); setSaved(false);
    setMemoryOpen(false); setSettingsOpen(false); setSettingsEntryGuide(false); setSettingsVisited(false); setSettingsGuideStep(0); setBlurLocationEnabled(true); setCandidateMenuOpen(false); setCandidateGuideMode('main'); setLocationReminder(false); setLatentEnabled(true); setCurrentTime(0); setGenerating(false);
    if (!showIntro) playTrack('here', true);
  }, [playTrack, stopAudio]);
  const resetDemo = useCallback(() => resetExperience(false), [resetExperience]);
  const showIntro = useCallback(() => resetExperience(true), [resetExperience]);

  const enterDemo = useCallback(() => {
    setIntroStep(5);
    setScene(0);
    setPromptVisible(true);
    if (!playingTrack) playTrack('here', true);
  }, [playTrack, playingTrack]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: ToolDefinition) => {
      try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); }
      catch { /* WebMCP is optional; the visible prototype remains fully usable. */ }
    };
    register({
      name: 'navigate_echo_scene', title: '切换回声演示场景', description: '在QQ音乐回声Demo中切换到指定的六步演示场景。',
      inputSchema: { type: 'object', properties: { scene: { type: 'integer', minimum: 1, maximum: 6 } }, required: ['scene'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const value = (input as { scene?: unknown })?.scene;
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 6) throw new Error('scene必须是1到6之间的整数');
        goToScene((value - 1) as SceneId); return { scene: value, title: sceneNames[value - 1] };
      },
    });
    register({
      name: 'confirm_echo_memory', title: '生成回声卡片', description: '将首尔行程的演示记录生成私人回忆卡片，并收进「我的」。',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute() { saveEcho(); return { status: 'saved', memory: '首尔的第一段路' }; },
    });
    register({
      name: 'play_echo_route', title: '听回那段路', description: '留在播放器中回听首尔行程，直接播放内置的30秒歌曲预览。',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute() { beginReplay(); return { status: 'replay_started', track: 'Here', audio: 'embedded_preview' }; },
    });
    return () => lifecycle.abort();
  }, [beginReplay, goToScene, saveEcho]);

  const activeScene = scenes[scene];
  const herePlaying = playingTrack === 'here';
  const lovePlaying = playingTrack === 'love';
  let guide: Guide | null = null;
  if (settingsOpen) {
    guide = settingsGuideStep === 0
      ? { id: 'settings-blur', target: 'settings-blur', cue: '点这里，控制地点线索', title: '地点线索由你决定', reason: '可只留模糊位置，也可关闭。' }
      : settingsGuideStep === 1
        ? !blurLocationEnabled
          ? { id: 'settings-restore-blur', target: 'settings-blur', cue: '再点一次，开启模糊位置', title: '需要时可以重新开启', reason: '开启模糊位置后，才能选择地点提醒。' }
          : { id: 'settings-reminder', target: 'settings-reminder', cue: '点这里，开启地点提醒', title: '选择是否在旧地点重逢', reason: '地点提醒默认关闭，开启后才会出现。' }
        : { id: 'settings-close', target: 'settings-close', cue: '点这里，回到卡片', title: '回到你的回忆卡', reason: '设置已保存，随时还能修改。' };
  } else if (memoryOpen) {
    guide = scene === 3 || scene === 5
      ? { id: 'memory-close', target: 'memory-close', cue: '点这里，继续听歌', title: '回忆看完，回到音乐', reason: '这张卡片可随时再打开。关闭它就回到原播放器，不必重复走一遍回听流程。' }
      : { id: 'memory-replay', target: 'memory-replay', cue: '点这里，听回那段路', title: '卡片是入口，音乐仍是主角', reason: '一张卡片把声音、路线和你的话收在一起；点击后回到原播放器继续听。《Here》用 30 秒原曲预览演示。' };
  } else if (scene === 0 && promptVisible && latentEnabled) {
    guide = { id: 'echo-open', target: 'echo-open', cue: '点这里，决定是否留住', title: '回声，让音乐和生活再次相遇', reason: '它在原本的听歌体验中发现值得回看的片段，先问你要不要留住；只有你确认，才把音乐、时间与自选的地点做成私人卡片。以后重听或重访，卡片从播放器里轻轻出现，音乐继续播放。' };
  } else if (scene === 1) {
    guide = candidateMenuOpen
      ? { id: 'candidate-cancel', target: 'candidate-cancel', cue: '点这里，撤回候选', title: '未确认的回声可以撤回', reason: '尚未保存的线索应允许直接清除，避免用户担心系统擅自留住私人经历。' }
      : candidateGuideMode === 'more'
        ? { id: 'candidate-more', target: 'candidate-more', cue: '点这里，查看撤回', title: '撤回入口一直可见', reason: '右上角提供清除候选的选择，让用户明白：被识别到不等于必须被保存。' }
        : candidateGuideMode === 'listen'
          ? { id: 'candidate-listen', target: 'candidate-listen', cue: '点这里，只听歌', title: '不保存，也能继续听歌', reason: '普通听歌是完整选项。返回后轻提示仍会出现，方便重新体验主链路。' }
          : !noteOpen
            ? { id: 'candidate-note', target: 'candidate-note', cue: '先点这里，留一句话', title: '你的话会改变卡片的气质', reason: '点击后会填入一条可编辑的演示留言。文字里的雨夜、灯光或街道，会影响生成卡片的色彩和构图。' }
            : !photoAdded
              ? { id: 'candidate-photo', target: 'candidate-photo', cue: '再点这里，加张照片', title: '照片让回声更像你的经历', reason: '加上照片，卡片会优先采用胶片构图。这里用 AI 生成的车窗示意图演示，不读取或上传你的本地照片。' }
              : { id: 'candidate-save', target: 'candidate-save', cue: '最后，生成回忆卡', title: '让这段回声拥有自己的样子', reason: '《Here》的沉静气质、你留下的文字和照片，共同决定卡片的色彩与构图。点击生成后，在「我的」里看到结果，还能换一种样式。' };
  } else if (scene === 2) {
    guide = settingsEntryGuide
      ? { id: 'library-settings', target: 'library-settings', cue: '点右上角，打开回声设置', title: '先从回忆卡进入设置', reason: '点击手机右上角的设置按钮，再决定是否保留模糊地点线索、是否在再次经过时收到提醒。' }
      : stylePreviewed || settingsVisited
        ? { id: 'library-card', target: 'library-card', cue: '点这张卡，打开回声', title: '一段经历，一张独有的卡片', reason: '卡片会保留刚才选择的视觉和设置。点击卡片，就能听回那段路。' }
        : { id: 'library-style', target: 'library-style', cue: '点这里，换一种卡片视觉', title: 'AI 让回忆卡有了个人形状', reason: '原型会根据《Here》的歌曲气质、留言关键词和有无照片选择视觉样式；这里可再随机换款，卡片会立即改变。此 Demo 用本地样式模拟生成逻辑，未接入在线模型。' };
  } else if (scene === 3) {
    guide = { id: 'stage-next', target: 'stage-next', cue: '点这里，继续下一幕', title: '同一首歌，回声在播放器里', reason: '再次听《Here》时，已保存的卡片从播放器底部出现。接下来换一首歌，看看经过同一地点时会发生什么。' };
  } else if (scene === 4) {
    guide = locationReminder && blurLocationEnabled
      ? { id: 'player-hint-4', target: 'player-hint', cue: '点这里，打开旧回声', title: '新歌播放时，旧地点带回旧歌', reason: '此时正在听《Love Lee》。再次经过望远洞，轻提示告诉你这里曾与《Here》相连；点击后才打开原来的卡片。' }
      : { id: 'player-settings', target: 'player-settings', cue: '点这里，开启地点提醒', title: '地点提醒需要你先开启', reason: '你尚未开启地点回声提醒，所以这里不会自动弹出卡片。打开设置并开启提醒后，再次经过时才会出现轻提示。' };
  } else if (scene === 5) {
    guide = { id: 'complete-restart', target: 'complete-restart', cue: '点这里，从头体验', title: '回声留在这里，音乐继续', reason: '从头体验完整链路。' };
  }

  return (
    <main className={`demo-shell ${introStep < 5 ? 'is-intro' : ''}`}>
      <audio
        ref={hereAudioRef} src={TRACKS.here.preview} preload="auto"
        onTimeUpdate={(event) => { if (activeTrackRef.current === 'here') setCurrentTime(event.currentTarget.currentTime); }}
        onLoadedMetadata={(event) => { if (activeTrackRef.current === 'here') setDuration(event.currentTarget.duration || 30); }}
        onPlay={() => { if (activeTrackRef.current === 'here') setPlayingTrack('here'); }}
        onPause={() => { if (activeTrackRef.current === 'here') setPlayingTrack(null); }}
        onEnded={() => { if (activeTrackRef.current === 'here') setPlayingTrack(null); }}
      />
      <audio
        ref={loveAudioRef} src={TRACKS.love.preview} preload="auto"
        onTimeUpdate={(event) => { if (activeTrackRef.current === 'love') setCurrentTime(event.currentTarget.currentTime); }}
        onLoadedMetadata={(event) => { if (activeTrackRef.current === 'love') setDuration(event.currentTarget.duration || 30); }}
        onPlay={() => { if (activeTrackRef.current === 'love') setPlayingTrack('love'); }}
        onPause={() => { if (activeTrackRef.current === 'love') setPlayingTrack(null); }}
        onEnded={() => { if (activeTrackRef.current === 'love') setPlayingTrack(null); }}
      />
      {introStep < 5 ? <EchoIntro step={introStep as IntroStep} answer={introAnswer} competitorIndex={competitorIndex} onCompetitor={setCompetitorIndex} onAnswer={(value) => { setIntroAnswer(value); setIntroStep(1); }} onNext={() => setIntroStep((value) => Math.min(value + 1, 4) as IntroStep)} onGoToStep={setIntroStep} onEnter={enterDemo} onSkip={enterDemo} /> : <>
      <aside className="story-panel" ref={storyRef}>
        <div className="brand-row">
          <div className="qq-mark"><Radio /></div><div><p>QQ音乐 · AI音乐记忆</p><h1>回声</h1></div>
          <div className="brand-actions"><button className="intro-guide-button" type="button" onClick={showIntro}>概念引导</button><button className="reset-button" type="button" onClick={resetDemo}><RefreshCcw />重置</button></div>
        </div>
        <div className="story-copy"><h2>音乐与生活，<br />再次相遇。</h2><span>回声从连续聆听中发现值得留存的片段。经你确认后，音乐、时间与地点成为一张私人卡片；日后重听或重访，它在播放器里轻轻浮现，歌曲继续播放。</span></div>
        <div className="story-guide-slot"><GuideRationale guide={guide} scene={scene} onTryCancel={() => { setCandidateGuideMode('more'); setCandidateMenuOpen(false); }} onTryListen={() => { setCandidateGuideMode('listen'); setCandidateMenuOpen(false); }} onResume={() => { setCandidateGuideMode('main'); setCandidateMenuOpen(false); }} onShowSettingsEntry={() => setSettingsEntryGuide(true)} onReturnToCard={() => setSettingsEntryGuide(false)} onNextScenario={() => goToScene(4)} onRestart={resetDemo} /></div>
        <nav className="scene-list" aria-label="完整体验链路">
          {scenes.map((item, index) => (
            <button key={item.no} className={scene === index ? 'is-active' : ''} type="button" onClick={() => goToScene(index as SceneId)}>
              <span>{item.no}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span>{scene === index && <i />}
            </button>
          ))}
        </nav>
        <div className="principle-row"><Sparkles /><span>AI 回忆卡：让歌曲、留言与照片，长成你的专属视觉</span></div>
        <GuidePointer guide={guide} containerRef={storyRef} />
      </aside>
      <section className="prototype-stage" aria-label="QQ音乐回声交互原型">
        <div className="stage-meta"><span>虚构记录 · 交互演示</span><i /><span>{activeScene.no} / {activeScene.title}</span></div>
        <div className="phone-frame" ref={phoneRef}>
          {scene === 0 && <HomeRevealScreen promptVisible={promptVisible && latentEnabled} playing={herePlaying} hasPlaceContext={blurLocationEnabled} onToggle={() => playTrack('here')} onOpen={() => setScene(1)} onDismiss={() => setPromptVisible(false)} onMine={() => saved && setScene(2)} />}
          {scene === 1 && <RouteCandidateScreen note={note} onNoteChange={setNote} noteOpen={noteOpen} onToggleNote={() => { if (!noteOpen && !note) setNote(EXAMPLE_NOTE); setNoteOpen((value) => !value); setCandidateGuideMode('main'); }} photoAdded={photoAdded} onTogglePhoto={() => { setPhotoAdded((value) => !value); setCandidateGuideMode('main'); }} onSave={saveEcho} onDismiss={() => { setNoteOpen(false); setNote(''); setPhotoAdded(false); goToScene(0); }} onBack={() => goToScene(0)} menuOpen={candidateMenuOpen} onToggleMenu={() => setCandidateMenuOpen((value) => !value)} onCancel={clearCandidate} />}
          {scene === 2 && <EchoLibraryScreen note={note} photoAdded={photoAdded} cardStyle={cardStyle} onRegenerate={regenerateCardStyle} onOpenMemory={() => setMemoryOpen(true)} onOpenSettings={openSettings} />}
          {scene === 3 && <MusicPlayerScreen track="here" playing={herePlaying} current={activeTrackRef.current === 'here' ? currentTime : 0} duration={activeTrackRef.current === 'here' ? duration : 30} hint={{ eyebrow: saved ? '一张已保存的回声卡片' : '一段回声在这里', title: '这首歌，曾属于首尔的一段路' }} onHint={() => setMemoryOpen(true)} onToggle={() => playTrack('here')} onOpenSettings={openSettings} />}
          {scene === 4 && <MusicPlayerScreen track="love" playing={lovePlaying} current={activeTrackRef.current === 'love' ? currentTime : 0} duration={activeTrackRef.current === 'love' ? duration : 30} hint={locationReminder && blurLocationEnabled ? { eyebrow: '再次经过望远洞', title: '这里曾有《Here》陪你走过' } : undefined} onHint={() => setMemoryOpen(true)} onToggle={() => playTrack('love')} onOpenSettings={openSettings} />}
          {scene === 5 && <MusicPlayerScreen track="here" playing={herePlaying} current={activeTrackRef.current === 'here' ? currentTime : 0} duration={activeTrackRef.current === 'here' ? duration : 30} hint={{ eyebrow: '回声还在这里', title: '从仁川机场驶向望远洞的那段路' }} caption={null} onHint={() => setMemoryOpen(true)} onToggle={() => playTrack('here')} onOpenSettings={openSettings} />}
          {generating && <div className="generation-overlay"><Sparkles /><strong>正在把这段回声<br />做成你的卡片</strong><span>歌曲气质 · 留言 · 照片</span></div>}
          {memoryOpen && <SavedMemorySheet note={note} photoAdded={photoAdded} cardStyle={cardStyle} onRegenerate={regenerateCardStyle} onClose={() => setMemoryOpen(false)} onReplay={beginReplay} />}
          {settingsOpen && <SettingsSheet locationReminder={locationReminder} onChange={(value) => { setLocationReminder(value); setSettingsGuideStep(2); }} onClose={closeSettings} latentEnabled={latentEnabled} onLatentChange={setLatentEnabled} onClear={clearCandidate} blurLocationEnabled={blurLocationEnabled} onBlurLocationChange={(value) => { setBlurLocationEnabled(value); if (!value) setLocationReminder(false); setSettingsGuideStep(1); }} />}
          <GuidePointer guide={guide} containerRef={phoneRef} />
          <div className="device-home-indicator" />
        </div>
        <div className="demo-pagination">
          <button type="button" aria-label="上一步" disabled={scene === 0} onClick={() => goToScene((scene - 1) as SceneId)}><ChevronLeft /></button><span>{scene + 1} / 6</span>
          <button type="button" aria-label="下一步" disabled={scene === 5} onClick={() => goToScene((scene + 1) as SceneId)}><ChevronRight /></button>
        </div>
      </section>
      </>}
    </main>
  );
}
