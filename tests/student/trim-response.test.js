import { describe, expect, it } from "vitest";

import {
  calculateTrimResponse,
  pitchingMomentCoefficient
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  it("matches the completed numerical reference case", () => {
    const result = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0.8,
      angleOfAttackDeg: -2.86,
      disturbanceAlphaDeg: 2
    });

    const tolerance = 1e-6;

    expect(
      Math.abs(result.cm - 0.00006687)
    ).toBeLessThanOrEqual(tolerance);

    expect(
      Math.abs(result.trimAngleDeg - -2.86479)
    ).toBeLessThanOrEqual(tolerance);

    expect(
      Math.abs(result.deltaCm - 0.0279253)
    ).toBeLessThanOrEqual(tolerance);

    expect(result.trimmed).toBe(false);
    expect(result.disturbanceTendency).toBe(
      "destabilizing"
    );
  });

  it("doubles delta_Cm when the disturbance angle is doubled", () => {
    const baseline = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0.8,
      angleOfAttackDeg: -2.86,
      disturbanceAlphaDeg: 2
    });

    const doubledDisturbance = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0.8,
      angleOfAttackDeg: -2.86,
      disturbanceAlphaDeg: 4
    });

    const tolerance = 1e-6;

    expect(
      Math.abs(
        doubledDisturbance.deltaCm -
          2 * baseline.deltaCm
      )
    ).toBeLessThanOrEqual(tolerance);
  });

  it("handles zero Cm-alpha slope without division by zero", () => {
    const result = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: -2.86,
      disturbanceAlphaDeg: 2
    });

    expect(result.deltaCm).toBe(0);
    expect(result.disturbanceTendency).toBe("neutral");
    expect(result.trimAngleDeg).toBeNull();

    const cmAtAnotherAngle = pitchingMomentCoefficient(
      0.04,
      0,
      5
    );

    expect(cmAtAnotherAngle).toBe(result.cm);
  });
});