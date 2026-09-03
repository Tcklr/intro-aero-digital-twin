// Linear quasi-static Cm–alpha model.
// Angles supplied in degrees are converted to radians before applying
// cmAlphaPerRad [1/rad]. Positive angle and pitching moment are nose-up.
// This model does not represent dynamic stability or time response.

export const TRIM_TOLERANCE = 1e-6;

export function degreesToRadians(angleDeg) {
  assertFiniteNumber(angleDeg, "angleDeg");
  return (angleDeg * Math.PI) / 180;
}

export function radiansToDegrees(angleRad) {
  assertFiniteNumber(angleRad, "angleRad");
  return (angleRad * 180) / Math.PI;
}

export function pitchingMomentCoefficient(
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg
) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");

  const alphaRad = degreesToRadians(angleOfAttackDeg);
  return cm0 + cmAlphaPerRad * alphaRad;
}

export function trimAngleDeg(cm0, cmAlphaPerRad) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  const trimAngleRad = -cm0 / cmAlphaPerRad;
  return radiansToDegrees(trimAngleRad);
}

export function disturbanceMomentChange(
  cmAlphaPerRad,
  disturbanceAlphaDeg
) {
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  return cmAlphaPerRad * disturbanceAlphaRad;
}

export function isTrimmed(cmValue, tolerance = TRIM_TOLERANCE) {
  assertFiniteNumber(cmValue, "cmValue");
  assertFiniteNumber(tolerance, "tolerance");

  if (tolerance < 0) {
    throw new RangeError("tolerance must be non-negative");
  }

  return Math.abs(cmValue) <= tolerance;
}

export function classifyDisturbance(
  cmAlphaPerRad,
  disturbanceAlphaDeg
) {
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  const deltaCm = disturbanceMomentChange(
    cmAlphaPerRad,
    disturbanceAlphaDeg
  );

  const classificationValue = disturbanceAlphaRad * deltaCm;

  if (classificationValue < 0) {
    return "restoring";
  }

  if (classificationValue > 0) {
    return "destabilizing";
  }

  return "neutral";
}

export function calculateTrimResponse({
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg,
  disturbanceAlphaDeg
}) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const cm = pitchingMomentCoefficient(
    cm0,
    cmAlphaPerRad,
    angleOfAttackDeg
  );

  const trimDeg = trimAngleDeg(cm0, cmAlphaPerRad);

  const deltaCm = disturbanceMomentChange(
    cmAlphaPerRad,
    disturbanceAlphaDeg
  );

  return {
    cm,
    trimAngleDeg: trimDeg,
    deltaCm,
    trimmed: isTrimmed(cm),
    disturbanceTendency: classifyDisturbance(
      cmAlphaPerRad,
      disturbanceAlphaDeg
    )
  };
}

function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}