let spriteSheet;
let walkSheet;
let jumpSheet;
let pushSheet;
let projectileSheet;

let currentFrame = 0;
let frameCount = 0;
const frameDelay = 7;

let isWalking = false;
let isJumping = false;
let direction = 1; // 1 = 右, -1 = 左

let posX = 0; // 角色中心 X
let yOffset = 0; // 跳躍位移（負 = 向上）
let vy = 0;
const gravity = 0.8;
const jumpVelocity = -14;
const speed = 3;

let prevAnim = 'stop';
let prevSpace = false; // 用於 W 鍵偵測
let prevSpaceKey = false; // 用於 空白鍵偵測

let isPushing = false;
let pushTicks = 0; // 記錄 push 動畫播放的累積幀數

let projectiles = []; // 發射物陣列

function preload() {
  spriteSheet = loadImage('../ryu/stop1/stop1.png');
  walkSheet = loadImage('../ryu/walk/walk.png');
  jumpSheet = loadImage('../ryu/jump/jump.png');
  pushSheet = loadImage('../ryu/push/push.png');
  projectileSheet = loadImage('../ryu/push/push--.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  posX = width / 2;
}

function draw() {
  background('#8ecae6');

  // 持續偵測左右按鍵（支援長按）
  const pressingD = keyIsDown(68); // D
  const pressingA = keyIsDown(65); // A

  if (pressingD) {
    isWalking = true;
    direction = 1;
  } else if (pressingA) {
    isWalking = true;
    direction = -1;
  } else {
    isWalking = false;
  }

  // W 鍵：偵測按下事件觸發一次跳躍（若尚未在跳躍中）
  const wDown = keyIsDown(87);
  if (wDown && !prevSpace && !isJumping) {
    isJumping = true;
    vy = jumpVelocity;
    currentFrame = 0;
    frameCount = 0;
  }
  prevSpace = wDown;

  // 空白鍵：觸發 push 動作（按下觸發一次）
  const spaceDown = keyIsDown(32);
  if (spaceDown && !prevSpaceKey && !isPushing) {
    isPushing = true;
    pushTicks = 0;
    currentFrame = 0;
    frameCount = 0;
  }
  prevSpaceKey = spaceDown;

  // 水平移動（走路或跳躍期間皆可移動）
  if (pressingD) posX += speed;
  if (pressingA) posX -= speed;

  // 跳躍物理
  if (isJumping) {
    vy += gravity;
    yOffset += vy;
    if (yOffset >= 0) {
      // 回到地面
      yOffset = 0;
      vy = 0;
      isJumping = false;
    }
  }

  // 決定目前使用的動畫（jump > walk > stop）
  let anim = isPushing ? 'push' : (isJumping ? 'jump' : (isWalking ? 'walk' : 'stop'));
  if (anim !== prevAnim) {
    currentFrame = 0;
    frameCount = 0;
    prevAnim = anim;
  }

  // 更新動畫幀
  frameCount++;
  if (frameCount >= frameDelay) {
    frameCount = 0;
    if (anim === 'stop') currentFrame = (currentFrame + 1) % 10;
    else if (anim === 'walk') currentFrame = (currentFrame + 1) % 8;
    else if (anim === 'jump') currentFrame = (currentFrame + 1) % 11;
    else if (anim === 'push') currentFrame = (currentFrame + 1) % 8;
  }

  // 若正在 push，累積 ticks，當完整播放一次 push（8 幀）後生成發射物
  if (isPushing) {
    pushTicks++;
    // 每個畫面更新為一個 tick，但實際動畫幀以 frameDelay 控制
    if (pushTicks >= frameDelay * 8) {
      // 產生發射物
      spawnProjectile();
      isPushing = false;
      pushTicks = 0;
      // 切回停止或走路狀態（視當下是否按鍵）
      currentFrame = 0;
      frameCount = 0;
    }
  }

  // 根據動畫選擇圖像與幀尺寸
  let spriteImg, frameWidth, frameHeight;
  if (anim === 'stop') {
    spriteImg = spriteSheet;
    frameWidth = 1335 / 10;
    frameHeight = 180;
  } else if (anim === 'walk') {
    spriteImg = walkSheet;
    frameWidth = 827 / 8;
    frameHeight = 188;
  } else { // jump
    spriteImg = jumpSheet;
    frameWidth = 1359 / 11;
    frameHeight = 212;
  }

  if (anim === 'push') {
    spriteImg = pushSheet;
    frameWidth = 1787 / 8;
    frameHeight = 171;
  }

  // 來源 X
  let srcX = currentFrame * frameWidth;

  // 計算繪製位置：讓角色中心為 posX，垂直位置為置中加上 yOffset
  let drawX = posX - frameWidth / 2;
  let baseTopY = (height - frameHeight) / 2;
  let drawY = baseTopY + yOffset;

  // 限制角色不跑出畫面
  posX = constrain(posX, frameWidth / 2, width - frameWidth / 2);

  push();
  if (direction === -1) {
    // 翻轉顯示（以 drawX 為左上角）
    translate(drawX + frameWidth, drawY);
    scale(-1, 1);
    image(spriteImg, 0, 0, frameWidth, frameHeight, srcX, 0, frameWidth, frameHeight);
  } else {
    translate(drawX, drawY);
    image(spriteImg, 0, 0, frameWidth, frameHeight, srcX, 0, frameWidth, frameHeight);
  }
  pop();

  // 更新並繪製所有發射物
  updateProjectiles();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 產生一個發射物物件並加入陣列
function spawnProjectile() {
  // projectile sheet: 5 幀, 740x19
  const pFrameW = 740 / 5;
  const pFrameH = 19;
  // 產生位置在角色前方
  const animFrameW = (prevAnim === 'push') ? (1787 / 8) : 0;
  const spawnX = posX + direction * (animFrameW / 2 + pFrameW / 2 + 8);
  const baseTopY = (height - ((prevAnim === 'push') ? (171) : 180)) / 2;
  const spawnY = baseTopY + yOffset + ((prevAnim === 'push') ? (171 / 2 - pFrameH / 2) : 0);

  const proj = {
    x: spawnX,
    y: spawnY,
    dir: direction,
    frame: 0,
    frameCount: 0,
    frameDelay: 6,
    frameW: pFrameW,
    frameH: pFrameH,
    speed: 8,
    img: projectileSheet,
    frames: 5
  };

  projectiles.push(proj);
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    // 移動
    p.x += p.dir * p.speed;

    // 動畫
    p.frameCount++;
    if (p.frameCount >= p.frameDelay) {
      p.frameCount = 0;
      p.frame = (p.frame + 1) % p.frames;
    }

    // 繪製
    push();
    if (p.dir === -1) {
      translate(p.x + p.frameW, p.y);
      scale(-1, 1);
      image(p.img, 0, 0, p.frameW, p.frameH, p.frame * p.frameW, 0, p.frameW, p.frameH);
    } else {
      translate(p.x, p.y);
      image(p.img, 0, 0, p.frameW, p.frameH, p.frame * p.frameW, 0, p.frameW, p.frameH);
    }
    pop();

    // 移除離開畫面的發射物
    if (p.x < -p.frameW || p.x > width + p.frameW) {
      projectiles.splice(i, 1);
    }
  }
}
