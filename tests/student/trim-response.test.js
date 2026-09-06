import { describe, expect, it } from "vitest";

import {
  analyzeTrimResponse,
  disturbanceMomentCoefficientChange,
  pitchingMomentCoefficient,
  trimAngleDeg
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  it("matches the approved numerical reference case", () => {
    const result = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: -2.86,
      disturbanceAlphaDeg: 2
    });

    expect(result.cmAtAlpha).toBeCloseTo(
      0.07993313,
      6
    );

    expect(result.alphaTrimDeg).toBeCloseTo(
      2.86478898,
      6
    );

    expect(result.deltaCm).toBeCloseTo(
      -0.02792527,
      6
    );

    expect(result.trimmed).toBe(false);
    expect(result.disturbanceTendency).toBe("restoring");
  });

  it("doubles delta_Cm when the disturbance angle doubles", () => {
    const baselineDeltaCm =
      disturbanceMomentCoefficientChange(-0.8, 2);

    const doubledDeltaCm =
      disturbanceMomentCoefficientChange(-0.8, 4);

    expect(doubledDeltaCm).toBeCloseTo(
      2 * baselineDeltaCm,
      12
    );
  });

  it("handles zero Cm-alpha slope without division by zero", () => {
    const result = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: 5,
      disturbanceAlphaDeg: 2
    });

    const cmAtNegativeAngle =
      pitchingMomentCoefficient(0.04, 0, -5);

    const cmAtPositiveAngle =
      pitchingMomentCoefficient(0.04, 0, 5);

    expect(result.deltaCm).toBe(0);
    expect(result.disturbanceTendency).toBe("neutral");
    expect(result.alphaTrimDeg).toBeNull();

    expect(trimAngleDeg(0.04, 0)).toBeNull();

    expect(cmAtNegativeAngle).toBeCloseTo(
      cmAtPositiveAngle,
      12
    );

    expect(cmAtPositiveAngle).toBeCloseTo(
      0.04,
      12
    );
  });
});