/**
 * devstudio 포팅(RTM R-J25) — jfxr 효과음 생성 명령 다리. window.__sfx
 * 화면 컨트롤러(MainCtrl)와 소리 라이브러리(Sound·Preset·Synth)를 평범한 값으로 부르는 명령으로 노출한다(devstudio 어댑터 jfxr → MCP 도구 · BYOAI).
 * 바꾸는 명령은 AngularJS $apply 안에서 — 화면·재합성이 사람 조작과 같이 따라온다. 원본은 파라미터 JSON(.jfxr), wav 는 렌더 산출물.
 */
import { Synth, ALL_PRESETS } from '../../lib';

export function installBridge(angular) {
  const scope = () => angular.element(document.body).scope();
  const ctrl = () => { const s = scope(); if (!s || !s.ctrl) { throw new Error('편집기가 아직 준비되지 않았습니다'); } return s.ctrl; };
  // $apply 는 안에서 난 예외를 삼키고 로그만 남긴다 — 잡아 두었다가 밖에서 다시 던진다
  const apply = fn => { let r, err; const s = scope(); s.$apply(() => { try { r = fn(ctrl()); } catch (e) { err = e; } }); if (err) { throw err; } return r; };
  const sound = () => ctrl().getSound();
  const params = () => {
    const out = [];
    sound().forEachParam((key, p) => out.push(Object.assign({ key, label: p.label, type: p.type, value: p.value, description: p.description },
      p.values ? { values: Object.keys(p.values) } : {}, p.minValue !== null ? { min: p.minValue, max: p.maxValue } : {}, p.locked ? { locked: true } : {})));
    return out;
  };
  const summary = () => {
    const s = sound();
    const changed = {}; s.forEachParam((key, p) => { if (p.value !== p.defaultValue) { changed[key] = p.value; } });
    return { name: s.name, duration: Math.round(s.duration() * 1000) / 1000, sampleRate: s.sampleRate.value, changed };
  };
  const render = () => new Promise((ok, no) => {
    try { new Synth(sound().serialize()).run(clip => ok(clip)); } catch (e) { no(e); }
  });
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) { s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); } return btoa(s); };
  // 파형 PNG(+ 진폭 엔벨로프) — 소리를 못 듣는 AI 가 모양을 보는 근거
  const waveform = (clip, W = 900, H = 200) => {
    const a = clip.toFloat32Array(), c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.fillStyle = '#16191d'; g.fillRect(0, 0, W, H); g.fillStyle = '#7fd1a8';
    const step = Math.max(1, Math.floor(a.length / W)); let peak = 0; for (let i = 0; i < a.length; i += 3) { peak = Math.max(peak, Math.abs(a[i])); }
    const z = peak > 0 ? Math.min(32, 0.95 / peak) : 1;
    for (let x = 0; x < W; x++) { let mn = 1, mx = -1; for (let i = x * step; i < Math.min(a.length, (x + 1) * step); i++) { mn = Math.min(mn, a[i]); mx = Math.max(mx, a[i]); } if (mx >= mn) { g.fillRect(x, H / 2 - mx * z * H / 2, 1, Math.max(1, (mx - mn) * z * H / 2)); } }
    const dur = a.length / clip.getSampleRate(); g.fillStyle = '#e4e7eb'; g.font = '12px sans-serif';
    for (let k = 0; k <= 10; k++) { const x = k / 10 * W; g.fillRect(x, H - 5, 1, 5); g.fillText((dur * k / 10).toFixed(2) + 's', x + 2, H - 7); }
    if (z > 1.05) { g.fillStyle = '#e0a24a'; g.fillText('표시 확대 ×' + z.toFixed(1), W - 110, 14); }
    return { image: c.toDataURL('image/png').split(',')[1], peakDbfs: peak > 0 ? Math.round(2000 * Math.log10(peak)) / 100 : null };
  };

  const api = {
    ready: () => { try { return !!ctrl().getSound(); } catch (e) { return false; } },
    info: () => summary(),
    params: () => params(),
    set: values => apply(() => {
      const s = sound(), bad = [];
      for (const [k, v] of Object.entries(values || {})) { if (!s[k] || typeof s[k] !== 'object' || !('value' in s[k])) { bad.push(k); continue; } s[k].value = v; }
      if (bad.length) { throw new Error('없는 파라미터: ' + bad.join(', ') + ' — params_get 으로 이름 확인'); }
      return summary();
    }),
    presets: () => ALL_PRESETS.map(p => p.name),
    preset: name => apply(c => {
      const p = ALL_PRESETS.find(x => x.name.toLowerCase().startsWith(String(name).toLowerCase()));
      if (!p) { throw new Error('없는 프리셋: ' + name + ' — ' + ALL_PRESETS.map(x => x.name).join(', ')); }
      c.applyPreset(p); return summary();
    }),
    mutate: () => apply(c => { c.mutate(); return summary(); }),
    rename: name => apply(() => { sound().name = String(name); return summary(); }),
    undo: () => apply(c => { if (c.canUndo()) { c.undo(); } return summary(); }),
    open: json => apply(() => { sound().parse(json); return summary(); }),
    serialize: () => sound().serialize(),
    preview: () => render().then(clip => Object.assign(waveform(clip), { duration: Math.round(clip.getNumSamples() / clip.getSampleRate() * 1000) / 1000 })),
    wav: () => render().then(clip => b64(new Uint8Array(clip.toWavBytes())))
  };
  for (const k of Object.keys(api)) {
    const f = api[k];
    api[k] = function () { try { const r = f.apply(null, arguments); return r && r.then ? r.catch(e => { throw new Error(String((e && e.message) || e)); }) : r; } catch (e) { throw new Error(String((e && e.message) || e)); } };
  }
  window.__sfx = api;
}
