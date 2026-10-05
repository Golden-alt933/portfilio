import * as THREE from "three";
import type { SceneState } from "../SceneState";

export interface PointerImpulse {
  x: number;
  y: number;
}

export interface SceneMotion {
  progress: number;
  workVisibility: number;
  lightMix: number;
  servicesMix: number;
  contactMix: number;
  portalProgress: number;
  transitionMix: number;
  transitionSpin: number;
  cameraDive: number;
  reveal: number;
  rotationX: number;
  rotationY: number;
  angularVelocity: number;
}

/**
 * Damped values shared by the letter, panels, camera and chapter compositing.
 * The homepage remains the sole writer of SceneState.
 */
export class SceneChoreography {
  private progress = 0;
  private workVisibility = 0;
  private lightMix = 0;
  private servicesMix = 0;
  private contactMix = 0;
  private portalProgress = 0;
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
    const step = (target: number, current: number, rate: number) =>
      current + (target - current) * Math.min(1, dt * rate);
    this.progress = step(
      THREE.MathUtils.clamp(state.workProgress, 0, 1),
      this.progress,
      5,
    );
    this.workVisibility = step(
      THREE.MathUtils.clamp(state.workVisibility, 0, 1),
      this.workVisibility,
      5,
    );
    this.lightMix = step(
      THREE.MathUtils.clamp(state.lightMix, 0, 1),
      this.lightMix,
      3.5,
    );
    this.servicesMix = step(
      THREE.MathUtils.clamp(state.servicesMix, 0, 1),
      this.servicesMix,
      3.5,
    );
    this.contactMix = step(
      THREE.MathUtils.clamp(state.contactMix, 0, 1),
      this.contactMix,
      3.5,
    );
    this.portalProgress = step(
      THREE.MathUtils.clamp(state.portalProgress, 0, 1),
      this.portalProgress,
      4,
    );

    const transitionMix = this.lightMix * (1 - this.workVisibility);
    const transitionSpin =
      this.lightMix * (1 - this.lightMix) * (1 - this.workVisibility);
    const targetSpeed =
      this.workVisibility * 0.46 +
      this.servicesMix * 0.12 +
      transitionSpin * 0.16;
    this.angularVelocity = step(
      targetSpeed +
        THREE.MathUtils.clamp(state.scrollVelocity, -30, 30) *
          (this.workVisibility > 0.01 ? 0.001 : 0),
      this.angularVelocity,
      2.2,
    );

    if (reducedMotion) {
      this.rotationX = 0;
      this.pointerYaw = 0;
      this.automaticYaw = 0;
      this.angularVelocity = 0;
    } else {
      const intensity = THREE.MathUtils.clamp(
        1 -
          Math.max(
            this.workVisibility,
            this.lightMix,
            this.contactMix,
            this.servicesMix,
          ) +
          this.workVisibility * 0.2,
        0,
        1,
      );
      this.rotationX += -pointerImpulse.y * 0.01 * intensity * 24;
      this.pointerYaw += pointerImpulse.x * 0.01 * intensity * 24;
      this.rotationX *= Math.max(0, 1 - dt);
      this.pointerYaw *= Math.exp(-dt * 2);
      const returnPitch =
        -0.12 *
          (1 -
            Math.max(
              this.workVisibility,
              this.lightMix,
              this.servicesMix,
              this.contactMix,
            )) +
        0.13 * this.workVisibility +
        0.06 * this.servicesMix;
      this.rotationX = step(
        returnPitch,
        this.rotationX,
        0.4 + (1 - this.workVisibility) * 1.6,
      );
      if (this.workVisibility + this.servicesMix + transitionSpin > 0.005) {
        this.automaticYaw =
          (this.automaticYaw + this.angularVelocity * dt) % (Math.PI * 2);
      } else {
        const returnAngle = Math.atan2(
          Math.sin(-this.automaticYaw),
          Math.cos(-this.automaticYaw),
        );
        this.automaticYaw += returnAngle * Math.min(1, dt * 2);
      }
    }

    return {
      progress: this.progress,
      workVisibility: this.workVisibility,
      lightMix: this.lightMix,
      servicesMix: this.servicesMix,
      contactMix: this.contactMix,
      portalProgress: this.portalProgress,
      transitionMix,
      transitionSpin,
      cameraDive: transitionSpin * 4,
      reveal: THREE.MathUtils.clamp(state.reveal, 0, 1),
      rotationX: this.rotationX,
      rotationY: this.automaticYaw + this.pointerYaw,
      angularVelocity: this.angularVelocity,
    };
  }
}
