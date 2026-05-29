/**
 * 곱셈 게임 - 스마트보드 에디션 코어 스크립트
 */

// -------------------------------------------------------------
// 1. Web Audio API 효과음 신시사이저
// -------------------------------------------------------------
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle(enabled) {
    this.enabled = enabled;
    if (enabled) this.init();
  }

  // 1) 키패드 터치음 (짧고 맑은 틱)
  playTap() {
    if (!this.enabled) return;
    this.init();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // 2) 정답음 (도-미-솔 상승 아르페지오)
  playCorrect() {
    if (!this.enabled) return;
    this.init();

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      
      gain.gain.setValueAtTime(0.08, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
      
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.12);
    });
  }

  // 3) 오답음 (둔탁한 하강 저음)
  playWrong() {
    if (!this.enabled) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.22);
    
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
    
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.22);
  }

  // 4) 게임 종료 휘슬음
  playGameOver() {
    if (!this.enabled) return;
    this.init();

    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.15);
    osc.frequency.linearRampToValueAtTime(660, now + 0.3);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    
    osc.start();
    osc.stop(now + 0.4);
  }

  // 5) 카운트다운 틱 (3, 2, 1)
  playCountdownTick() {
    if (!this.enabled) return;
    this.init();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5 note
    
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // 6) 카운트다운 시작! (시작)
  playCountdownStart() {
    if (!this.enabled) return;
    this.init();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime); // E6 note
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }
}

const sound = new SoundManager();


// -------------------------------------------------------------
// 2. 글로벌 변수 및 게임 상태 관리
// -------------------------------------------------------------
let playersCount = 1;
let gameDuration = 60; // 초 단위
let gameCategory = 'gugudan'; // gugudan, 19dan
let gameMode = 'timeattack'; // timeattack, survival
let selectedDans = [];

let gameTimer = null;
let gameTimeLeft = 0;
let isGameRunning = false;
let isWeaknessFocusedMode = false; // 누적 약점(오답) 우선 출제 모드 플래그
let activeLobbyPlayers = Array(4).fill('new-user'); // 1~4인용 각 슬롯별 선택 유저 ('new-user' 또는 실제이름)
let isCountdownActive = false; // 카운트다운 활성화 플래그
let activeCompatMode = 'auto'; // auto, standard, compat (전자칠판 기기 호환성 모드 상태)
let isProfileRecordMode = false; // 프로필 전적 기록 모드 토글 플래그 (기본 OFF)

// 플레이어별 개별 정보 세션
let players = [];

// 플레이어 고유 네온 컬러 매칭 리스트
const PLAYER_THEMES = [
  { className: 'theme-p1', hex: '#00f2fe', label: '1번(Cyan)' },
  { className: 'theme-p2', hex: '#ff007f', label: '2번(Magenta)' },
  { className: 'theme-p3', hex: '#10b981', label: '3번(Emerald)' },
  { className: 'theme-p4', hex: '#ff7b00', label: '4번(Orange)' }
];

// 다중 디바이스 칠판 환경 터치/포인터 반응 통합 핸들러
function bindTouchInteraction(element, callback) {
  if (!element) return;

  const handler = (e) => {
    e.preventDefault(); // 더블클릭 줌, 스마트보드 스크롤 방지
    
    // 더블 트리거(touchstart와 pointerdown 중첩 실행) 방지 세마포어
    if (e.type === 'touchstart') {
      element.dataset.touchFired = 'true';
      setTimeout(() => { element.dataset.touchFired = ''; }, 350);
    } else if (e.type === 'pointerdown' && element.dataset.touchFired === 'true') {
      return;
    }
    
    callback(e);
  };

  // 1) 포인터 다운 (일반 웹 및 자동 감지 기본 브라우저 대응)
  element.addEventListener('pointerdown', (e) => {
    if (activeCompatMode === 'compat') return; // 호환성 모드에서는 터치이벤트 강제 대응
    handler(e);
  });

  // 2) 터치 스타트 (구형 내장 브라우저 및 호환 모드 강제 대응)
  element.addEventListener('touchstart', (e) => {
    const useTouch = (activeCompatMode === 'compat') || (activeCompatMode === 'auto' && !window.PointerEvent);
    if (useTouch) {
      handler(e);
    }
  }, { passive: false });

  // 3) 마우스다운 fallback (터치 미지원 PC 환경에서 호환 모드로 테스트할 때)
  element.addEventListener('mousedown', (e) => {
    if (activeCompatMode === 'compat' && !('ontouchstart' in window)) {
      handler(e);
    }
  });
}

// 호환 모드별 메타 정보 (레이블, 부설명, 상세 안내)
const COMPAT_MODE_INFO = {
  auto: {
    icon: '⚡',
    label: '자동 감지',
    sub: 'PC · 태블릿 · 스마트폰 자동 인식',
    detail: [
      '기기와 브라우저를 자동으로 인식해 최적화합니다.',
      '대부분의 환경에서 정상 동작합니다. (권장 설정)',
      '→ 문제가 있을 때만 아래 모드로 전환하세요.'
    ],
    cssClass: null
  },
  standard: {
    icon: '🌐',
    label: '웹 브라우저',
    sub: 'PC · 태블릿 · 스마트폰 Chrome/Safari',
    detail: [
      '일반 웹 브라우저(Chrome · Safari · Edge)에 최적화합니다.',
      'PC, 태블릿, 스마트폰 모두 이 모드를 사용합니다.',
      '→ 자동 감지가 오작동할 때 강제 지정하세요.'
    ],
    cssClass: null
  },
  compat: {
    icon: '📺',
    label: '전자칠판',
    sub: '스마트보드 내장 브라우저 (효과 최소화)',
    detail: [
      '전자칠판 내장 브라우저(구형 WebView)에 최적화합니다.',
      '터치 이벤트를 강제 적용하고 그래픽 효과를 최소화합니다.',
      '→ 화면이 반응하지 않거나 버벅일 때 사용하세요.'
    ],
    cssClass: 'compat-mode-active'
  }
};

function updateCompatModeUI(showToast = false) {
  const btnCompat = document.getElementById('btn-header-compat');
  if (!btnCompat) return;

  const info = COMPAT_MODE_INFO[activeCompatMode];
  
  // 버튼 텍스트: 아이콘 + 모드명 + 부설명
  btnCompat.innerHTML = `
    ${info.icon} ${info.label}
    <span class="compat-sub">${info.sub}</span>
  `;
  btnCompat.title = info.detail.join(' ');

  // body 클래스 토글
  if (info.cssClass) {
    document.body.classList.add(info.cssClass);
  } else {
    document.body.classList.remove('compat-mode-active');
  }

  // 전환 시에만 토스트 안내 표시
  if (showToast) {
    showCompatModeToast(info);
  }
}

function showCompatModeToast(info) {
  let toast = document.getElementById('compat-mode-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'compat-mode-toast';
    toast.className = 'compat-mode-toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div class="compat-toast-header">${info.icon} <strong>${info.label}</strong> 모드로 전환됨</div>
    <div class="compat-toast-sub">${info.sub}</div>
    <ul class="compat-toast-detail">
      ${info.detail.map(d => `<li>${d}</li>`).join('')}
    </ul>
  `;

  toast.classList.remove('visible');
  // 강제 리플로우로 애니메이션 재트리거
  void toast.offsetWidth;
  toast.classList.add('visible');

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
}


// -------------------------------------------------------------
// 3. 로비 설정 & 화면 전환 제어
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initLobby();
  bindLobbyEvents();
  bindHeaderEvents();
  updateCompatModeUI(); // 호환 모드 초기화
});

function initLobby() {
  renderDanCheckboxes();
  updateLobbyUI();
}

function loadSavedUserList() {
  const container = document.getElementById('user-setup-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  const prefix = 'gopsem_game_user_';
  const users = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const name = key.substring(prefix.length);
      users.push(name);
    }
  }
  
  users.sort();
  
  // 이미 다른 슬롯에 선택되었거나 삭제된 프로필을 정제해 중복되지 않는 기본값 세팅
  let usedUsers = [];
  for (let pIdx = 0; pIdx < playersCount; pIdx++) {
    let currentSel = activeLobbyPlayers[pIdx];
    if (currentSel !== 'new-user' && users.includes(currentSel) && !usedUsers.includes(currentSel)) {
      usedUsers.push(currentSel);
    } else {
      let foundUser = 'new-user';
      for (let u of users) {
        if (!usedUsers.includes(u)) {
          foundUser = u;
          usedUsers.push(u);
          break;
        }
      }
      activeLobbyPlayers[pIdx] = foundUser;
    }
  }
  
  // 플레이어 수만큼 카드를 생성해 그리드 주입
  for (let pIdx = 0; pIdx < playersCount; pIdx++) {
    const card = document.createElement('div');
    
    // 대칭 그리드를 위한 확장 클래스 (1인 또는 3인 모드의 마지막 카드)
    let spanClass = '';
    if (playersCount === 1) {
      spanClass = 'span-2';
    } else if (playersCount === 3 && pIdx === 2) {
      spanClass = 'span-2';
    }
    
    card.className = `user-profile-setup-card theme-p${pIdx + 1} ${spanClass}`;
    
    // 기존 유저 및 새 사용자 칩 HTML 생성
    let chipsHtml = '';
    users.forEach(user => {
      chipsHtml += `
        <button type="button" class="user-chip" data-user="${user}">
          👤 ${user}
        </button>
      `;
    });
    
    chipsHtml += `
      <button type="button" class="user-chip new-user-chip" data-user="new-user">
        ➕ 새 사용자
      </button>
    `;
    
    card.innerHTML = `
      <div class="setup-card-header">
        <span>👤 플레이어 ${pIdx + 1} 설정</span>
        <span style="font-size: 0.68rem; opacity: 0.6;">실시간 프로필 세션</span>
      </div>
      <div class="user-chips-grid">
        ${chipsHtml}
      </div>
      <div class="new-user-row" id="new-user-row-${pIdx}" style="display: none;">
        <input type="text" class="input-text user-name-input" id="user-name-input-${pIdx}"
               placeholder="이름 입력 (최대 5자)" maxlength="5" autocomplete="off">
        <button type="button" class="new-user-save-btn" id="new-user-save-${pIdx}">저장</button>
      </div>
      <div class="new-user-error" id="new-user-error-${pIdx}"></div>
      <div class="user-profile-card" id="user-profile-card-${pIdx}" style="display: none;"></div>
    `;
    
    container.appendChild(card);
    
    // 개별 칩 버튼에 리스너 바인딩
    const chipBtns = card.querySelectorAll('.user-chip');
    chipBtns.forEach(btn => {
      bindTouchInteraction(btn, () => {
        if (btn.disabled) return;
        sound.playTap();
        selectUserPlayer(pIdx, btn.dataset.user);
      });
    });
    
    // 저장 버튼 — 새 사용자 등록
    const saveBtn = card.querySelector('.new-user-save-btn');
    const nameInput = card.querySelector('.user-name-input');
    const errorEl = card.querySelector('.new-user-error');

    const doSaveNewUser = () => {
      const rawName = nameInput ? nameInput.value.trim() : '';
      
      // 빈 이름이면 게임만 시작 (익명)
      if (!rawName) {
        selectUserPlayer(pIdx, 'new-user');
        return;
      }
      
      if (rawName.length > 5) {
        if (errorEl) { errorEl.textContent = '이름은 5글자 이내여야 합니다.'; }
        sound.playWrong();
        return;
      }
      
      const storageKey = 'gopsem_game_user_' + rawName;
      if (localStorage.getItem(storageKey)) {
        if (errorEl) { errorEl.textContent = `"${rawName}"은 이미 존재하는 이름입니다.`; }
        sound.playWrong();
        return;
      }
      
      // 새 프로필 생성 후 자동 선택
      const newProfile = { name: rawName, totalScore: 0, totalCorrect: 0, totalAttempts: 0, maxCombo: 0, heatmapRecords: {} };
      localStorage.setItem(storageKey, JSON.stringify(newProfile));
      sound.playCorrect();
      
      // 이 슬롯에 새 유저를 기억하고 전체 카드 재빌딩
      activeLobbyPlayers[pIdx] = rawName;
      loadSavedUserList();
    };

    if (saveBtn) bindTouchInteraction(saveBtn, doSaveNewUser);
    if (nameInput) {
      nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') doSaveNewUser();
        if (errorEl) errorEl.textContent = ''; // 입력할 때 에러 초기화
      });
    }
    
    // 프로필 적용 및 로드
    selectUserPlayer(pIdx, activeLobbyPlayers[pIdx]);
  }
}

function selectUserPlayer(pIdx, userName) {
  activeLobbyPlayers[pIdx] = userName;
  
  // 플레이어 카드 안의 활성화 상태 변경
  const cardEl = document.querySelector(`.user-profile-setup-card.theme-p${pIdx + 1}`);
  if (cardEl) {
    cardEl.querySelectorAll('.user-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.user === userName);
    });
    
    const newUserRow = cardEl.querySelector('.new-user-row');
    const errorEl   = cardEl.querySelector('.new-user-error');
    const previewEl = cardEl.querySelector('.user-profile-card');
    
    if (userName === 'new-user') {
      // 새 사용자 선택 → 이름 입력 행 표시
      if (newUserRow) newUserRow.style.display = 'flex';
      if (errorEl)   errorEl.textContent = '';
      if (previewEl) previewEl.style.display = 'none';
      // 입력창 포커스
      const inp = cardEl.querySelector('.user-name-input');
      if (inp) setTimeout(() => inp.focus(), 50);
    } else {
      // 저장된 사용자 선택 → 입력 행 숨기고 프로필 표시
      if (newUserRow) newUserRow.style.display = 'none';
      if (errorEl)   errorEl.textContent = '';
      
      const key = 'gopsem_game_user_' + userName;
      const raw = localStorage.getItem(key);
      if (raw && previewEl) {
        try {
          const data = JSON.parse(raw);
          const acc = data.totalAttempts > 0 
            ? Math.round((data.totalCorrect / data.totalAttempts) * 100) 
            : 0;
            
          const weakList = [];
          for (let combKey in data.heatmapRecords) {
            const rec = data.heatmapRecords[combKey];
            if (rec.wrongs > 0) weakList.push({ combKey, wrongs: rec.wrongs });
          }
          weakList.sort((a, b) => b.wrongs - a.wrongs);
          const topWeakStr = weakList.slice(0, 2).map(w => w.combKey).join(', ');
          
          previewEl.style.display = 'block';
          previewEl.innerHTML = `
            <div class="profile-summary-header-compact">
              <span>👤 <strong>${data.name}</strong> (누적: <strong>${data.totalScore}점</strong> | 정확도 <strong>${acc}%</strong>)</span>
              <span>최대콤보: <strong>${data.maxCombo}</strong></span>
            </div>
            ${topWeakStr
              ? `<div class="profile-weak-points-compact">⚠️ 약점: <strong>${topWeakStr}</strong></div>`
              : `<div class="profile-weak-points-compact" style="color:#a7f3d0;">🎉 약점 없음</div>`
            }
          `;
        } catch (e) {
          console.error('사용자 데이터 요약 파싱 에러:', e);
          if (previewEl) previewEl.style.display = 'none';
        }
      } else {
        if (previewEl) previewEl.style.display = 'none';
      }
    }
  }
  
  // 중복 선택 칩들 비활성화 실시간 갱신
  updateAllChipsDisabledState();
}

function updateAllChipsDisabledState() {
  for (let i = 0; i < playersCount; i++) {
    const cardEl = document.querySelector(`.user-profile-setup-card.theme-p${i + 1}`);
    if (!cardEl) continue;
    
    cardEl.querySelectorAll('.user-chip').forEach(chip => {
      const chipUser = chip.dataset.user;
      
      // 새 사용자 칩은 비활성화하지 않음
      if (chipUser === 'new-user') {
        chip.disabled = false;
        return;
      }
      
      // 본인이 선택한 칩이 아니고 타인이 선택한 경우 비활성화(disabled)
      let isTakenByOther = false;
      for (let j = 0; j < playersCount; j++) {
        if (j !== i && activeLobbyPlayers[j] === chipUser) {
          isTakenByOther = true;
          break;
        }
      }
      
      chip.disabled = isTakenByOther;
    });
  }
}

function renderDanCheckboxes() {
  const container = document.getElementById('dan-container');
  container.innerHTML = '';
  
  // 19단 레이아웃 클래스 연동
  container.classList.toggle('grid-19dan', gameCategory === '19dan');
  
  const minDan = 2;
  const maxDan = (gameCategory === 'gugudan') ? 9 : 19;
  
  for (let d = minDan; d <= maxDan; d++) {
    const card = document.createElement('div');
    card.className = 'dan-card';
    card.innerHTML = `
      <input type="checkbox" id="dan-${d}" value="${d}" checked>
      <label for="dan-${d}">${d}단</label>
    `;
    container.appendChild(card);
    
    // 체크박스 클릭 이벤트 바인딩
    const chk = card.querySelector('input');
    chk.addEventListener('change', () => {
      sound.playTap();
      saveSelectedDans();
    });
  }
  saveSelectedDans();
}

function saveSelectedDans() {
  selectedDans = [];
  const minDan = 2;
  const maxDan = (gameCategory === 'gugudan') ? 9 : 19;
  for (let d = minDan; d <= maxDan; d++) {
    const chk = document.getElementById(`dan-${d}`);
    if (chk && chk.checked) {
      selectedDans.push(d);
    }
  }
}

function updateLobbyUI() {
  // 인원수 선택 버튼 매핑
  document.querySelectorAll('.player-selector button').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.players) === playersCount);
  });
  
  // 1인 모드일 때 로비 레이아웃 최적화 클래스 주입
  const lobbyCard = document.querySelector('.lobby-card');
  if (lobbyCard) {
    lobbyCard.classList.toggle('single-player-layout', playersCount === 1);
  }
  
  // 프로필 전적 기록 모드 상태 동기화
  const profileRecordToggle = document.getElementById('profile-record-toggle');
  if (profileRecordToggle) {
    profileRecordToggle.checked = isProfileRecordMode;
  }
  
  const userSetupContainer = document.getElementById('user-setup-container');
  const btnTeacherSetup = document.getElementById('btn-teacher-setup');
  
  if (isProfileRecordMode) {
    if (userSetupContainer) userSetupContainer.style.display = 'grid';
    if (btnTeacherSetup) btnTeacherSetup.style.display = 'block';
    // 선택된 인원수에 맞춰 사용자 카드 리스트 동적 리빌딩
    loadSavedUserList();
  } else {
    if (userSetupContainer) userSetupContainer.style.display = 'none';
    if (btnTeacherSetup) btnTeacherSetup.style.display = 'none';
  }
  
  // 1인 모드 오답 클리닉 UI 토글
  const weaknessModeSetup = document.getElementById('weakness-mode-setup');
  if (weaknessModeSetup) {
    weaknessModeSetup.style.display = (playersCount === 1) ? 'block' : 'none';
  }
  
  const weaknessToggle = document.getElementById('weakness-focused-toggle');
  if (weaknessToggle) {
    weaknessToggle.checked = isWeaknessFocusedMode;
  }
  
  // 시간 선택 버튼 매핑
  document.querySelectorAll('.time-selector button').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.time) === gameDuration);
  });
  
  // 게임 종류 버튼 매핑
  document.getElementById('btn-gugudan').classList.toggle('active', gameCategory === 'gugudan');
  document.getElementById('btn-19dan').classList.toggle('active', gameCategory === '19dan');
  
  // 게임 모드 버튼 매핑
  document.querySelectorAll('.mode-selector button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === gameMode);
  });

  // 서바이벌 모드일 땐 제한 시간 설정을 숨기거나 비활성화
  const timeSetupItem = document.getElementById('time-setup-item');
  if (gameMode === 'survival') {
    timeSetupItem.style.opacity = '0.4';
    timeSetupItem.style.pointerEvents = 'none';
  } else {
    timeSetupItem.style.opacity = '1';
    timeSetupItem.style.pointerEvents = 'auto';
  }
}

function bindLobbyEvents() {
  // 오답 클리닉 토글 리스너
  const weaknessToggleBtn = document.getElementById('weakness-focused-toggle');
  if (weaknessToggleBtn) {
    weaknessToggleBtn.addEventListener('change', (e) => {
      sound.playTap();
      isWeaknessFocusedMode = e.target.checked;
    });
  }

  // 0) 프로필 전적 기록 토글 리스너
  const profileRecordToggle = document.getElementById('profile-record-toggle');
  if (profileRecordToggle) {
    profileRecordToggle.addEventListener('change', (e) => {
      sound.playTap();
      isProfileRecordMode = e.target.checked;
      if (!isProfileRecordMode) {
        // 기록 모드 꺼질 때 선택 유저들 전부 익명으로 클리어
        activeLobbyPlayers.fill('new-user');
      }
      updateLobbyUI();
    });
  }

  // 1) 인원수 선택
  document.querySelectorAll('.player-selector button').forEach(btn => {
    bindTouchInteraction(btn, () => {
      sound.playTap();
      playersCount = parseInt(btn.dataset.players);
      updateLobbyUI();
    });
  });

  // 2) 제한 시간 선택
  document.querySelectorAll('.time-selector button').forEach(btn => {
    bindTouchInteraction(btn, () => {
      sound.playTap();
      gameDuration = parseInt(btn.dataset.time);
      updateLobbyUI();
    });
  });

  // 3) 게임 종류 선택 (구구단 vs 19단)
  const btnGugudan = document.getElementById('btn-gugudan');
  const btn19dan = document.getElementById('btn-19dan');
  if (btnGugudan) {
    bindTouchInteraction(btnGugudan, () => {
      sound.playTap();
      gameCategory = 'gugudan';
      renderDanCheckboxes();
      updateLobbyUI();
    });
  }
  if (btn19dan) {
    bindTouchInteraction(btn19dan, () => {
      sound.playTap();
      gameCategory = '19dan';
      renderDanCheckboxes();
      updateLobbyUI();
    });
  }

  // 4) 게임 모드 선택 (시간 제한 vs 서바이벌)
  document.querySelectorAll('.mode-selector button').forEach(btn => {
    bindTouchInteraction(btn, () => {
      sound.playTap();
      gameMode = btn.dataset.mode;
      updateLobbyUI();
    });
  });

  // 5) 전체 선택 / 전체 해제
  const btnSelectAll = document.getElementById('btn-select-all');
  const btnDeselectAll = document.getElementById('btn-deselect-all');
  if (btnSelectAll) {
    bindTouchInteraction(btnSelectAll, () => {
      sound.playTap();
      toggleAllDans(true);
    });
  }
  if (btnDeselectAll) {
    bindTouchInteraction(btnDeselectAll, () => {
      sound.playTap();
      toggleAllDans(false);
    });
  }

  // 6) 사운드 토글
  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('change', (e) => {
      const state = e.target.checked;
      sound.toggle(state);
      updateHeaderSoundBtnUI(state);
      sound.playTap();
    });
  }

  // 7) 게임 시작
  const btnStart = document.getElementById('start-game-btn');
  if (btnStart) {
    bindTouchInteraction(btnStart, () => {
      sound.init(); // 브라우저 제스처 후 컨텍스트 재개 보장
      sound.playTap();
      if (selectedDans.length === 0) {
        alert('최소 한 개 이상의 단수를 선택해 주세요!');
        return;
      }
      startGame();
    });
  }

  // 8) 결과 화면에서 로비로
  const btnLobby = document.getElementById('lobby-btn');
  if (btnLobby) {
    bindTouchInteraction(btnLobby, () => {
      sound.playTap();
      switchScreen('lobby-screen');
    });
  }

  // 9) 결과 화면에서 재경기 → 모달 팝업으로 프로필 확인 후 시작
  const btnRestart = document.getElementById('restart-btn');
  if (btnRestart) {
    bindTouchInteraction(btnRestart, () => {
      sound.playTap();
      
      // 저장된 프로필 유저가 한 명이라도 장착되어 있는지 검사
      let hasSavedUser = false;
      if (isProfileRecordMode) {
        for (let i = 0; i < playersCount; i++) {
          if (activeLobbyPlayers[i] !== 'new-user') {
            hasSavedUser = true;
            break;
          }
        }
      }
      
      if (hasSavedUser) {
        showRestartModal();
      } else {
        // 익명 플레이어만 있거나 기록 저장 모드가 꺼져있다면 팝업 없이 즉시 시작
        startGame();
      }
    });
  }

  // 10) 재경기 모달 — 취소
  const btnModalCancel = document.getElementById('modal-cancel-btn');
  if (btnModalCancel) {
    bindTouchInteraction(btnModalCancel, () => {
      sound.playTap();
      closeRestartModal();
    });
  }

  // 11) 재경기 모달 — 확인 후 재경기
  const btnModalConfirm = document.getElementById('modal-confirm-btn');
  if (btnModalConfirm) {
    bindTouchInteraction(btnModalConfirm, () => {
      sound.playTap();
      // tempModalSelections를 activeLobbyPlayers에 반영
      for (let i = 0; i < playersCount; i++) {
        activeLobbyPlayers[i] = tempModalSelections[i];
      }
      closeRestartModal();
      startGame();
    });
  }

  // 12) 교사 설정 모달 오픈
  const btnTeacherSetup = document.getElementById('btn-teacher-setup');
  if (btnTeacherSetup) {
    bindTouchInteraction(btnTeacherSetup, () => {
      sound.playTap();
      showTeacherModal();
    });
  }

  // 13) 교사 설정 모달 닫기
  const btnTeacherClose = document.getElementById('teacher-modal-close-btn');
  if (btnTeacherClose) {
    bindTouchInteraction(btnTeacherClose, () => {
      sound.playTap();
      closeTeacherModal();
    });
  }
}

// -------------------------------------------------------------
// 3-4. 교사 설정 (사용자 관리) 모달
// -------------------------------------------------------------
function showTeacherModal() {
  const overlay = document.getElementById('teacher-modal-overlay');
  const list = document.getElementById('teacher-user-list');
  if (!overlay || !list) return;

  list.innerHTML = '';

  const prefix = 'gopsem_game_user_';
  const users = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      users.push(key.substring(prefix.length));
    }
  }
  users.sort();

  if (users.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 0.85rem; font-weight: 700;">
        등록된 사용자가 없습니다. 로비에서 새 사용자를 추가해주세요.
      </div>
    `;
    overlay.style.display = 'flex';
    return;
  }

  users.forEach(user => {
    const row = document.createElement('div');
    row.className = 'teacher-user-row';
    row.id = `teacher-row-${user}`;

    row.innerHTML = `
      <div class="teacher-user-info" id="teacher-info-${user}">
        <span class="teacher-user-name">👤 ${user}</span>
      </div>
      <div class="teacher-user-actions" id="teacher-actions-${user}">
        <button type="button" class="teacher-btn btn-edit" data-user="${user}">✏️ 수정</button>
        <button type="button" class="teacher-btn btn-delete" data-user="${user}">🗑️ 삭제</button>
      </div>
    `;

    list.appendChild(row);

    const btnEdit = row.querySelector('.btn-edit');
    const btnDelete = row.querySelector('.btn-delete');

    // 수정 모드 전환
    bindTouchInteraction(btnEdit, () => {
      sound.playTap();
      enterTeacherUserEditMode(user);
    });

    // 삭제 실행
    bindTouchInteraction(btnDelete, () => {
      sound.playTap();
      if (confirm(`"${user}" 사용자를 정말 삭제하시겠습니까?\n해당 사용자의 누적 점수와 약점 히트맵 등 모든 전적 데이터가 영구적으로 삭제됩니다.`)) {
        deleteSavedUser(user);
      }
    });
  });

  overlay.style.display = 'flex';
}

function enterTeacherUserEditMode(user) {
  const infoEl = document.getElementById(`teacher-info-${user}`);
  const actionsEl = document.getElementById(`teacher-actions-${user}`);
  if (!infoEl || !actionsEl) return;

  // 인라인 입력 폼 구성
  infoEl.innerHTML = `
    <input type="text" class="teacher-user-edit-input" id="teacher-edit-input-${user}" 
           value="${user}" placeholder="이름 (최대 5자)" maxlength="5" autocomplete="off">
  `;
  
  actionsEl.innerHTML = `
    <button type="button" class="teacher-btn btn-save" id="teacher-save-${user}">💾 저장</button>
    <button type="button" class="teacher-btn" id="teacher-cancel-${user}">취소</button>
  `;

  const inputEl = document.getElementById(`teacher-edit-input-${user}`);
  const btnSave = document.getElementById(`teacher-save-${user}`);
  const btnCancel = document.getElementById(`teacher-cancel-${user}`);

  if (inputEl) {
    setTimeout(() => inputEl.focus(), 50);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSaveTeacherEdit(user, inputEl.value.trim());
    });
  }

  bindTouchInteraction(btnSave, () => {
    sound.playTap();
    if (inputEl) doSaveTeacherEdit(user, inputEl.value.trim());
  });

  bindTouchInteraction(btnCancel, () => {
    sound.playTap();
    showTeacherModal(); // 목록 다시 그려서 원래대로 롤백
  });
}

function doSaveTeacherEdit(oldName, newName) {
  if (!newName) {
    alert('이름을 입력해주세요!');
    sound.playWrong();
    return;
  }

  if (newName.length > 5) {
    alert('이름은 5글자 이내여야 합니다.');
    sound.playWrong();
    return;
  }

  if (oldName === newName) {
    showTeacherModal();
    return;
  }

  const newKey = 'gopsem_game_user_' + newName;
  if (localStorage.getItem(newKey)) {
    alert(`"${newName}"은 이미 존재하는 이름입니다.`);
    sound.playWrong();
    return;
  }

  // 마이그레이션 실행
  const oldKey = 'gopsem_game_user_' + oldName;
  const rawData = localStorage.getItem(oldKey);
  if (rawData) {
    try {
      const data = JSON.parse(rawData);
      data.name = newName;
      localStorage.setItem(newKey, JSON.stringify(data));
      localStorage.removeItem(oldKey);
      
      // 현재 선택된 슬롯 갱신
      for (let i = 0; i < playersCount; i++) {
        if (activeLobbyPlayers[i] === oldName) {
          activeLobbyPlayers[i] = newName;
        }
      }

      sound.playCorrect();
      loadSavedUserList();
      showTeacherModal(); // 목록 갱신
    } catch (e) {
      console.error('사용자 데이터 마이그레이션 실패:', e);
      alert('오류가 발생해 수정에 실패했습니다.');
    }
  }
}

function deleteSavedUser(name) {
  const key = 'gopsem_game_user_' + name;
  localStorage.removeItem(key);

  // 현재 선택된 슬롯에서 해제
  for (let i = 0; i < playersCount; i++) {
    if (activeLobbyPlayers[i] === name) {
      activeLobbyPlayers[i] = 'new-user';
    }
  }

  sound.playCorrect();
  loadSavedUserList();
  showTeacherModal(); // 목록 갱신
}

function closeTeacherModal() {
  const overlay = document.getElementById('teacher-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}


// -------------------------------------------------------------
// 3-3. 재경기 플레이어 확인 모달
// -------------------------------------------------------------
let tempModalSelections = []; // 모달에서 임시로 수정될 플레이어 선택 배열

function showRestartModal() {
  // activeLobbyPlayers를 복사하여 모달 전용 임시 배열 초기화
  tempModalSelections = [...activeLobbyPlayers];

  const overlay = document.getElementById('restart-modal-overlay');
  const list = document.getElementById('restart-player-list');
  if (!overlay || !list) return;

  list.innerHTML = '';

  for (let i = 0; i < playersCount; i++) {
    const theme = PLAYER_THEMES[i];
    const savedName = activeLobbyPlayers[i]; // 'new-user' 또는 저장된 이름
    const isSaved = savedName !== 'new-user';
    const displayName = isSaved ? savedName : (players[i] ? players[i].name : `플레이어 ${i + 1}`);

    const row = document.createElement('div');
    row.className = 'restart-player-row' + (isSaved ? '' : ' detached');
    row.dataset.pidx = i;
    row.style.setProperty('--p-color', theme.hex);

    row.innerHTML = `
      <div class="restart-player-dot"></div>
      <div class="restart-player-info">
        <span class="restart-player-name">${displayName}</span>
        <span class="restart-player-badge ${isSaved ? 'badge-saved' : 'badge-anon'}">
          ${isSaved ? '저장된 프로필' : '익명'}
        </span>
      </div>
      ${isSaved
        ? `<button type="button" class="restart-toggle-btn" data-pidx="${i}" data-saved="${savedName}">✓ 유지</button>`
        : `<button type="button" class="restart-toggle-btn anon-only" disabled>해제 불가</button>`
      }
    `;

    list.appendChild(row);

    // 저장된 프로필이 있는 행만 토글 바인딩
    if (isSaved) {
      const toggleBtn = row.querySelector('.restart-toggle-btn');
      bindTouchInteraction(toggleBtn, () => {
        sound.playTap();
        const pidx = parseInt(toggleBtn.dataset.pidx);
        const isCurrentlyKept = tempModalSelections[pidx] !== 'new-user';

        if (isCurrentlyKept) {
          // 해제: 익명으로 전환
          tempModalSelections[pidx] = 'new-user';
          row.classList.add('detached');
          toggleBtn.textContent = '↩ 복구';
          toggleBtn.classList.add('detach-state');
          row.querySelector('.restart-player-badge').className = 'restart-player-badge badge-detached';
          row.querySelector('.restart-player-badge').textContent = '해제됨';
        } else {
          // 복구: 원래 저장된 이름으로 되돌리기
          tempModalSelections[pidx] = toggleBtn.dataset.saved;
          row.classList.remove('detached');
          toggleBtn.textContent = '✓ 유지';
          toggleBtn.classList.remove('detach-state');
          row.querySelector('.restart-player-badge').className = 'restart-player-badge badge-saved';
          row.querySelector('.restart-player-badge').textContent = '저장된 프로필';
        }
      });
    }
  }

  overlay.style.display = 'flex';
}

function closeRestartModal() {
  const overlay = document.getElementById('restart-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function toggleAllDans(checked) {
  const minDan = 2;
  const maxDan = (gameCategory === 'gugudan') ? 9 : 19;
  for (let d = minDan; d <= maxDan; d++) {
    const chk = document.getElementById(`dan-${d}`);
    if (chk) chk.checked = checked;
  }
  saveSelectedDans();
}

// -------------------------------------------------------------
// 3-2. 공통 헤더 바 (#app-header) 시스템 바인딩 & 제어
// -------------------------------------------------------------
function bindHeaderEvents() {
  const btnHome = document.getElementById('btn-header-home');
  const btnBack = document.getElementById('btn-header-back');
  const btnSound = document.getElementById('btn-header-sound');
  const btnFullscreen = document.getElementById('btn-header-fullscreen');
  const btnCompat = document.getElementById('btn-header-compat');
  
  if (btnHome) bindTouchInteraction(btnHome, handleHeaderHome);
  if (btnBack) bindTouchInteraction(btnBack, handleHeaderBack);
  
  if (btnSound) {
    // 사운드 토글 동기화
    bindTouchInteraction(btnSound, () => {
      const state = !sound.enabled;
      sound.toggle(state);
      
      // 로비 토글 스위치 동기화
      const lobbySoundToggle = document.getElementById('sound-toggle');
      if (lobbySoundToggle) lobbySoundToggle.checked = state;
      
      updateHeaderSoundBtnUI(state);
      sound.playTap();
    });
    // 최초 상태 동기화
    updateHeaderSoundBtnUI(sound.enabled);
  }
  
  if (btnFullscreen) {
    bindTouchInteraction(btnFullscreen, toggleFullscreen);
    
    // 브라우저 핫키(F11)나 Esc 등으로 전체화면 해제 시 버튼 텍스트 정합 유지
    document.addEventListener('fullscreenchange', () => {
      const isFullscreen = !!document.fullscreenElement;
      btnFullscreen.innerText = isFullscreen ? '🖥️ 전체화면 풀기' : '🖥️ 전체화면';
    });
  }
  
  if (btnCompat) {
    bindTouchInteraction(btnCompat, () => {
      sound.playTap();
      if (activeCompatMode === 'auto') {
        activeCompatMode = 'standard';
      } else if (activeCompatMode === 'standard') {
        activeCompatMode = 'compat';
      } else {
        activeCompatMode = 'auto';
      }
      updateCompatModeUI(true); // showToast=true: 전환 시 안내 팝업 표시
    });
  }
}

function updateHeaderSoundBtnUI(enabled) {
  const btnSound = document.getElementById('btn-header-sound');
  if (!btnSound) return;
  
  btnSound.classList.toggle('sound-on', enabled);
  btnSound.innerText = enabled ? '🔊 Sound' : '🔇 Mute';
}

function toggleFullscreen() {
  sound.playTap();
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`전체화면 전환 실패: ${err.message} (${err.name})`);
    });
  } else {
    document.exitFullscreen();
  }
}

function handleHeaderHome() {
  sound.playTap();
  if (isGameRunning) {
    if (confirm('게임을 중단하고 처음 화면으로 돌아가시겠습니까?')) {
      stopGame();
      switchScreen('lobby-screen');
    }
  } else {
    switchScreen('lobby-screen');
  }
}

function handleHeaderBack() {
  sound.playTap();
  if (isGameRunning) {
    if (confirm('게임을 종료하고 로비로 돌아가시겠습니까?')) {
      stopGame();
      switchScreen('lobby-screen');
    }
  } else {
    switchScreen('lobby-screen');
  }
}

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(scr => {
    scr.classList.remove('active');
  });
  const activeScr = document.getElementById(screenId);
  activeScr.classList.add('active');
  
  // 스크린 전환에 따른 상단 헤더 제어
  const btnHome = document.getElementById('btn-header-home');
  const btnBack = document.getElementById('btn-header-back');
  const statusText = document.getElementById('header-status-text');
  
  if (screenId === 'lobby-screen') {
    btnHome.classList.add('hidden');
    btnBack.classList.add('hidden');
    statusText.innerText = 'MULTIPLAYER DUEL';
  } else if (screenId === 'game-screen') {
    btnHome.classList.remove('hidden');
    btnBack.classList.remove('hidden');
    // 타이머 디스플레이 초기화
    statusText.innerText = (gameMode === 'survival') ? 'SURVIVAL' : '01:00';
  } else if (screenId === 'result-screen') {
    btnHome.classList.remove('hidden');
    btnBack.classList.remove('hidden');
    statusText.innerText = '경기 결과 SUMMARY';
  }
}


// -------------------------------------------------------------
// 4. 게임 핵심 엔진 (시뮬레이션 및 데이터 관리)
// -------------------------------------------------------------

function startGame() {
  isGameRunning = true;
  
  // 플레이어 세션 생성 및 초기화
  players = [];
  for (let i = 0; i < playersCount; i++) {
    let pName = `플레이어 ${i + 1}`;
    const selectedUser = activeLobbyPlayers[i];
    
    if (selectedUser !== 'new-user') {
      pName = selectedUser;
    } else {
      const nameInput = document.getElementById(`user-name-input-${i}`);
      if (nameInput && nameInput.value.trim() !== '') {
        pName = nameInput.value.trim();
      }
    }
    
    // 로컬스토리지 조회하여 기존 학습 기록(heatmap) 복원
    let savedHeatmap = {};
    const key = 'gopsem_game_user_' + pName;
    const dataStr = localStorage.getItem(key);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed && parsed.heatmapRecords) {
          savedHeatmap = parsed.heatmapRecords;
        }
      } catch (e) {
        console.error(`플레이어 ${i + 1} 기존 데이터 파싱 에러:`, e);
      }
    }

    players.push({
      id: i + 1,
      name: pName,
      theme: PLAYER_THEMES[i],
      score: 0,
      combo: 0,
      maxCombo: 0,
      currentIndex: 0,
      currentInput: '',
      attempts: 0,
      totalAttempts: 0,
      correctCount: 0,
      questionStartTime: performance.now(),
      eliminated: false,
      survivalTimeLeft: 6.0, // 서바이벌 문제당 제한시간 (6초)
      history: [], 
      // 누적 히트맵 기록 (로컬스토리지 병합 데이터 유지)
      heatmapRecords: savedHeatmap,
      // 이번 게임 판만의 순수 기록
      currentHeatmapRecords: {}
    });
  }

  // 게임 UI 컬럼 동적 생성
  buildGamePlayLayout();

  // 화면 전환
  switchScreen('game-screen');
  
  // 사운드 상태 텍스트 동기화
  updateHeaderSoundBtnUI(sound.enabled);

  // 모드별 게임 구동
  if (gameMode === 'survival') {
    document.querySelectorAll('.survival-timer-bar').forEach(bar => {
      bar.style.display = 'block';
    });
    // 서바이벌 모드에서는 오직 생존할 때까지만 경기하므로, 
    // 전체 제한 시간이 존재하더라도 '무한'이 될 수 있지만 사용자가 원한 "1분~10분" 내에서 
    // 시간 만료되거나 다 탈락하는 방식으로 조화롭게 진행합니다.
    gameTimeLeft = 3600; // 서바이벌 모드는 기본적으로 충분한 한 시간 한계 또는 무제한으로 설정
    document.getElementById('header-status-text').innerText = 'SURVIVAL';
  } else {
    // 일반 시간 제한 모드
    document.querySelectorAll('.survival-timer-bar').forEach(bar => {
      bar.style.display = 'none';
    });
    gameTimeLeft = gameDuration;
    updateTimerText();
  }

  // 3초 카운트다운 가동 후 끝날 때 루프 구동
  runStartCountdown();
}

// 플레이어별 세로 분할 기둥 DOM 동적 생성
function buildGamePlayLayout() {
  const container = document.getElementById('game-grid');
  container.innerHTML = '';
  
  // 칼럼 개수별 CSS Grid 조정을 위한 클래스 추가
  container.className = `players-grid-${playersCount}`;

  players.forEach((player, idx) => {
    const col = document.createElement('div');
    col.className = `player-column ${player.theme.className}`;
    col.id = `player-col-${player.id}`;
    col.style.setProperty('--p-color', player.theme.hex);
    
    // HTML 구조 주입
    col.innerHTML = `
      <div class="player-header">
        <span class="player-title">${player.name}</span>
        <div class="player-stats-top">
          <span class="player-score" id="score-display-${player.id}">0</span>
          <span class="player-combo-badge" id="combo-display-${player.id}">0 COMBO</span>
        </div>
      </div>
      
      <div class="survival-timer-bar">
        <div class="survival-timer-progress" id="survival-progress-${player.id}" style="width: 100%;"></div>
      </div>
      
      <div class="equation-panel" id="eq-panel-${player.id}">
        <div class="equation-text" id="eq-text-${player.id}">? × ?</div>
        <div class="equation-input-wrapper">
          <div class="input-glow-box" id="eq-input-${player.id}">_</div>
        </div>
      </div>
      
      <div class="keypad-wrapper">
        <div class="keypad-grid">
          <button type="button" class="key-btn" data-key="1">1</button>
          <button type="button" class="key-btn" data-key="2">2</button>
          <button type="button" class="key-btn" data-key="3">3</button>
          <button type="button" class="key-btn" data-key="4">4</button>
          <button type="button" class="key-btn" data-key="5">5</button>
          <button type="button" class="key-btn" data-key="6">6</button>
          <button type="button" class="key-btn" data-key="7">7</button>
          <button type="button" class="key-btn" data-key="8">8</button>
          <button type="button" class="key-btn" data-key="9">9</button>
          <button type="button" class="key-btn key-clear" data-key="C">C</button>
          <button type="button" class="key-btn" data-key="0">0</button>
          <button type="button" class="key-btn key-back" data-key="back">⌫</button>
        </div>
      </div>
    `;
    
    container.appendChild(col);
    
    // 키패드 터치 및 포인터 이벤트 리스너 바인딩
    const keys = col.querySelectorAll('.key-btn');
    keys.forEach(keyBtn => {
      bindTouchInteraction(keyBtn, (e) => {
        keyBtn.classList.add('active');
        handlePlayerKeyInput(player.id, keyBtn.dataset.key);
        // 터치 릴리즈 이벤트 누락 대비 100ms 강제 펄스 오프
        setTimeout(() => keyBtn.classList.remove('active'), 100);
      });
      
      // 마우스/포인터 릴리즈 시 즉시 이펙트 소거 백업 리스너
      const releaseKey = () => keyBtn.classList.remove('active');
      keyBtn.addEventListener('pointerup', releaseKey);
      keyBtn.addEventListener('pointerleave', releaseKey);
      keyBtn.addEventListener('pointercancel', releaseKey);
      keyBtn.addEventListener('touchend', releaseKey);
      keyBtn.addEventListener('touchcancel', releaseKey);
    });

    // 최초 문제 로드
    showNextQuestion(player.id);
  });
}

// 시작 전 3초 대기 카운트다운
function runStartCountdown() {
  isCountdownActive = true;
  
  const overlay = document.getElementById('countdown-overlay');
  const numberEl = document.getElementById('countdown-number');
  if (!overlay || !numberEl) return;
  
  overlay.style.display = 'flex';
  
  let count = 3;
  numberEl.innerText = count;
  numberEl.style.color = ''; // 원래 색상 리셋
  numberEl.style.textShadow = '';
  sound.playCountdownTick();
  
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      numberEl.innerText = count;
      sound.playCountdownTick();
    } else if (count === 0) {
      numberEl.innerText = '시작!';
      numberEl.style.color = '#10b981'; // 에메랄드 네온 빛으로 변경
      numberEl.style.textShadow = '0 0 50px #10b981';
      sound.playCountdownStart();
    } else {
      clearInterval(interval);
      overlay.style.display = 'none';
      
      // 카운트다운 종료
      isCountdownActive = false;
      
      // 모든 플레이어의 최초 응답 시작 시간을 이 시점으로 보정하여 3초 지연에 따른 억울함 방지
      players.forEach(p => {
        p.questionStartTime = performance.now();
      });
      
      // 실시간 게임 루프 타이머 작동 시작!
      if (gameTimer) clearInterval(gameTimer);
      gameTimer = setInterval(gameLoopTick, 100);
    }
  }, 1000);
}


// -------------------------------------------------------------
// 5. 실시간 게임 이벤트 & 채점 로직
// -------------------------------------------------------------
// 누적 데이터를 기반으로 약점 가중치를 연산하여 문제를 추출하는 헬퍼 함수
function selectWeightedWeakQuestion(player) {
  const maxMultiplier = (gameCategory === 'gugudan') ? 9 : 19;
  const candidates = [];
  
  // 선택한 단수(selectedDans)와 곱할 수(1~maxMultiplier)의 전체 조합 루프
  selectedDans.forEach(dan => {
    for (let mult = 1; mult <= maxMultiplier; mult++) {
      const key = `${dan}×${mult}`;
      const record = player.heatmapRecords[key];
      
      let weight = 1.0;
      if (record && record.attempts > 0) {
        const avgTimeMs = record.totalTimeMs / record.attempts;
        const wrongRate = record.wrongs / record.attempts;
        
        // 가중치 공식: 기본 1.0 + (오답 수 * 4.0) + (평균 응답 초 * 1.5)
        weight += (record.wrongs * 4.0) + ((avgTimeMs / 1000) * 1.5);
      }
      
      candidates.push({ dan, mult, weight });
    }
  });

  // 누적 가중치 총합 계산
  const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
  let randomVal = Math.random() * totalWeight;

  // 가중치 비례 무작위 선택
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    randomVal -= cand.weight;
    if (randomVal <= 0) {
      const answer = cand.dan * cand.mult;
      return {
        multiplicand: cand.dan,
        multiplier: cand.mult,
        answer,
        answerStr: answer.toString()
      };
    }
  }

  // fallback (예외 상황 시 안전 구동용 일반 무작위 추출)
  const fallbackDan = selectedDans[Math.floor(Math.random() * selectedDans.length)];
  const fallbackMult = Math.floor(Math.random() * maxMultiplier) + 1;
  const fallbackAns = fallbackDan * fallbackMult;
  return {
    multiplicand: fallbackDan,
    multiplier: fallbackMult,
    answer: fallbackAns,
    answerStr: fallbackAns.toString()
  };
}

function showNextQuestion(playerId) {
  const player = players[playerId - 1];
  if (player.eliminated) return;
  
  let q;
  // 1인 모드고 오답 클리닉이 켜져 있을 때 약점 우선 출제 연동
  if (playersCount === 1 && isWeaknessFocusedMode) {
    q = selectWeightedWeakQuestion(player);
  } else {
    // 기본 무작위 추출
    const maxMultiplier = (gameCategory === 'gugudan') ? 9 : 19;
    const multiplicand = selectedDans[Math.floor(Math.random() * selectedDans.length)];
    const multiplier = Math.floor(Math.random() * maxMultiplier) + 1;
    const answer = multiplicand * multiplier;
    q = {
      multiplicand,
      multiplier,
      answer,
      answerStr: answer.toString()
    };
  }
  
  player.currentQuestion = q;
  
  const eqText = document.getElementById(`eq-text-${playerId}`);
  const eqInput = document.getElementById(`eq-input-${playerId}`);
  
  eqText.innerText = `${q.multiplicand} × ${q.multiplier}`;
  eqInput.innerText = '_';
  player.currentInput = '';
  player.attempts = 0;
  player.questionStartTime = performance.now();
  
  // 서바이벌 모드 시 개인 타이머 리셋
  if (gameMode === 'survival') {
    // 콤보 및 흐른 턴수에 따라 제한시간 보정 (점점 빠르게)
    // 기본 6.0초, 20문제 통과 후엔 5.0초, 50문제 후엔 4.0초, 100문제 후엔 3.0초 한계점
    let baseTime = 6.0;
    if (player.currentIndex > 100) baseTime = 3.0;
    else if (player.currentIndex > 50) baseTime = 4.0;
    else if (player.currentIndex > 20) baseTime = 5.0;
    
    player.survivalTimeLeft = baseTime;
    updateSurvivalProgressUI(player);
  }
}

function handlePlayerKeyInput(playerId, key) {
  const player = players[playerId - 1];
  if (player.eliminated || !isGameRunning || isCountdownActive) return;
  
  sound.playTap();
  
  const q = player.currentQuestion;
  
  if (key === 'C') {
    // 클리어
    player.currentInput = '';
  } else if (key === 'back') {
    // 백스페이스
    player.currentInput = player.currentInput.slice(0, -1);
  } else {
    // 숫자 입력 (정답 최대 자릿수를 초과해 입력되는 것 방지)
    if (player.currentInput.length < q.answerStr.length) {
      player.currentInput += key;
    }
  }
  
  // 화면 입력 갱신
  const eqInput = document.getElementById(`eq-input-${playerId}`);
  eqInput.innerText = player.currentInput || '_';
  
  // 정답 자릿수와 동일해지는 순간 검사 수행 (엔터 없이 자동 검증)
  if (player.currentInput.length === q.answerStr.length) {
    player.totalAttempts++;
    player.attempts++;
    
    const isCorrect = (player.currentInput === q.answerStr);
    const now = performance.now();
    const elapsedMs = now - player.questionStartTime;
    
    // 히트맵용 약점 로그 취합
    logWeaknessData(player, q.multiplicand, q.multiplier, isCorrect, elapsedMs);

    if (isCorrect) {
      // 정답!
      sound.playCorrect();
      
      // 콤보 계산 및 콤보 뱃지 노출
      player.combo++;
      if (player.combo > player.maxCombo) {
        player.maxCombo = player.combo;
      }
      player.correctCount++;
      
      // 재시도 2회차에 맞춘 것이라면 보너스 차감 (50점 획득)
      let baseScore = 100;
      if (player.attempts > 1) {
        baseScore = 50;
      }
      
      // 피버 보너스 시스템 (재시도 중 맞춘 거면 콤보가 끊겨 1.0배 고정됨)
      let multiplierBonus = 1.0;
      if (player.combo >= 10) {
        multiplierBonus = 2.0;
      } else if (player.combo >= 5) {
        multiplierBonus = 1.5;
      }
      
      const addedScore = Math.round(baseScore * multiplierBonus);
      player.score += addedScore;
      
      // 점수 디스플레이 갱신
      document.getElementById(`score-display-${playerId}`).innerText = player.score;
      
      // 콤보 배지 노출 처리
      const comboBadge = document.getElementById(`combo-display-${playerId}`);
      if (player.combo > 0) {
        comboBadge.innerText = `${player.combo} COMBO`;
        comboBadge.classList.add('active');
      } else {
        comboBadge.classList.remove('active');
      }
      
      // 피버 효과 칼럼 보더 펄스 온
      const colEl = document.getElementById(`player-col-${playerId}`);
      if (player.combo >= 5) {
        colEl.classList.add('fever-active');
      } else {
        colEl.classList.remove('fever-active');
      }
      
      // 정답 플래시 피드백
      const panelEl = document.getElementById(`eq-panel-${playerId}`);
      if (panelEl) {
        panelEl.classList.add('flash-correct');
        setTimeout(() => {
          panelEl.classList.remove('flash-correct');
        }, 300);
      }
      
      // 다음 문제로 교체
      player.currentIndex++;
      showNextQuestion(playerId);
      
    } else {
      // 오답!
      sound.playWrong();
      
      // 콤보 폭파 및 피버 해제
      player.combo = 0;
      const comboBadge = document.getElementById(`combo-display-${playerId}`);
      if (comboBadge) comboBadge.classList.remove('active');
      
      const colEl = document.getElementById(`player-col-${playerId}`);
      if (colEl) colEl.classList.remove('fever-active');
      
      // 오답 피드백 흔들림(shake) + 적색 플래시
      const panelEl = document.getElementById(`eq-panel-${playerId}`);
      if (panelEl) {
        panelEl.classList.add('shake', 'glow-red');
        setTimeout(() => {
          panelEl.classList.remove('shake', 'glow-red');
        }, 400);
      }
      
      // 한 번만 재입력 기회를 더 줌 (문제를 교체하지 않고 입력창만 비움)
      if (player.attempts === 1) {
        player.currentInput = '';
        eqInput.innerText = '_';
      } else {
        // 두 번 모두 오답인 경우 즉시 다음 문제로 스킵
        player.currentIndex++;
        showNextQuestion(playerId);
      }
    }
  }
}

// 오답/지연 분석을 위해 개별 조합 데이터 누적
function logWeaknessData(player, a, b, isCorrect, elapsedMs) {
  const key = `${a}×${b}`;
  
  // 1) 누적용 격자 기록
  if (!player.heatmapRecords[key]) {
    player.heatmapRecords[key] = {
      attempts: 0,
      wrongs: 0,
      totalTimeMs: 0
    };
  }
  const recCum = player.heatmapRecords[key];
  recCum.attempts++;
  if (!isCorrect) recCum.wrongs++;
  recCum.totalTimeMs += elapsedMs;

  // 2) 이번 게임 판용 격자 기록
  if (!player.currentHeatmapRecords[key]) {
    player.currentHeatmapRecords[key] = {
      attempts: 0,
      wrongs: 0,
      totalTimeMs: 0
    };
  }
  const recCur = player.currentHeatmapRecords[key];
  recCur.attempts++;
  if (!isCorrect) recCur.wrongs++;
  recCur.totalTimeMs += elapsedMs;
}


// -------------------------------------------------------------
// 6. 게임 루프 타이머 (100ms 해상도)
// -------------------------------------------------------------
function gameLoopTick() {
  if (!isGameRunning) return;
  
  if (gameMode === 'survival') {
    // 1) 서바이벌 모드 개별 시간 감소 연산 (100ms 차감)
    let aliveCount = 0;
    
    players.forEach(player => {
      if (!player.eliminated) {
        aliveCount++;
        player.survivalTimeLeft -= 0.1;
        if (player.survivalTimeLeft <= 0) {
          player.survivalTimeLeft = 0;
          eliminatePlayer(player.id);
        } else {
          updateSurvivalProgressUI(player);
        }
      }
    });
    
    // 전원 탈락 시 강제 게임 오버
    if (aliveCount === 0) {
      endGame();
    }
    
  } else {
    // 2) 일반 타임어택 제한시간 감소 연산
    gameTimeLeft -= 0.1;
    if (gameTimeLeft <= 0) {
      gameTimeLeft = 0;
      updateTimerText();
      endGame();
    } else {
      // 매 틱(100ms)마다 안전하게 실시간 UI 갱신 (지연 건너뛰기 방지)
      updateTimerText();
    }
  }
}

function updateTimerText() {
  const totalSeconds = Math.ceil(gameTimeLeft);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  document.getElementById('header-status-text').innerText = `${m}:${s}`;
}

function updateSurvivalProgressUI(player) {
  const progressEl = document.getElementById(`survival-progress-${player.id}`);
  if (!progressEl) return;
  
  // 콤보/단계에 따른 최대 보정 기준시간
  let baseTime = 6.0;
  if (player.currentIndex > 100) baseTime = 3.0;
  else if (player.currentIndex > 50) baseTime = 4.0;
  else if (player.currentIndex > 20) baseTime = 5.0;
  
  const pct = Math.max(0, Math.min(100, (player.survivalTimeLeft / baseTime) * 100));
  progressEl.style.width = `${pct}%`;
  
  // 게이지 색상 변화 (30% 이하일 땐 적색 플래시 경고 느낌 유도)
  if (pct < 30) {
    progressEl.style.backgroundColor = '#ef4444';
    progressEl.style.boxShadow = '0 0 8px #ef4444';
  } else {
    progressEl.style.backgroundColor = player.theme.hex;
    progressEl.style.boxShadow = `0 0 8px ${player.theme.hex}`;
  }
}

function eliminatePlayer(playerId) {
  const player = players[playerId - 1];
  player.eliminated = true;
  
  sound.playWrong();
  
  const colEl = document.getElementById(`player-col-${playerId}`);
  if (colEl) {
    colEl.classList.add('eliminated');
    colEl.classList.remove('fever-active');
  }
  
  // 콤보 폭파
  const comboBadge = document.getElementById(`combo-display-${playerId}`);
  if (comboBadge) comboBadge.classList.remove('active');
}

function stopGame() {
  isGameRunning = false;
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
}

function endGame() {
  stopGame();
  sound.playGameOver();
  
  let statsUpdated = false;
  
  // 각 플레이어별 누적 학습 데이터 로컬스토리지 세이브 (기본 placeholder 이름 제외)
  players.forEach(player => {
    const name = player.name.trim();
    
    // 기본 placeholder 이름("플레이어 1~4" 또는 "사용자 1~6")이거나 빈 문자열인 경우 전적 저장 패스
    const isPlaceholder = /^플레이어\s*[1-4]$|^사용자\s*[1-6]$/i.test(name) || name === '';
    if (isPlaceholder) return;
    
    statsUpdated = true;
    const key = 'gopsem_game_user_' + name;
    
    // 기존 유저 요약 스탯 조회 또는 신규 생성
    let userStats = {
      name: name,
      totalScore: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      maxCombo: 0,
      heatmapRecords: {}
    };
    
    const existing = localStorage.getItem(key);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed) userStats = Object.assign(userStats, parsed);
      } catch (e) {
        console.error(`플레이어 [${name}] 기존 전적 데이터 로드 에러:`, e);
      }
    }
    
    // 이번 게임 기록 누적 병합
    userStats.totalScore += player.score;
    userStats.totalCorrect += player.correctCount;
    userStats.totalAttempts += player.totalAttempts;
    userStats.maxCombo = Math.max(userStats.maxCombo, player.maxCombo);
    userStats.heatmapRecords = player.heatmapRecords; // 이미 누적 갱신된 데이터를 덮어씌움
    
    localStorage.setItem(key, JSON.stringify(userStats));
  });
  
  // 세이브 기록 변경 시 로비 화면의 유저 리스트를 동적 업데이트
  if (statsUpdated) {
    loadSavedUserList();
  }

  // 결과 연산 및 대시보드 출력 전환
  renderResultsDashboard();
  switchScreen('result-screen');
}


// -------------------------------------------------------------
// 7. 결과 분석 대시보드 & 취약점 히트맵 렌더링
// -------------------------------------------------------------
function renderResultsDashboard() {
  const container = document.getElementById('result-grid');
  container.innerHTML = '';
  container.className = `players-grid-${playersCount}`;
  
  // 1) 순위 계산 (점수 내림차순, 동점일 경우 맞춘 개수순, 그 다음 정확도순)
  const rankedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    const accA = a.totalAttempts > 0 ? (a.correctCount / a.totalAttempts) : 0;
    const accB = b.totalAttempts > 0 ? (b.correctCount / b.totalAttempts) : 0;
    return accB - accA;
  });

  // 2) 사용자별 결과 기둥 렌더링
  players.forEach((player) => {
    // 공동 순위 대응 계산
    const rank = rankedPlayers.findIndex(p => p.score === player.score) + 1;
    let rankBadge = `${rank}위`;
    if (rank === 1) rankBadge = `🥇 1위`;
    else if (rank === 2) rankBadge = `🥈 2위`;
    else if (rank === 3) rankBadge = `🥉 3위`;

    // 통계 계산
    const accuracy = player.totalAttempts > 0 
      ? Math.round((player.correctCount / player.totalAttempts) * 100) 
      : 0;
      
    let totalCorrectTime = 0;
    let correctAttempts = 0;
    
    // 1인 모드의 탭 요약 스탯은 '이번 판' 기준으로 산출해 주는 것이 직관적임
    // 다인은 원래 누적이 없으므로 currentHeatmapRecords와 heatmapRecords가 같음
    const statSource = (playersCount === 1) ? player.currentHeatmapRecords : player.heatmapRecords;
    
    for (let key in statSource) {
      const rec = statSource[key];
      const correctTry = rec.attempts - rec.wrongs;
      if (correctTry > 0) {
        totalCorrectTime += rec.totalTimeMs;
        correctAttempts += rec.attempts;
      }
    }
    const avgSpeed = correctAttempts > 0 
      ? (totalCorrectTime / correctAttempts / 1000).toFixed(2) 
      : '0.00';

    // 최악의 약점 TOP 3 및 동적 요약 분석 카드 연산
    const weakItems = [];
    const danWrongs = {};
    for (let key in statSource) {
      const rec = statSource[key];
      const parts = key.split('×');
      const dan = parseInt(parts[0]);
      
      if (!danWrongs[dan]) danWrongs[dan] = 0;
      danWrongs[dan] += rec.wrongs;
      
      // 오답이 있거나, 평균 응답 시간이 1.5초 이상 다소 지연된 문항
      if (rec.wrongs > 0 || (rec.totalTimeMs / rec.attempts) >= 1500) {
        const avgTime = rec.totalTimeMs / rec.attempts;
        const weight = (rec.wrongs * 3.0) + (avgTime / 1000);
        weakItems.push({
          key,
          wrongs: rec.wrongs,
          avgSpeed: (avgTime / 1000).toFixed(1),
          weight
        });
      }
    }

    // 가중치(오답 횟수 및 딜레이) 기반 내림차순 정렬
    weakItems.sort((a, b) => b.weight - a.weight);

    // 최다 실수가 난 단수 추출
    let worstDan = null;
    let maxDanWrongs = 0;
    for (let dan in danWrongs) {
      if (danWrongs[dan] > maxDanWrongs) {
        maxDanWrongs = danWrongs[dan];
        worstDan = dan;
      }
    }

    // 동적 요약 분석 카드 마크업 조립
    let analysisCardHtml = '';
    if (weakItems.length === 0) {
      analysisCardHtml = `
        <div class="result-analysis-card perfect">
          <div class="analysis-comment">🎉 완벽해요! 모든 문제를 실수 없이 해결했습니다.</div>
          <div class="top-weak-list">
            <span class="perfect-tag">곱셈 마스터</span>
            <span class="perfect-tag">속도 만점</span>
          </div>
        </div>
      `;
    } else {
      let comment = '💡 약점을 보완해 오답률을 더 줄여봅시다!';
      if (worstDan && maxDanWrongs > 0) {
        comment = `💡 특히 <strong>${worstDan}단</strong> 수식에서 실수가 많았습니다!`;
      } else {
        comment = '💡 특정 조합에서 속도가 다소 지연되었습니다!';
      }
      
      const top3 = weakItems.slice(0, 3);
      const tagsHtml = top3.map(item => {
        let desc = '';
        if (item.wrongs > 0) {
          desc = `틀림 ${item.wrongs}회`;
        } else {
          desc = `${item.avgSpeed}초`;
        }
        return `<span class="weak-tag">${item.key} (${desc})</span>`;
      }).join('');

      analysisCardHtml = `
        <div class="result-analysis-card">
          <div class="analysis-comment">${comment}</div>
          <div class="top-weak-list">
            ${tagsHtml}
          </div>
        </div>
      `;
    }

    // 1인 모드 전용 취약점 히트맵 타이틀 (토글 기능 포함)
    let heatmapTitleHtml = `<span>📊 취약점 히트맵</span>`;
    if (playersCount === 1) {
      heatmapTitleHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <span>📊 취약점 히트맵</span>
          <div class="heatmap-toggle-btns">
            <button type="button" class="toggle-mini-btn active" id="toggle-current-${player.id}">이번판</button>
            <button type="button" class="toggle-mini-btn" id="toggle-cumulative-${player.id}">누적</button>
          </div>
        </div>
      `;
    }

    const col = document.createElement('div');
    col.className = `result-column ${player.theme.className}`;
    col.style.setProperty('--p-color', player.theme.hex);

    col.innerHTML = `
      <div class="result-header">
        <span class="result-user-name">${player.name}</span>
        <span class="result-rank-badge">${rankBadge}</span>
      </div>

      <div class="result-stats-grid">
        <div class="result-stat-card">
          <span class="result-stat-label">최종 점수</span>
          <span class="result-stat-value text-cyan">${player.score}점</span>
        </div>
        <div class="result-stat-card">
          <span class="result-stat-label">맞춘 문제</span>
          <span class="result-stat-value text-magenta">${player.correctCount}개</span>
        </div>
        <div class="result-stat-card">
          <span class="result-stat-label">최대 콤보</span>
          <span class="result-stat-value text-emerald">${player.maxCombo} Combo</span>
        </div>
        <div class="result-stat-card">
          <span class="result-stat-label">평균 속도 (정확도)</span>
          <span class="result-stat-value text-orange">${avgSpeed}초 (${accuracy}%)</span>
        </div>
      </div>

      ${analysisCardHtml}

      <div class="result-heatmap-sec">
        <div class="result-heatmap-title">
          ${heatmapTitleHtml}
        </div>
        <div class="result-heatmap-scroll">
          <div class="heatmap-grid" id="result-heatmap-grid-${player.id}">
            <!-- 히트맵 격자 동적 삽입 -->
          </div>
        </div>
      </div>

      <div class="result-tooltip-box" id="result-tooltip-${player.id}">
        셀을 터치하여 상세 정보를 확인하세요.
      </div>
    `;

    container.appendChild(col);

    // 1인 모드일 경우 토글 이벤트 바인딩
    if (playersCount === 1) {
      // 약간의 타임아웃을 두어 DOM 삽입 완료 후 가져옴
      setTimeout(() => {
        const btnCurrent = document.getElementById(`toggle-current-${player.id}`);
        const btnCumulative = document.getElementById(`toggle-cumulative-${player.id}`);
        
        if (btnCurrent && btnCumulative) {
          bindTouchInteraction(btnCurrent, () => {
            sound.playTap();
            btnCurrent.classList.add('active');
            btnCumulative.classList.remove('active');
            renderPlayerMiniHeatmap(player, 'current');
          });
          
          bindTouchInteraction(btnCumulative, () => {
            sound.playTap();
            btnCumulative.classList.add('active');
            btnCurrent.classList.remove('active');
            renderPlayerMiniHeatmap(player, 'cumulative');
          });
        }
      }, 50);
    }

    // 각 사용자의 미니 히트맵 렌더링 및 개별 툴팁 박스 연동 (기본은 이번 판)
    renderPlayerMiniHeatmap(player, (playersCount === 1) ? 'current' : 'cumulative');
  });
}

function renderPlayerMiniHeatmap(player, mode = 'current') {
  const container = document.getElementById(`result-heatmap-grid-${player.id}`);
  if (!container) return;

  const minDan = 2;
  const maxDan = (gameCategory === 'gugudan') ? 9 : 19;
  const maxMultiplier = (gameCategory === 'gugudan') ? 9 : 19;

  container.className = 'heatmap-grid';
  container.classList.add(gameCategory === 'gugudan' ? 'heatmap-grid-9' : 'heatmap-grid-19');
  container.innerHTML = ''; // 기존 격자 비우기

  // 모퉁이 인덱스 라벨
  const emptyCorner = document.createElement('div');
  emptyCorner.className = 'heatmap-cell index-label';
  emptyCorner.innerText = '\\';
  container.appendChild(emptyCorner);

  // 헤더 열 (1~N)
  for (let col = 1; col <= maxMultiplier; col++) {
    const headerCell = document.createElement('div');
    headerCell.className = 'heatmap-cell index-label';
    headerCell.innerText = col;
    container.appendChild(headerCell);
  }

  const tooltipEl = document.getElementById(`result-tooltip-${player.id}`);
  if (tooltipEl) {
    tooltipEl.innerText = '셀을 터치하여 상세 정보를 확인하세요.';
  }

  // 데이터 소스 매핑
  const recordSource = (mode === 'cumulative') ? player.heatmapRecords : player.currentHeatmapRecords;

  // 행 루프 (2~N단)
  for (let dan = minDan; dan <= maxDan; dan++) {
    // 행 라벨
    const rowHeader = document.createElement('div');
    rowHeader.className = 'heatmap-cell index-label';
    rowHeader.innerText = dan;
    container.appendChild(rowHeader);

    for (let mult = 1; mult <= maxMultiplier; mult++) {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.innerText = `${dan}×${mult}`;

      const key = `${dan}×${mult}`;
      const record = recordSource[key];

      if (record && record.attempts > 0) {
        const avgTimeMs = record.totalTimeMs / record.attempts;
        const wrongRate = record.wrongs / record.attempts;
        const score = (record.wrongs * 2) + (avgTimeMs / 1000);

        let levelClass = 'level-ok';
        if (wrongRate > 0.4 || score >= 3.0) {
          levelClass = 'level-danger';
        } else if (wrongRate > 0 || score >= 1.5) {
          levelClass = 'level-warning';
        }
        cell.classList.add(levelClass);

        const showInfo = () => {
          tooltipEl.innerHTML = `
            <strong>${dan}×${mult}=${dan*mult}</strong> | 
            시도: ${record.attempts} | 
            틀림: <span class="text-magenta">${record.wrongs}회</span> | 
            속도: <span class="text-emerald">${(avgTimeMs / 1000).toFixed(2)}초</span>
          `;
        };
        cell.addEventListener('pointerenter', showInfo);
        cell.addEventListener('pointerdown', showInfo);
        cell.addEventListener('click', showInfo);
      } else {
        cell.classList.add('level-none');
        const showNone = () => {
          tooltipEl.innerHTML = `<strong>${dan}×${mult}</strong> | 플레이 이력이 없습니다.`;
        };
        cell.addEventListener('pointerenter', showNone);
        cell.addEventListener('pointerdown', showNone);
        cell.addEventListener('click', showNone);
      }

      container.appendChild(cell);
    }
  }
}
