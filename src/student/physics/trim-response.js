// Linear quasi-static Cm-alpha model.
// Angles supplied in degrees are converted to radians before using Cm_alpha.
// Positive angle of attack and positive pitching moment are nose-up.
// This model does not predict time response, damping, handling quality, or safety.

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const TRIM_TOLERANCE = 1e-6;

function requireFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }

  return value;
}

export function degreesToRadians(angleDeg) {
  requireFiniteNumber(angleDeg, "angleDeg");
  return angleDeg * DEG_TO_RAD;
}

export function radiansToDegrees(angleRad) {
  requireFiniteNumber(angleRad, "angleRad");
  return angleRad * RAD_TO_DEG;
}

export function pitchingMomentCoefficient(
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg
) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  requireFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");

  const alphaRad = degreesToRadians(angleOfAttackDeg);

  return cm0 + cmAlphaPerRad * alphaRad;
}

export function trimAngleDeg(cm0, cmAlphaPerRad) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  const trimAngleRad = -cm0 / cmAlphaPerRad;

  return radiansToDegrees(trimAngleRad);
}

export function disturbanceMomentCoefficientChange(
  cmAlphaPerRad,
  disturbanceAlphaDeg
) {
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  requireFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);

  return cmAlphaPerRad * disturbanceAlphaRad;
}

export function isTrimmed(cmAlphaValue, tolerance = TRIM_TOLERANCE) {
  requireFiniteNumber(cmAlphaValue, "cmAlphaValue");
  requireFiniteNumber(tolerance, "tolerance");

  if (tolerance < 0) {
    throw new RangeError("tolerance must be non-negative.");
  }

  return Math.abs(cmAlphaValue) <= tolerance;
}

export function classifyDisturbance(
  disturbanceAlphaDeg,
  deltaCm
) {
  requireFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");
  requireFiniteNumber(deltaCm, "deltaCm");

  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  const classificationProduct = disturbanceAlphaRad * deltaCm;

  if (classificationProduct < 0) {
    return "restoring";
  }

  if (classificationProduct > 0) {
    return "destabilizing";
  }

  return "neutral";
}

export function analyzeTrimResponse({
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg,
  disturbanceAlphaDeg
}) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  requireFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");
  requireFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const cmAtAlpha = pitchingMomentCoefficient(
    cm0,
    cmAlphaPerRad,
    angleOfAttackDeg
  );

  const alphaTrimDeg = trimAngleDeg(cm0, cmAlphaPerRad);

  const deltaCm = disturbanceMomentCoefficientChange(
    cmAlphaPerRad,
    disturbanceAlphaDeg
  );

  return {
    cmAtAlpha,
    alphaTrimDeg,
    deltaCm,
    trimmed: isTrimmed(cmAtAlpha),
    disturbanceTendency: classifyDisturbance(
      disturbanceAlphaDeg,
      deltaCm
    )
  };
}