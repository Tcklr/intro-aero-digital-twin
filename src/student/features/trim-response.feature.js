import {
  calculateTrimResponse,
  pitchingMomentCoefficient
} from "../physics/trim-response.js";

const REQUIRED_CAPABILITY = {
  id: "loads.pitch.component-sum",
  version: 1
};

const PROVIDED_CAPABILITY = {
  id: "stability.pitch.cm-alpha",
  version: 1
};

function hasRequiredCapability(capabilityContext) {
  if (!capabilityContext) {
    return false;
  }

  if (typeof capabilityContext.has === "function") {
    return capabilityContext.has(
      REQUIRED_CAPABILITY.id,
      REQUIRED_CAPABILITY.version
    );
  }

  const capability =
    capabilityContext[REQUIRED_CAPABILITY.id] ??
    capabilityContext.capabilities?.[REQUIRED_CAPABILITY.id];

  if (capability == null) {
    return false;
  }

  if (typeof capability === "number") {
    return capability >= REQUIRED_CAPABILITY.version;
  }

  if (typeof capability === "object" && capability.version != null) {
    return capability.version >= REQUIRED_CAPABILITY.version;
  }

  return true;
}

function analyzeAircraft(aircraft) {
  return calculateTrimResponse({
    cm0: aircraft.cm0,
    cmAlphaPerRad: aircraft.cmAlphaPerRad,
    angleOfAttackDeg: aircraft.angleOfAttackDeg,
    disturbanceAlphaDeg: aircraft.disturbanceAlphaDeg
  });
}

function makePlotPoints(aircraft) {
  const minimumAngleDeg = Math.min(-10, aircraft.angleOfAttackDeg);
  const maximumAngleDeg = Math.max(10, aircraft.angleOfAttackDeg);

  const points = [];

  for (
    let angleDeg = Math.floor(minimumAngleDeg);
    angleDeg <= Math.ceil(maximumAngleDeg);
    angleDeg += 1
  ) {
    points.push({
      x: angleDeg,
      y: pitchingMomentCoefficient(
        aircraft.cm0,
        aircraft.cmAlphaPerRad,
        angleDeg
      )
    });
  }

  if (
    !points.some(
      (point) => point.x === aircraft.angleOfAttackDeg
    )
  ) {
    points.push({
      x: aircraft.angleOfAttackDeg,
      y: pitchingMomentCoefficient(
        aircraft.cm0,
        aircraft.cmAlphaPerRad,
        aircraft.angleOfAttackDeg
      )
    });

    points.sort((a, b) => a.x - b.x);
  }

  return points;
}

function numericalVerificationCase() {
  const result = calculateTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: 0.8,
    angleOfAttackDeg: -2.86,
    disturbanceAlphaDeg: 2
  });

  const tolerance = 1e-6;

  return {
    name: "Reference numerical case",
    passed:
      Math.abs(result.cm - 0.00006687) <= tolerance &&
      Math.abs(result.trimAngleDeg - -2.86479) <= tolerance &&
      Math.abs(result.deltaCm - 0.0279253) <= tolerance &&
      result.trimmed === false &&
      result.disturbanceTendency === "destabilizing"
  };
}

function behavioralVerificationCase() {
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

  return {
    name: "Doubling disturbance doubles delta Cm",
    passed:
      Math.abs(
        doubledDisturbance.deltaCm - 2 * baseline.deltaCm
      ) <= tolerance
  };
}

function boundaryVerificationCase() {
  const firstAngle = calculateTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: 0,
    angleOfAttackDeg: -2.86,
    disturbanceAlphaDeg: 2
  });

  const secondAngle = calculateTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: 0,
    angleOfAttackDeg: 5,
    disturbanceAlphaDeg: 2
  });

  return {
    name: "Zero Cm-alpha slope",
    passed:
      firstAngle.deltaCm === 0 &&
      firstAngle.disturbanceTendency === "neutral" &&
      firstAngle.trimAngleDeg === null &&
      firstAngle.cm === secondAngle.cm
  };
}

function decisionStatus(result) {
  if (
    result.trimmed &&
    result.disturbanceTendency === "restoring"
  ) {
    return "pass";
  }

  if (
    result.disturbanceTendency === "destabilizing"
  ) {
    return "caution";
  }

  return "neutral";
}

function decisionInterpretation(result) {
  const trimStatement = result.trimmed
    ? "The selected condition is trimmed within the specified numerical tolerance."
    : "The selected condition is not trimmed within the specified numerical tolerance.";

  const tendencyStatement =
    result.disturbanceTendency === "restoring"
      ? "The small angle-of-attack disturbance produces a restoring pitching-moment tendency."
      : result.disturbanceTendency === "destabilizing"
        ? "The small angle-of-attack disturbance produces a destabilizing pitching-moment tendency."
        : "The small angle-of-attack disturbance produces a neutral pitching-moment tendency.";

  return `${trimStatement} ${tendencyStatement} This quasi-static result does not establish dynamic stability, handling quality, controllability, safety, or flightworthiness.`;
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluates trim and the quasi-static pitching-moment tendency following a small angle-of-attack disturbance.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg"
  ],
  requiresCapabilities: [
    { id: "loads.pitch.component-sum", version: 1 }
  ],
  providesCapabilities: [
    { id: "stability.pitch.cm-alpha", version: 1 }
  ],
  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm-alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up."
  ],
  validityLimits: [
    "Do not use the linear relationship at stall, large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "The model does not calculate time history, damping, control motion, or handling quality.",
    "A restoring tendency does not prove acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only where the linear model remains valid."
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {}
  },

  analyze(aircraft, capabilityContext) {
    if (!hasRequiredCapability(capabilityContext)) {
      throw new Error(
        'Required capability "loads.pitch.component-sum" version 1 is not available.'
      );
    }

    const result = analyzeAircraft(aircraft);

    return {
      results: [
        {
          key: "cmAlpha",
          label: "Cm(alpha)",
          value: result.cm,
          unit: "",
          precision: 6,
          emphasis: true
        },
        {
          key: "trimAngle",
          label: "Trim angle",
          value:
            result.trimAngleDeg === null
              ? "not available"
              : result.trimAngleDeg,
          unit: result.trimAngleDeg === null ? "" : "deg",
          precision: result.trimAngleDeg === null ? undefined : 5
        },
        {
          key: "deltaCm",
          label: "delta_Cm",
          value: result.deltaCm,
          unit: "",
          precision: 6
        },
        {
          key: "trimmed",
          label: "Selected condition",
          value: result.trimmed ? "trimmed" : "not trimmed",
          unit: ""
        },
        {
          key: "disturbanceTendency",
          label: "Disturbance tendency",
          value: result.disturbanceTendency,
          unit: ""
        }
      ],

      verificationCases: [
        numericalVerificationCase(),
        behavioralVerificationCase(),
        boundaryVerificationCase()
      ],

      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation: decisionInterpretation(result),
        status: decisionStatus(result)
      },

      plots: [
        {
          id: "cm-alpha",
          title: "Cm–alpha relationship",
          xLabel: "Angle of attack",
          xUnit: "deg",
          yLabel: "Pitching-moment coefficient",
          yUnit: "",
          series: [
            {
              name: "Cm(alpha)",
              points: makePlotPoints(aircraft)
            }
          ],
          referenceLines: [
            {
              axis: "y",
              value: 0,
              label: "Cm = 0 · trim line"
            }
          ],
          regions: []
        }
      ],

      scene: null
    };
  }
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    const aircraft = runtimeContext.aircraft ?? runtimeContext;
    const capabilities = runtimeContext.capabilities;

    if (!hasRequiredCapability(capabilities)) {
      throw new Error(
        'Required capability "loads.pitch.component-sum" version 1 is not available.'
      );
    }

    const result = analyzeAircraft(aircraft);

    return {
      values: {
        cm: result.cm,
        trimAngleDeg: result.trimAngleDeg,
        deltaCm: result.deltaCm,
        trimmed: result.trimmed,
        disturbanceTendency: result.disturbanceTendency
      }
    };
  }
};