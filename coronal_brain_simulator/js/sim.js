/* =========================================================================
 * sim.js — 神經訊號擴散傳導、突觸傳遞與腦微環境生理模擬引擎
 *
 * 生理合理性設計：
 *  1. 單向化學突觸定律（Dynamic Polarization）：動作電位由胞體經軸突丘沿軸突（含蘭氏結跳躍傳導）
 *     傳至突觸前終扣，釋放神經傳導物質跨越突觸間隙。
 *  2. 空間與時間總和（Spatial & Temporal Summation）：
 *     - 點選單一神經元時給予「超閾值體外電流刺激」使其立即放電，沿其軸突側枝同步傳向多個下游細胞。
 *     - 興奮性突觸產生去極化 EPSP 沿樹突向胞體衰減傳遞；抑制性突觸（籃狀細胞／MSN）產生過極化 IPSP 剎車，
 *       避免全腦無限癲癇式失控放電，呈現真實且有節律的「局部網路級聯擴散波（Cascade Wave）」。
 *     - 若使用者連續快點同一神經元（時間總和）或開啟學習增強（LTP／BDNF），原本亞閾值的二、三階神經元
 *       會跨過閾值加入放電，讓訊號擴散得更遠！
 * ========================================================================= */
(function () {
  'use strict';
  const U = BS.util, C = BS.cells;

  function createSim() {
    return {
      T: 0,
      enabled: true,        // 訊號傳導總開關 (Toggle)
      spontaneous: true,    // 背景自發放電開關 (Toggle)
      speed: 1.0,           // 傳導觀察速度倍率 (預設正常或慢動作觀察)
      isSleeping: false,
      isExercising: false,
      caffeineTimer: 0,
      learningTimer: 0,
      datRate: 1.0,         // 多巴胺/傳導物質回收速率
      bdnfLevel: 1.0,
      interactionMode: 'stimulate', // 'stimulate' | 'ischemic' | 'hemorrhage'

      spikes: [],           // { neuron, t0, gen, waveId, excit }
      psps: [],             // 突觸後樹突電位脈衝：{ syn, post, excit, t0, dur, amp, gen, waveId }
      somaRipples: [],      // 點擊或放電時胞體擴散視覺波紋
      wastes: [],           // 代謝物：{ x, y, vx, vy, type: 'adenosine'|'amyloid'|'glutamate' }
      csfParticles: [],     // 腦脊髓液／間質液流動微粒

      // 訊號級聯擴散追蹤統計（回答「點擊一個神經元擴散到多少下游細胞」）
      activeWave: null      // { id, rootNeuron, startT, recruited: Set, maxGen, ipsps }
    };
  }

  function bindScene(sim, sc) {
    sim.spikes.length = 0;
    sim.psps.length = 0;
    sim.somaRipples.length = 0;
    sim.wastes.length = 0;
    sim.csfParticles.length = 0;
    sim.activeWave = null;

    for (const n of sc.neurons) {
      n.V = 0;              // 歸一化膜電位：0 = 靜息(-70mV), 1.0 = 閾值(-55mV), <0 = 過極化
      n.refractory = 0;
      n.atp = 100;
      n.health = 100;
      n.lastFire = -10;
      n.waveGen = -1;
      n.waveTime = -10;
    }
    for (const s of sc.synapses) {
      s.nt.length = 0;
      s.bound = 0;
      s.lastRelease = -10;
      s.weight = s.baseWeight;
    }
    for (const v of sc.vessels) {
      v.clot = null;
      v.hem = null;
    }

    // 初始化間質液流動粒子與少量基礎腺苷
    const rng = new U.RNG(sc.seed ^ 0x9e3779b9);
    for (let i = 0; i < 65; i++) {
      sim.csfParticles.push({
        x: rng.range(-sc.W * 0.48, sc.W * 0.48),
        y: rng.range(-sc.H * 0.48, sc.H * 0.48),
        r: rng.range(1.6, 3.4)
      });
    }
    for (let i = 0; i < 8; i++) {
      const x = rng.range(-650, 650), y = rng.range(-400, 400);
      if (sc.archY && y < sc.archY(x) + 40) continue;
      sim.wastes.push({ x, y, vx: rng.range(-4, 4), vy: rng.range(-4, 4), type: 'adenosine' });
    }
  }

  let nextWaveId = 1;

  /**
   * 觸發神經元動作電位
   * opts: { forced, isUserClick, gen, waveId }
   */
  function fireNeuron(sim, sc, n, opts) {
    opts = opts || {};
    if (!sim.enabled && !opts.forced) return false;
    if (!opts.forced && (n.refractory > 0 || n.atp < 8)) return false;

    n.V = 0;
    n.refractory = n.virtual ? 0.22 : 0.34;
    if (!n.virtual) n.atp = Math.max(0, n.atp - 4.5);
    n.lastFire = sim.T;

    let waveId = opts.waveId || 0;
    let gen = opts.gen != null ? opts.gen : 0;

    if (opts.isUserClick) {
      waveId = nextWaveId++;
      gen = 0;
      sim.activeWave = {
        id: waveId,
        root: n,
        startT: sim.T,
        recruited: new Set([n.id]),
        synHits: 0,
        ipspBlocks: 0,
        maxGen: 0
      };
    } else if (waveId && sim.activeWave && sim.activeWave.id === waveId && !n.virtual) {
      sim.activeWave.recruited.add(n.id);
      if (gen > sim.activeWave.maxGen) sim.activeWave.maxGen = gen;
    }

    if (!n.virtual) {
      n.waveGen = gen;
      n.waveTime = sim.T;
      sim.somaRipples.push({
        x: n.x, y: n.y, r0: n.r,
        t0: sim.T,
        excit: n.excit,
        isRoot: !!opts.isUserClick,
        gen
      });
    }

    if (n.axon) {
      const sp = {
        neuron: n,
        t0: sim.T,
        endT: sim.T + n.axon.maxT + 0.12,
        gen,
        waveId,
        excit: n.excit,
        released: new Set()
      };
      sim.spikes.push(sp);
    }
    return true;
  }

  function releaseSynapse(sim, syn, sp) {
    syn.lastRelease = sim.T;
    if (sp.waveId && sim.activeWave && sim.activeWave.id === sp.waveId) {
      sim.activeWave.synHits++;
    }
    // 釋放突觸囊泡神經傳導物質微粒
    const count = 6;
    for (let i = 0; i < count; i++) {
      syn.nt.push({
        p: 0,
        wOff: (Math.random() - 0.5) * 4.5,
        vw: (Math.random() - 0.5) * 6,
        gen: sp.gen,
        waveId: sp.waveId
      });
    }
    // Hebbian LTP 突觸強化（前後神經元近期共同活化）
    if (Math.abs(syn.pre.lastFire - syn.post.lastFire) < 0.55) {
      syn.weight = Math.min(2.0, syn.weight + 0.08 * sim.bdnfLevel);
    }
  }

  function step(sim, sc, rawDt) {
    if (!sc) return;
    const dt = rawDt * (sim.enabled ? sim.speed : 0.35);
    sim.T += dt;

    if (sim.caffeineTimer > 0) sim.caffeineTimer = Math.max(0, sim.caffeineTimer - rawDt);
    if (sim.learningTimer > 0) {
      sim.learningTimer = Math.max(0, sim.learningTimer - rawDt);
      if (sim.enabled && Math.random() < 0.24 && sc.real.length) {
        const pick = sc.real[Math.floor(Math.random() * sc.real.length)];
        fireNeuron(sim, sc, pick, { forced: false });
      }
    }
    sim.bdnfLevel = U.lerp(sim.bdnfLevel, sim.isExercising ? 2.2 : 1.0, 0.04);

    // 1. 血管紅血球流動與中風出血代謝物
    for (const v of sc.vessels) {
      const rbcSpeed = v.clot ? 6 : (sim.isExercising ? 115 : 58);
      for (const rbc of v.rbcs) {
        if (v.clot && Math.abs(rbc.s - v.clot.s) < 26) continue;
        rbc.s = (rbc.s + rbcSpeed * rawDt) % v.len;
      }
      if (v.hem && Math.random() < 0.18 && sim.wastes.length < 180) {
        sim.wastes.push({
          x: v.hem.x + (Math.random() - 0.5) * 70,
          y: v.hem.y + (Math.random() - 0.5) * 70,
          vx: (Math.random() - 0.5) * 18,
          vy: (Math.random() - 0.5) * 18,
          type: 'glutamate'
        });
      }
    }

    // 2. 星形膠質細胞：睡眠時收縮 35% 打開類淋巴排毒通道；清醒時輸送乳酸補充神經元 ATP
    const targetScale = sim.isSleeping ? 0.68 : 1.0;
    for (const a of sc.astros) {
      a.baseScale = U.lerp(a.baseScale || 1, targetScale, 0.06);
    }

    // 3. 神經元膜電位衰減、ATP 代謝與背景自發放電
    const adenoCount = sim.wastes.filter((w) => w.type === 'adenosine').length;
    const fatigue = sim.caffeineTimer > 0 ? 0 : Math.min(0.8, adenoCount / 90);

    for (const n of sc.neurons) {
      if (n.refractory > 0) n.refractory = Math.max(0, n.refractory - dt);
      // 膜電位指數漏電回歸靜息態 (tau ≈ 0.42s 方便肉眼觀察空間與時間總和)
      n.V *= Math.exp(-dt / 0.42);

      if (n.virtual) {
        if (sim.enabled && sim.spontaneous && !sim.isSleeping) {
          const rate = n.afferent ? 0.55 : 0.42;
          if (Math.random() < rate * dt) fireNeuron(sim, sc, n, {});
        }
        continue;
      }

      // 檢查鄰近中風缺血或出血興奮毒性
      let ischemic = false;
      for (const v of sc.vessels) {
        if (v.clot && U.dist(n.x, n.y, v.clot.x, v.clot.y) < 340) ischemic = true;
        if (v.hem && U.dist(n.x, n.y, v.hem.x, v.hem.y) < 320) ischemic = true;
      }
      if (ischemic) {
        n.atp = Math.max(0, n.atp - 9 * rawDt);
        n.health = Math.max(25, n.health - 4 * rawDt);
        if (sim.enabled && Math.random() < 0.03) fireNeuron(sim, sc, n, { forced: true });
      } else {
        n.atp = Math.min(100, n.atp + (sim.isSleeping ? 10 : 4.8) * sim.bdnfLevel * rawDt);
        n.health = Math.min(100, n.health + 1.5 * rawDt);
      }

      // 背景低頻自發放電
      if (sim.enabled && sim.spontaneous) {
        const baseRate = sim.isSleeping ? 0.05 : 0.22 * (1 - fatigue * 0.72) * (sim.caffeineTimer > 0 ? 1.45 : 1.0);
        if (Math.random() < baseRate * dt && n.atp > 18) {
          fireNeuron(sim, sc, n, {});
        }
      }

      // 清醒高頻活動產生少量腺苷與類澱粉代謝物
      if (!sim.isSleeping && Math.random() < 0.012 && sim.wastes.length < 150) {
        const wx = n.x + (Math.random() - 0.5) * 110;
        const wy = n.y + (Math.random() - 0.5) * 110;
        if (!sc.archY || wy > sc.archY(wx) + 40) {
          sim.wastes.push({
            x: wx, y: wy,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            type: Math.random() < 0.8 ? 'adenosine' : 'amyloid'
          });
        }
      }
    }

    // 4. 推進軸突動作電位與觸發突觸前終扣釋放
    if (sim.enabled) {
      for (let i = sim.spikes.length - 1; i >= 0; i--) {
        const sp = sim.spikes[i];
        const tau = sim.T - sp.t0;
        const ax = sp.neuron.axon;
        if (!ax) { sim.spikes.splice(i, 1); continue; }

        for (let pIdx = 0; pIdx < ax.paths.length; pIdx++) {
          const path = ax.paths[pIdx];
          if (path.synapse && tau >= path.tEnd && !sp.released.has(pIdx)) {
            sp.released.add(pIdx);
            const syn = sp.neuron.outputs.find((s) => s.path === path);
            if (syn) releaseSynapse(sim, syn, sp);
          }
        }
        if (sim.T > sp.endT) sim.spikes.splice(i, 1);
      }

      // 5. 突觸間隙傳導物質擴散、DAT 回收與受體結合 → 產生樹突 EPSP / IPSP
      for (const syn of sc.synapses) {
        if (syn.bound > 0) syn.bound = Math.max(0, syn.bound - dt * 2.2);
        let delivered = 0;
        let lastMeta = null;

        for (let k = syn.nt.length - 1; k >= 0; k--) {
          const m = syn.nt[k];
          m.p += dt * 3.1;
          m.wOff += m.vw * dt;
          // DAT 多巴胺/傳導物質回收轉運體抽離
          if (Math.random() < 0.22 * sim.datRate * dt * 6) {
            syn.nt.splice(k, 1);
            continue;
          }
          if (m.p >= 1) {
            delivered++;
            lastMeta = m;
            syn.nt.splice(k, 1);
          }
        }

        if (delivered > 0 && !syn.post.virtual) {
          syn.bound = 1.0;
          const datFactor = 1 / Math.pow(sim.datRate, 0.55);
          // 單一興奮性突觸約貢獻 0.52~0.78 閾值（若剛有自發背景電位、LTP/BDNF 強化或雙路徑匯聚即可跨過 1.0 閾值擴散！）
          // 根節點剛被使用者點擊（gen === 0）時給予較飽滿的第一跳突觸釋放，確保點擊必能看到第一波下游擴散與後續級聯
          const rootBoost = lastMeta && lastMeta.gen === 0 ? 1.48 : 1.0;
          const bdnfBoost = 0.88 + 0.18 * sim.bdnfLevel;
          const rawAmp = (delivered / 5) * 0.62 * syn.weight * datFactor * rootBoost * bdnfBoost;
          const dur = Math.max(0.06, syn.psLen / 420);

          sim.psps.push({
            syn,
            post: syn.post,
            excit: syn.excit,
            t0: sim.T,
            dur,
            amp: rawAmp,
            gen: lastMeta ? lastMeta.gen + 1 : 1,
            waveId: lastMeta ? lastMeta.waveId : 0
          });
        }
      }

      // 6. 突觸後電位（EPSP / IPSP）沿樹突傳向胞體整合，跨過閾值即觸發下一階動作電位！
      for (let i = sim.psps.length - 1; i >= 0; i--) {
        const psp = sim.psps[i];
        const prog = (sim.T - psp.t0) / psp.dur;
        if (prog >= 1) {
          const post = psp.post;
          // 樹突電纜距離微幅衰減
          const cableAtten = Math.exp(-psp.syn.psLen / 950);
          if (psp.excit) {
            const fatigueScale = 1 - fatigue * 0.45;
            post.V += psp.amp * cableAtten * fatigueScale;
            if (post.V >= 1.0 && post.refractory <= 0 && post.atp >= 8) {
              // 限制單次級聯最大代數為 5 代以防迴圈永動，保留真實神經迴路節律
              if (psp.gen <= 5) {
                fireNeuron(sim, sc, post, { gen: psp.gen, waveId: psp.waveId });
              }
            }
          } else {
            // GABA 抑制性突觸過極化（分流抑制 Shunting inhibition）
            post.V = Math.max(-0.65, post.V - psp.amp * 0.85);
            if (psp.waveId && sim.activeWave && sim.activeWave.id === psp.waveId) {
              sim.activeWave.ipspBlocks++;
            }
          }
          sim.psps.splice(i, 1);
        }
      }
    }

    // 7. 清理胞體波紋
    for (let i = sim.somaRipples.length - 1; i >= 0; i--) {
      if (sim.T - sim.somaRipples[i].t0 > 0.85) sim.somaRipples.splice(i, 1);
    }

    // 8. 類淋巴排毒與微膠細胞趨化吞噬
    for (let i = sim.wastes.length - 1; i >= 0; i--) {
      const w = sim.wastes[i];
      w.x += w.vx * rawDt;
      w.y += w.vy * rawDt;
      if (sim.isSleeping) {
        w.y -= 95 * rawDt;
        w.x += Math.sin(w.y * 0.02 + sim.T * 3.5) * 28 * rawDt;
        const topLim = sc.archY ? sc.archY(w.x) - 20 : -sc.H * 0.5;
        if (w.y < topLim) { sim.wastes.splice(i, 1); continue; }
      }
    }

    for (const mg of sc.micro) {
      if (mg.eat > 0) mg.eat = Math.max(0, mg.eat - rawDt);
      let nearest = null, minD = 320;
      for (const w of sim.wastes) {
        const d = U.dist(mg.x, mg.y, w.x, w.y);
        if (d < minD) { minD = d; nearest = w; }
      }
      if (nearest) {
        const ang = Math.atan2(nearest.y - mg.y, nearest.x - mg.x);
        mg.vx = U.lerp(mg.vx, Math.cos(ang) * 42, 0.08);
        mg.vy = U.lerp(mg.vy, Math.sin(ang) * 42, 0.08);
        if (minD < 24) {
          const idx = sim.wastes.indexOf(nearest);
          if (idx !== -1) sim.wastes.splice(idx, 1);
          mg.eat = 0.55;
        }
      } else {
        mg.vx = U.lerp(mg.vx, Math.cos(sim.T * 0.7 + mg.wander) * 8, 0.04);
        mg.vy = U.lerp(mg.vy, Math.sin(sim.T * 0.7 + mg.wander) * 8, 0.04);
      }
      mg.x = U.clamp(mg.x + mg.vx * rawDt, -sc.W * 0.44, sc.W * 0.44);
      const minY = sc.archY ? sc.archY(mg.x) + 75 : -sc.H * 0.44;
      mg.y = U.clamp(mg.y + mg.vy * rawDt, minY, sc.H * 0.44);
    }

    for (const p of sim.csfParticles) {
      if (sim.isSleeping) {
        p.y -= 115 * rawDt;
        if (p.y < -sc.H * 0.48) p.y = sc.H * 0.48;
      } else {
        p.x += 14 * rawDt;
        if (p.x > sc.W * 0.48) p.x = -sc.W * 0.48;
      }
    }
  }

  BS.sim = {
    createSim,
    bindScene,
    fireNeuron,
    step
  };
})();
