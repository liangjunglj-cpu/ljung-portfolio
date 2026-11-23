// Free explore: walk the model at eye height. WASD / arrows + drag to look on desktop,
// a left-thumb joystick + right-thumb look on phones. Collides with circles and boxes.
import * as THREE from 'three';

export function createExplore({ canvas, isTouch, getColliders, eye = 1.7 }) {
  const st = {
    on: false, pos: new THREE.Vector3(0, eye, -98), yaw: 0, pitch: -0.04,
    vel: new THREE.Vector2(), keys: {}, look: null, joy: null
  };
  const look = new THREE.Vector3(), fwd = new THREE.Vector2(), right = new THREE.Vector2();
  const BOUNDS = { x: 58, z0: 14, z1: -214 };

  /* —— input —— */
  const KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', ShiftLeft: 'run', ShiftRight: 'run' };
  function key(e, down) {
    if (!st.on) return false;
    const k = KEYS[e.code]; if (!k) return false;
    st.keys[k] = down; return true;
  }
  // joystick element (phones)
  const joy = document.createElement('div'); joy.className = 'xp-joy'; joy.innerHTML = '<i></i>'; joy.hidden = true;
  document.body.appendChild(joy);
  const knob = joy.querySelector('i');

  function down(e) {
    if (!st.on) return false;
    const touchMove = e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.45;
    if (touchMove && !st.joy) {
      st.joy = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
      joy.hidden = false; joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px'; knob.style.transform = '';
    } else if (!st.look) st.look = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
    return true;
  }
  function move(e) {
    if (!st.on) return;
    if (st.joy && e.pointerId === st.joy.id) {
      let dx = e.clientX - st.joy.x, dy = e.clientY - st.joy.y; const l = Math.hypot(dx, dy), m = 46;
      if (l > m) { dx *= m / l; dy *= m / l; }
      st.joy.dx = dx / m; st.joy.dy = dy / m; knob.style.transform = `translate(${dx}px, ${dy}px)`;
    } else if (st.look && e.pointerId === st.look.id) {
      const dx = e.clientX - st.look.x, dy = e.clientY - st.look.y;
      st.look.x = e.clientX; st.look.y = e.clientY; st.look.moved += Math.abs(dx) + Math.abs(dy);
      const s = e.pointerType === 'mouse' ? 0.0042 : 0.0058;
      st.yaw -= dx * s; st.pitch = THREE.MathUtils.clamp(st.pitch - dy * s, -1.1, 0.9);
    }
  }
  function up(e) {
    if (st.joy && e.pointerId === st.joy.id) { st.joy = null; joy.hidden = true; }
    if (st.look && e.pointerId === st.look.id) { const m = st.look.moved; st.look = null; return m; }
    return 0;
  }

  /* —— collision: circles {x,z,r} and boxes {x,z,hw,hd} —— */
  const R = 0.35;
  function collide(p) {
    const { circles, boxes } = getColliders();
    for (const c of circles) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = c.r + R;
      if (d < min && d > 1e-5) { p.x = c.x + dx / d * min; p.z = c.z + dz / d * min; }
    }
    for (const b of boxes) {
      const nx = THREE.MathUtils.clamp(p.x, b.x - b.hw, b.x + b.hw), nz = THREE.MathUtils.clamp(p.z, b.z - b.hd, b.z + b.hd);
      const dx = p.x - nx, dz = p.z - nz, d = Math.hypot(dx, dz);
      if (d < R) {
        if (d > 1e-5) { p.x = nx + dx / d * R; p.z = nz + dz / d * R; }
        else {                                                   // inside: push out along the shallowest side
          const ox = b.hw + R - Math.abs(p.x - b.x), oz = b.hd + R - Math.abs(p.z - b.z);
          if (ox < oz) p.x += Math.sign(p.x - b.x || 1) * ox; else p.z += Math.sign(p.z - b.z || 1) * oz;
        }
      }
    }
    p.x = THREE.MathUtils.clamp(p.x, -BOUNDS.x, BOUNDS.x); p.z = THREE.MathUtils.clamp(p.z, BOUNDS.z1, BOUNDS.z0);
  }

  function update(dt) {
    if (!st.on) return null;
    fwd.set(-Math.sin(st.yaw), -Math.cos(st.yaw)); right.set(-fwd.y, fwd.x);
    let ix = (st.keys.r ? 1 : 0) - (st.keys.l ? 1 : 0), iz = (st.keys.f ? 1 : 0) - (st.keys.b ? 1 : 0);
    if (st.joy) { ix += st.joy.dx; iz -= st.joy.dy; }
    const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
    const speed = st.keys.run ? 8 : 4;
    const tx = (fwd.x * iz + right.x * ix) * speed, tz = (fwd.y * iz + right.y * ix) * speed;
    const k = 1 - Math.exp(-10 * dt);
    st.vel.x += (tx - st.vel.x) * k; st.vel.y += (tz - st.vel.y) * k;
    const p = { x: st.pos.x + st.vel.x * dt, z: st.pos.z + st.vel.y * dt };
    collide(p);
    st.pos.x = p.x; st.pos.z = p.z;
    const bob = Math.hypot(st.vel.x, st.vel.y) > 0.5 ? Math.sin(performance.now() * 0.011) * 0.025 : 0;
    st.pos.y = eye + bob;
    look.set(st.pos.x + fwd.x * Math.cos(st.pitch) * 10, st.pos.y + Math.sin(st.pitch) * 10, st.pos.z + fwd.y * Math.cos(st.pitch) * 10);
    return { pos: st.pos, look };
  }

  function enter({ x = 0, z = -98, yaw = 0 } = {}) {
    st.on = true; st.pos.set(x, eye, z); st.yaw = yaw; st.pitch = -0.04; st.vel.set(0, 0); st.keys = {};
    document.body.classList.add('exploring');
  }
  function exit() { st.on = false; st.keys = {}; st.joy = null; st.look = null; joy.hidden = true; document.body.classList.remove('exploring'); }

  return { st, enter, exit, update, key, down, move, up, get on() { return st.on; } };
}
