import * as THREE from "three";
import type { SceneState } from "../SceneState";

export interface PointerImpulse {
  x: number;
  y: number;
  positionX: number;
  positionY: number;
}

export interface SceneMotion {
  progress: number;
  workVisibility: number;
  lightMix: number;
  servicesMix: number;
  contactMix: number;
  portalProgress: number;
  heroExit: number;
  workEntry: number;
  workExit: number;
  paleFlatten: number;
  portalTravel: number;
  portalReveal: number;
  workMediaProgress: number;
  finaleProgress: number;
  transitionMix: number;
  transitionSpin: number;
  cameraDive: number;
  reveal: number;
  rotationX: number;
  rotationY: number;
  angularVelocity: number;
}

const unit = (value: number) => THREE.MathUtils.clamp(value, 0, 1);

/** Smooths the shared scroll channels into one coherent, persistent camera/letter response. */
export class SceneChoreography {
  private values = {
    progress: 0,
    workVisibility: 0,
    lightMix: 0,
    servicesMix: 0,
    contactMix: 0,
    portalProgress: 0,
    heroExit: 0,
    workEntry: 0,
    workExit: 0,
    paleFlatten: 0,
    portalTravel: 0,
    portalReveal: 0,
    workMediaProgress: 0,
    finaleProgress: 0,
  };
  private angularVelocity = 0;
  private automaticYaw = 0;
  private pointerYaw = 0;
  private rotationX = 0;

  update(
    state: SceneState,
    dt: number,
    reducedMotion: boolean,
    pointerImpulse: PointerImpulse,
  ): SceneMotion {
    const delta = Math.min(0.05, Math.max(0.001, dt));
    const step = (target: number, current: number, rate: number) =>
      current + (target - current) * Math.min(1, delta * rate);
    const targets = {
      progress: unit(state.workProgress),
      workVisibility: unit(state.workVisibility),
      lightMix: unit(state.lightMix),
      servicesMix: unit(state.servicesMix),
      contactMix: unit(state.contactMix),
      portalProgress: unit(state.portalProgress),
      heroExit: unit(state.heroExit),
      workEntry: unit(state.workEntry),
      workExit: unit(state.workExit),
      paleFlatten: unit(state.paleFlatten),
      portalTravel: unit(state.portalTravel),
      portalReveal: unit(state.portalReveal),
      workMediaProgress: unit(state.workMediaProgress),
      finaleProgress: unit(state.finaleProgress),
    };
    for (const key of Object.keys(targets) as (keyof typeof targets)[]) {
      const rate = key === "progress" ? 5 : key === "workMediaProgress" ? 7 : 4.5;
      this.values[key] = step(targets[key], this.values[key], rate);
    }

    const { workVisibility, lightMix, servicesMix, contactMix, paleFlatten, portalTravel } = this.values;
    const transitionMix = Math.max(lightMix, paleFlatten) * (1 - workVisibility);
    const transitionSpin =
      Math.max(lightMix, paleFlatten) * (1 - Math.max(lightMix, paleFlatten)) * (1 - workVisibility);
    const targetSpeed =
      workVisibility * 0.37 +
      servicesMix * 0.1 +
      transitionSpin * 0.16 +
      this.values.heroExit * (1 - workVisibility) * 0.06;
    this.angularVelocity = step(
      targetSpeed + THREE.MathUtils.clamp(state.scrollVelocity, -30, 30) * (workVisibility > 0.01 ? 0.001 : 0),
      this.angularVelocity,
      2.2,
    );

    if (reducedMotion) {
      this.rotationX = 0;
      this.pointerYaw = 0;
      this.automaticYaw = 0;
      this.angularVelocity = 0;
    } else {
      const sceneControl = Math.max(workVisibility, lightMix, paleFlatten, contactMix, servicesMix, portalTravel);
      const pointerGain = THREE.MathUtils.smoothstep(state.reveal, 0.15, 0.75) * (1 - sceneControl * 0.78);
      this.rotationX += -pointerImpulse.y * 0.34 * pointerGain;
      this.pointerYaw += pointerImpulse.x * 0.46 * pointerGain;
      const returnPitch =
        -0.12 * (1 - sceneControl) + 0.13 * workVisibility + 0.06 * servicesMix;
      this.rotationX = step(returnPitch - pointerImpulse.positionY * 0.28 * pointerGain, this.rotationX, 4.5);
      this.pointerYaw = step(pointerImpulse.positionX * 0.58 * pointerGain, this.pointerYaw, 4.5);
      this.rotationX = THREE.MathUtils.clamp(this.rotationX, -0.5, 0.5);
      this.pointerYaw = THREE.MathUtils.clamp(this.pointerYaw, -0.65, 0.65);

      if (workVisibility + servicesMix + transitionSpin > 0.005) {
        this.automaticYaw = (this.automaticYaw + this.angularVelocity * delta) % (Math.PI * 2);
      } else {
        const returnAngle = Math.atan2(Math.sin(-this.automaticYaw), Math.cos(-this.automaticYaw));
        this.automaticYaw += returnAngle * Math.min(1, delta * 2);
      }
    }

    return {
      ...this.values,
      transitionMix,
      transitionSpin,
      cameraDive: transitionSpin * 4 + portalTravel * 1.8,
      reveal: unit(state.reveal),
      rotationX: this.rotationX,
      rotationY: this.automaticYaw + this.pointerYaw,
      angularVelocity: this.angularVelocity,
    };
  }
}
